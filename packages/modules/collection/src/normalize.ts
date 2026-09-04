import type {
  CheckSuiteFacts, CommunityFacts, DocFile, Facts, ProfileFacts, PortfolioFacts,
  RepositoryFacts, TreeEntry, WorkflowFile,
} from '@audit/contracts';
import { asInstant, type Instant } from '@audit/kernel';
import { classifyProjectType } from './classify';
import { resolveDoc, resolveReadme } from './readme';

export const COLLECTOR_VERSION = '1.0.0';

interface RawTree { entries?: { name: string; type: string }[] }
interface RawRepo {
  name: string; description: string | null; homepageUrl: string | null;
  isFork: boolean; isArchived: boolean; isEmpty: boolean;
  stargazerCount: number; forkCount: number; pushedAt: string;
  licenseInfo: { spdxId: string | null } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  primaryLanguage: { name: string } | null;
  languages: { edges: { size: number; node: { name: string } }[] };
  releases: { totalCount: number; nodes: { tagName: string; publishedAt: string | null }[] };
  openIssues: { totalCount: number }; closedIssues: { totalCount: number };
  defaultBranchRef: {
    name: string;
    target: {
      oid: string; committedDate: string;
      history: { nodes: { messageHeadline: string; author: { user: { login: string } | null } | null }[] };
      recent: { totalCount: number };
      checkSuites: { nodes: { conclusion: string | null; updatedAt: string | null }[] };
    } | null;
  } | null;
  root: RawTree | null; gh: RawTree | null; ghWorkflows: RawTree | null; src: RawTree | null;
}

const tree = (t: RawTree | null | undefined): TreeEntry[] =>
  (t?.entries ?? [])
    .map((e) => ({ name: e.name, type: e.type === 'tree' ? ('tree' as const) : ('blob' as const) }))
    // Ordenação canônica: goldens não podem oscilar por ordem de retorno da API.
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const OTHER_CI = ['.circleci', '.gitlab-ci.yml', 'jenkinsfile', '.travis.yml', 'azure-pipelines.yml', '.drone.yml', 'bitbucket-pipelines.yml'];

/** Forma leve devolvida pela fase de descoberta — o suficiente para selecionar. */
export interface DiscoverRepo {
  name: string;
  description: string | null;
  isFork: boolean;
  isArchived: boolean;
  isEmpty: boolean;
  stargazerCount: number;
  pushedAt: string;
  repositoryTopics: { totalCount: number };
  root: RawTree | null;
}

/** Materialidade: repositório trivial é EXCLUÍDO, nunca zerado. */
export function isTrivial(r: DiscoverRepo): boolean {
  if (r.isEmpty) return true;
  const entries = tree(r.root);
  if (entries.length === 0) return true;
  const hasReadme = resolveReadme(entries) !== null;
  return entries.length < 10 && !hasReadme;
}

/**
 * Seleção determinística e INDEPENDENTE DA NOTA — depender da nota seria circular.
 * Desempate por nome é obrigatório, ou os goldens oscilam.
 */
export function selectRepositories(
  repos: DiscoverRepo[],
  pinnedNames: Set<string>,
  k = 8,
): { selected: DiscoverRepo[]; excluded: { name: string; reason: string }[] } {
  const excluded: { name: string; reason: string }[] = [];
  const eligible: DiscoverRepo[] = [];

  for (const r of repos) {
    if (r.isFork) { excluded.push({ name: r.name, reason: 'fork' }); continue; }
    if (isTrivial(r)) { excluded.push({ name: r.name, reason: 'vazio ou trivial demais para avaliar' }); continue; }
    eligible.push(r);
  }

  const pinned = eligible.filter((r) => pinnedNames.has(r.name));
  const rest = eligible
    .filter((r) => !pinnedNames.has(r.name))
    .sort((a, b) =>
      b.stargazerCount - a.stargazerCount ||
      Date.parse(b.pushedAt) - Date.parse(a.pushedAt) ||
      a.name.localeCompare(b.name, 'en'));

  const selected = [...pinned, ...rest.slice(0, Math.max(0, k - pinned.length))];
  for (const r of rest.slice(Math.max(0, k - pinned.length))) {
    excluded.push({ name: r.name, reason: 'fora dos mais relevantes' });
  }
  return { selected, excluded };
}

export interface BlobBundle {
  readme?: { text: string; byteSize: number } | undefined;
  architecture?: { text: string; byteSize: number } | undefined;
  manifest?: { text: string; byteSize: number } | undefined;
  workflows: { name: string; text: string }[];
}

