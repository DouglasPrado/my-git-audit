import type { Facts, ProfileFacts } from '@audit/contracts';
import { asInstant, err, ok } from '@audit/kernel';
import type { Clock, Result } from '@audit/kernel';
import type { CollectError } from './errors';
import type { GitHubClient } from './github/client';
import { resolveDoc, resolveReadme } from './readme';
import { buildFacts, selectRepositories, toRepositoryFacts, type BlobBundle, type DiscoverRepo, type RawRepo } from './normalize';
import { normalizeProfileInput } from './url';

export type ScanEvent =
  | { type: 'scan.started'; login: string }
  | { type: 'profile.collected'; login: string; hasProfileReadme: boolean }
  | { type: 'repositories.selected'; total: number; selected: number; excluded: number }
  | { type: 'repository.analyzed'; name: string; index: number; total: number }
  | { type: 'static.completed'; repositories: number }
  | { type: 'scan.degraded'; stage: string; reason: string };

export type Emit = (e: ScanEvent) => void;

const DAY = 86_400_000;

interface Phase1Data {
  user: {
    __typename: string; login: string; name: string | null; bio: string | null;
    websiteUrl: string | null; location: string | null; company: string | null;
    followers: { totalCount: number };
    socialAccounts: { nodes: { provider: string; url: string }[] };
    profileRepo: { name: string; description: string | null; defaultBranchRef: { target: { oid: string } | null } | null; object: { entries?: { name: string; type: string }[] } | null } | null;
    pinnedItems: {
      totalCount: number;
      nodes: { name: string; description: string | null; isPrivate: boolean; root: { entries?: { name: string; type: string }[] } | null }[];
    };
    contributionsCollection: {
      pullRequestContributionsByRepository: { repository: { owner: { login: string } }; contributions: { totalCount: number } }[];
    };
    profileRepoOid?: string | null;
    repositories: { totalCount: number; pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: DiscoverRepo[] };
  } | null;
  organization: { __typename: string } | null;
}

/**
 * Orquestrador de scan. É BIBLIOTECA, agnóstica de transporte: não conhece HTTP,
 * não conhece fila. Hoje roda em processo num route handler; quando ASYNCHRONOUS
 * for ativada, um job passa a chamá-la sem que nada aqui mude (ADR-0001, ADR-0010).
 */
