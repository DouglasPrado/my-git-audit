import { evidenceId, subjectKey } from '@audit/contracts';
import type { EvidenceId } from '@audit/kernel';
import { bandDesc, readmeMetrics, hasEntry, hasPrefix, repoKey } from '../graders/helpers';
import type { AdjustmentRule, GraderContext } from './types';

export type Adjuster = (ctx: GraderContext) => { points: number; detail: string; evidenceIds: EvidenceId[] } | null;

export const adjustmentRules: AdjustmentRule[] = [
  { code: 'PUBLIC_CONTRIBUTIONS', category: 'OSS', kind: 'bonus', max: 6, scope: 'profile' },
  { code: 'TRACTION', category: 'OSS', kind: 'bonus', max: 5, scope: 'repo-agg' },
  { code: 'DOC_CLAIM_UNCORROBORATED', category: 'PRE', kind: 'penalty', max: 8, scope: 'repo-agg' },
  // Fork é como se contribui upstream. Zero ponto na v1 — severidade `info` apenas.
  { code: 'PORTFOLIO_FORK_RATIO', category: 'CUR', kind: 'penalty', max: 0, scope: 'portfolio' },
];

export const adjusters: Record<string, Adjuster> = {
  PUBLIC_CONTRIBUTIONS: ({ facts }) => {
    const n = facts.portfolio.mergedPullRequestsToOthers;
    if (n === 0) return null;
    return {
      points: bandDesc(n, [[20, 6], [10, 4.5], [5, 3], [2, 1.5], [1, 0.75]]),
      detail: `${n} pull request(s) mergeado(s) em repositórios de terceiros`,
      evidenceIds: [evidenceId(subjectKey({ kind: 'profile', login: facts.profile.login }), 'derived.metric', 'merged-prs')],
    };
  },

  /** NUNCA vira penalidade. Popularidade não é controlável e stars são compráveis. */
  TRACTION: ({ facts }) => {
    const stars = facts.repositories.reduce((a, r) => a + r.stars, 0);
    const forks = facts.repositories.reduce((a, r) => a + r.forks, 0);
    if (stars === 0 && forks === 0) return null;
    return {
      points: Math.min(5, bandDesc(stars, [[1000, 5], [200, 4], [50, 3], [10, 2], [1, 1]]) + bandDesc(forks, [[50, 1], [5, 0.5], [1, 0.25]])),
      detail: `${stars} star(s) e ${forks} fork(s) nos repositórios avaliados`,
      evidenceIds: facts.repositories.filter((r) => r.stars > 0).map((r) => evidenceId(repoKey(r), 'repo.field', 'stars')),
    };
  },

  /**
   * Corroboração cruzada. "Seu README manda rodar `make dev`, mas não há Makefile."
   * Achado útil por si só, não só peso de nota.
   */
  DOC_CLAIM_UNCORROBORATED: ({ facts }) => {
    const offenders: string[] = [];
    const ids: EvidenceId[] = [];
    for (const r of facts.repositories) {
      if (!r.readme) continue;
      const t = r.readme.text;
      const claims: [RegExp, () => boolean][] = [
        [/\bmake\s+\w+/, () => hasEntry(r.rootTree, 'makefile', 'Makefile')],
        [/\bdocker\s+compose\s+up|\bdocker-compose\s+up/, () => hasEntry(r.rootTree, 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml')],
        [/\b(npm|pnpm|yarn)\s+(install|i)\b/, () => hasEntry(r.rootTree, 'package.json') || hasPrefix(r.rootTree, 'packages', 'apps')],
        [/\bcargo\s+(build|run|test)\b/, () => hasEntry(r.rootTree, 'cargo.toml') || hasPrefix(r.rootTree, 'crates')],
      ];
      for (const [re, ok] of claims) {
        if (re.test(t) && !ok()) {
          offenders.push(r.name);
          ids.push(evidenceId(repoKey(r), 'file.span', 'readme.claim'));
          break;
        }
      }
    }
    if (offenders.length === 0) return null;
    return {
      points: Math.min(8, offenders.length * 3),
      detail: `README manda rodar comando sem o arquivo correspondente: ${offenders.join(', ')}`,
      evidenceIds: ids,
    };
  },

  PORTFOLIO_FORK_RATIO: ({ facts }) => {
    const { forkCount, totalOwnRepos } = facts.portfolio;
    if (totalOwnRepos === 0 || forkCount / (forkCount + totalOwnRepos) < 0.6) return null;
    return {
      points: 0, // informativo na v1, por decisão explícita
      detail: `${forkCount} forks — informativo apenas, forks são como se contribui upstream`,
      evidenceIds: [evidenceId(subjectKey({ kind: 'portfolio', login: facts.profile.login }), 'derived.metric', 'fork.ratio')],
    };
  },
};

export const _unused = readmeMetrics;