export function toRepositoryFacts(
  r: RawRepo, owner: string, isPinned: boolean, rank: number,
  blobs: BlobBundle, community: Record<string, unknown>,
): RepositoryFacts {
  const rootTree = tree(r.root);
  const githubTree = tree(r.gh);
  const srcTree = tree(r.src);
  const target = r.defaultBranchRef?.target ?? null;
  const readmePath = resolveReadme(rootTree, githubTree);
  const archPath = resolveDoc(rootTree, 'architecture', 'arquitetura', 'design') ?? resolveDoc(githubTree, 'architecture');

  let manifest: Record<string, unknown> | null = null;
  if (blobs.manifest) { try { manifest = JSON.parse(blobs.manifest.text) as Record<string, unknown>; } catch { manifest = null; } }

  const topics = r.repositoryTopics.nodes.map((n) => n.topic.name).sort();
  const languages = r.languages.edges.map((e) => ({ name: e.node.name, size: e.size })).sort((a, b) => b.size - a.size);

  const doc = (path: string | null, blob: { text: string; byteSize: number } | undefined): DocFile | null =>
    path && blob ? { path, text: blob.text, byteSize: blob.byteSize } : null;

  const files: CommunityFacts = {
    license: !!r.licenseInfo?.spdxId,
    contributing: pick(community, 'contributing'),
    codeOfConduct: pick(community, 'code_of_conduct'),
    issueTemplate: pick(community, 'issue_template'),
    pullRequestTemplate: pick(community, 'pull_request_template'),
    securityPolicy: pick(community, 'security'),
  };

  const workflows: WorkflowFile[] = blobs.workflows.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const checkSuites: CheckSuiteFacts[] = (target?.checkSuites.nodes ?? []).map((s) => ({
    conclusion: (s.conclusion as CheckSuiteFacts['conclusion']) ?? null,
    updatedAt: s.updatedAt ? asInstant(s.updatedAt) : null,
  }));

  const projectType = classifyProjectType({
    name: r.name, topics, primaryLanguage: r.primaryLanguage?.name ?? null,
    languages, rootTree, srcTree, manifest, releasesCount: r.releases.totalCount,
  });

  return {
    owner, name: r.name, description: r.description, homepageUrl: r.homepageUrl,
    isFork: r.isFork, isArchived: r.isArchived, isEmpty: r.isEmpty,
    isPinned, prominence: isPinned ? 3 : rank < 3 ? 2 : 1,
    projectType,
    defaultBranch: r.defaultBranchRef?.name ?? null,
    commitOid: target?.oid ?? null,
    topics, languages, primaryLanguage: r.primaryLanguage?.name ?? null,
    licenseSpdxId: r.licenseInfo?.spdxId ?? null,
    stars: r.stargazerCount, forks: r.forkCount,
    openIssues: r.openIssues.totalCount, closedIssues: r.closedIssues.totalCount,
    releasesCount: r.releases.totalCount,
    latestReleaseTag: r.releases.nodes[0]?.tagName ?? null,
    latestReleaseAt: r.releases.nodes[0]?.publishedAt ? asInstant(r.releases.nodes[0]!.publishedAt!) : null,
    lastCommitAt: target?.committedDate ? asInstant(target.committedDate) : null,
    commitsLast365: target?.recent.totalCount ?? 0,
    commitHeadlines: (target?.history.nodes ?? []).map((n) => n.messageHeadline),
    commitAuthors: (target?.history.nodes ?? []).map((n) => n.author?.user?.login ?? null),
    rootTree, githubTree, srcTree,
    workflows,
    otherCiFiles: OTHER_CI.filter((n) => rootTree.some((e) => e.name.toLowerCase() === n)),
    readme: doc(readmePath?.path ?? null, blobs.readme),
    architectureDoc: doc(archPath, blobs.architecture),
    community: files,
    checkSuites,
  };
}

function pick(o: Record<string, unknown>, key: string): boolean {
  const files = (o['files'] ?? {}) as Record<string, unknown>;
  return files[key] !== null && files[key] !== undefined;
}

/** Herfindahl normalizado: 0 disperso, 1 concentrado. Determinístico, sem LLM. */
export function concentration(items: readonly string[]): number {
  if (items.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const i of items) counts.set(i, (counts.get(i) ?? 0) + 1);
  const n = items.length;
  let h = 0;
  for (const c of counts.values()) h += (c / n) * (c / n);
  const k = counts.size;
  return k <= 1 ? 1 : (h - 1 / k) / (1 - 1 / k);
}

export function buildFacts(input: {
  scanAt: Instant;
  profile: ProfileFacts;
  repositories: RepositoryFacts[];
  excluded: { name: string; reason: string }[];
  totalOwnRepos: number;
  archivedCount: number;
  staleUnarchivedCount: number;
  noisyCount: number;
  forkCount: number;
  mergedPullRequestsToOthers: number;
}): Facts {
  const repos = input.repositories;
  const portfolio: PortfolioFacts = {
    totalOwnRepos: input.totalOwnRepos,
    archivedCount: input.archivedCount,
    staleUnarchivedCount: input.staleUnarchivedCount,
    noisyCount: input.noisyCount,
    forkCount: input.forkCount,
    topicConcentration: concentration(repos.flatMap((r) => r.topics)),
    languageConcentration: concentration(repos.flatMap((r) => r.languages.map((l) => l.name))),
    distinctProjectTypes: new Set(repos.map((r) => r.projectType)).size,
    mergedPullRequestsToOthers: input.mergedPullRequestsToOthers,
  };
  return {
    scanAt: input.scanAt,
    collectorVersion: COLLECTOR_VERSION,
    profile: input.profile,
    portfolio,
    repositories: repos,
    excluded: input.excluded,
  };
}

export type { RawRepo };