export async function collect(
  input: string,
  client: GitHubClient,
  clock: Clock,
  emit: Emit = () => {},
): Promise<Result<Facts, CollectError>> {
  const loginResult = normalizeProfileInput(input);
  if (!loginResult.ok) return loginResult;
  const login = loginResult.value;
  emit({ type: 'scan.started', login });

  const scanAt = clock.now();
  const since = new Date(Date.parse(scanAt) - 365 * DAY).toISOString();

  const p1 = await client.discover(login);
  if (!p1.ok) return p1;
  const data = p1.value as Phase1Data;

  if (!data.user) {
    return err(data.organization ? { kind: 'is_organization', login } : { kind: 'user_not_found', login });
  }
  const u = data.user;

  // Descoberta paginada: o portfólio inteiro alimenta as métricas de ruído e de
  // arquivamento, e a seleção precisa enxergar além da primeira página.
  const allRepos: DiscoverRepo[] = [...u.repositories.nodes.filter(Boolean)];
  let cursor = u.repositories.pageInfo.endCursor;
  let hasNext = u.repositories.pageInfo.hasNextPage;
  while (hasNext && cursor && allRepos.length < 300) {
    const next = await client.discover(login, cursor);
    if (!next.ok) { emit({ type: 'scan.degraded', stage: 'descoberta', reason: 'paginação interrompida' }); break; }
    const page = (next.value as Phase1Data).user?.repositories;
    if (!page) break;
    allRepos.push(...page.nodes.filter(Boolean));
    cursor = page.pageInfo.endCursor;
    hasNext = page.pageInfo.hasNextPage;
  }
  if (allRepos.length === 0) return err({ kind: 'no_public_repos', login });

  const pinnedNames = new Set(u.pinnedItems.nodes.map((n) => n.name));
  const { selected, excluded } = selectRepositories(allRepos, pinnedNames);
  if (selected.length === 0) return err({ kind: 'no_public_repos', login });
  emit({ type: 'repositories.selected', total: u.repositories.totalCount, selected: selected.length, excluded: excluded.length });

  // ---- Fase 2: detalhe apenas dos selecionados.
  const detailAliases = selected.map((r, i) => ({ alias: `r${i}`, name: r.name }));
  const detailRes = await client.detail(detailAliases, login, since);
  if (!detailRes.ok) return detailRes;
  const detailed: RawRepo[] = [];
  for (const { alias, name } of detailAliases) {
    const node = (detailRes.value as Record<string, RawRepo | null>)[alias];
    if (node) detailed.push(node);
    else emit({ type: 'scan.degraded', stage: 'detalhe', reason: `não foi possível detalhar ${name}` });
  }
  if (detailed.length === 0) return err({ kind: 'no_public_repos', login });

  // ---- Fase 3: blobs pelos caminhos JÁ RESOLVIDOS, ancorados no OID da fase 2.
  const targets: { alias: string; owner: string; name: string; oid: string; path: string }[] = [];
  const aliasMap = new Map<string, { repo: string; slot: 'readme' | 'architecture' | 'manifest' | 'workflow'; wfName?: string }>();
  let n = 0;
  const add = (repoName: string, oid: string, path: string, slot: 'readme' | 'architecture' | 'manifest' | 'workflow', wfName?: string) => {
    const alias = `b${n++}`;
    targets.push({ alias, owner: login, name: repoName, oid, path });
    aliasMap.set(alias, { repo: repoName, slot, ...(wfName !== undefined ? { wfName } : {}) });
  };

  const asEntries = (t?: { entries?: { name: string; type: string }[] } | null) =>
    (t?.entries ?? []).map((e) => ({ name: e.name, type: e.type === 'tree' ? ('tree' as const) : ('blob' as const) }));

  for (const r of detailed) {
    const oid = r.defaultBranchRef?.target?.oid;
    if (!oid) continue;
    const rootEntries = asEntries(r.root);
    const ghEntries = asEntries(r.gh);
    const readme = resolveReadme(rootEntries, ghEntries);
    if (readme) add(r.name, oid, readme.path, 'readme');
    const arch = resolveDoc(rootEntries, 'architecture', 'arquitetura', 'design');
    if (arch) add(r.name, oid, arch, 'architecture');
    const manifest = rootEntries.find((e) => e.name.toLowerCase() === 'package.json');
    if (manifest) add(r.name, oid, manifest.name, 'manifest');
    for (const wf of asEntries(r.ghWorkflows).slice(0, 4)) {
      if (/\.ya?ml$/i.test(wf.name)) add(r.name, oid, `.github/workflows/${wf.name}`, 'workflow', wf.name);
    }
  }

  const bundles = new Map<string, BlobBundle>();
  for (const r of detailed) bundles.set(r.name, { workflows: [] });

  const p3 = await client.blobs(targets);
  if (!p3.ok) {
    emit({ type: 'scan.degraded', stage: 'blobs', reason: 'não foi possível ler os arquivos dos repositórios' });
  } else {
    for (const [alias, meta] of aliasMap) {
      const node = (p3.value as Record<string, { object: { text: string; byteSize: number } | null } | null>)[alias];
      const blob = node?.object;
      if (!blob) continue;
      const b = bundles.get(meta.repo)!;
      if (meta.slot === 'workflow') b.workflows.push({ name: meta.wfName ?? alias, text: blob.text });
      else b[meta.slot] = { text: blob.text, byteSize: blob.byteSize };
    }
  }

  // ---- Community profile (REST), em paralelo.
  const communities = new Map<string, Record<string, unknown>>();
  await Promise.all(
    detailed.map(async (r) => {
      const c = await client.communityProfile(login, r.name);
      communities.set(r.name, c.ok ? c.value : {});
    }),
  );

  const repositories = detailed.map((r, i) => {
    emit({ type: 'repository.analyzed', name: r.name, index: i + 1, total: detailed.length });
    return toRepositoryFacts(r, login, pinnedNames.has(r.name), i, bundles.get(r.name)!, communities.get(r.name) ?? {});
  });

  // ---- Perfil.
  const profileEntries = (u.profileRepo?.object?.entries ?? []).map((e) => ({ name: e.name, type: e.type === 'tree' ? ('tree' as const) : ('blob' as const) }));
  const profileReadmePath = resolveReadme(profileEntries);
  let profileReadme: ProfileFacts['profileReadme'] = null;
  if (profileReadmePath && u.profileRepo) {
    const oid = u.profileRepo.defaultBranchRef?.target?.oid;
    if (oid) {
      const pr = await client.blobs([{ alias: 'pr', owner: login, name: u.profileRepo.name, oid, path: profileReadmePath.path }]);
      const blob = pr.ok ? (pr.value as Record<string, { object: { text: string; byteSize: number } | null }>)['pr']?.object : null;
      if (blob) profileReadme = { path: profileReadmePath.path, text: blob.text, byteSize: blob.byteSize };
    }
  }
  const pub = await client.publicProfile(login);
  emit({ type: 'profile.collected', login, hasProfileReadme: !!profileReadme });

  const profile: ProfileFacts = {
    login: u.login, name: u.name, bio: u.bio, websiteUrl: u.websiteUrl,
    location: u.location, company: u.company, email: pub.ok ? pub.value.email : null,
    followers: u.followers.totalCount,
    socialAccounts: [
      ...u.socialAccounts.nodes.map((n) => ({ provider: n.provider, url: n.url })),
      ...(pub.ok && pub.value.twitter ? [{ provider: 'TWITTER', url: `https://x.com/${pub.value.twitter}` }] : []),
    ],
    profileReadme,
    profileReadmeRepoExists: !!u.profileRepo,
    profileRepoDescription: u.profileRepo?.description ?? null,
    pinnedCount: u.pinnedItems.totalCount,
    // A vitrine avaliada como vitrine: só os fixados públicos contam, e o que
    // interessa neles é se cada um se explica sozinho.
    pinned: u.pinnedItems.nodes
      .filter((n) => !n.isPrivate)
      .map((n) => ({
        name: n.name,
        hasDescription: Boolean(n.description?.trim()),
        hasReadme: resolveReadme(asEntries(n.root)) !== null,
      })),
  };

  const now = Date.parse(scanAt);
  const isStale = (r: DiscoverRepo) => (now - Date.parse(r.pushedAt)) / DAY > 730;
  const isNoisy = (r: DiscoverRepo) => {
    const entries = asEntries(r.root);
    return !r.description && !resolveReadme(entries) && r.repositoryTopics.totalCount <= 1 && entries.length < 10;
  };

  emit({ type: 'static.completed', repositories: repositories.length });

  return ok(
    buildFacts({
      scanAt: asInstant(scanAt),
      profile,
      repositories,
      excluded,
      totalOwnRepos: u.repositories.totalCount,
      archivedCount: allRepos.filter((r) => r.isArchived).length,
      staleUnarchivedCount: allRepos.filter((r) => !r.isArchived && isStale(r)).length,
      noisyCount: allRepos.filter(isNoisy).length,
      forkCount: 0,
      mergedPullRequestsToOthers: u.contributionsCollection.pullRequestContributionsByRepository
        .filter((x) => x.repository.owner.login.toLowerCase() !== login.toLowerCase())
        .reduce((a, x) => a + x.contributions.totalCount, 0),
    }),
  );
}
