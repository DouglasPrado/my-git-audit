import { evidenceId, subjectKey } from '@audit/contracts';
import type { Grader } from '../rubric/types';
import { band, bandDesc, result } from './helpers';

const key = (login: string) => subjectKey({ kind: 'portfolio', login });
const cev = (login: string, sel: string) => evidenceId(key(login), 'derived.metric', sel);

export const PROFILE_PINNED_USED: Grader = ({ facts }) => {
  const n = facts.profile.pinnedCount;
  return result(
    bandDesc(n, [[6, 1], [4, 0.85], [2, 0.5], [1, 0.25], [0, 0]]),
    `${n} repositório(s) fixado(s) de 6 possíveis`,
    [cev(facts.profile.login, 'pinned.count')],
  );
};

/**
 * Gente fixa por motivo narrativo, não por nota. Só acusa quando um não-fixado
 * supera a mediana dos fixados por mais de 15 pontos — e ainda assim como sugestão.
 */
export const PINNED_BEST_WORK: Grader = ({ facts }) => {
  const pinned = facts.repositories.filter((r) => r.isPinned);
  const others = facts.repositories.filter((r) => !r.isPinned);
  const id = cev(facts.profile.login, 'pinned.quality');
  if (pinned.length === 0) return result(0, 'Nenhum repositório fixado', [id]);
  if (others.length === 0) return result(1, 'Todos os repositórios avaliados estão fixados', [id]);
  const score = (r: (typeof pinned)[number]) =>
    (r.description ? 1 : 0) + (r.topics.length >= 3 ? 1 : 0) + (r.readme ? 1 : 0) + (r.stars > 0 ? 1 : 0);
  const med = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)]! : 0;
  };
  const gap = med(others.map(score)) - med(pinned.map(score));
  return result(gap > 1 ? 0.5 : 1, gap > 1 ? 'Há repositórios não fixados mais bem apresentados que os fixados' : 'Os fixados representam o melhor trabalho visível', [id]);
};

/** Repositório de rascunho público é legítimo. Só conta acima de 20% do total. */
export const PORTFOLIO_NOISE_RATIO: Grader = ({ facts }) => {
  const { noisyCount, totalOwnRepos } = facts.portfolio;
  const ratio = totalOwnRepos > 0 ? noisyCount / totalOwnRepos : 0;
  const id = cev(facts.profile.login, 'noise.ratio');
  if (ratio <= 0.2) return result(1, `${noisyCount} de ${totalOwnRepos} repositórios sem descrição, README ou topics — abaixo do limiar de 20%`, [id]);
  return result(
    band(ratio, [[0.3, 0.75], [0.45, 0.5], [0.6, 0.25], [1, 0]]),
    `${Math.round(ratio * 100)}% dos ${totalOwnRepos} repositórios não se explicam`,
    [id],
  );
};

/** Arquivar é a ação correta e É RECOMPENSADO. Punir ensina a esconder projeto morto. */
export const PORTFOLIO_ARCHIVE_HYGIENE: Grader = ({ facts }) => {
  const { archivedCount, staleUnarchivedCount } = facts.portfolio;
  const id = cev(facts.profile.login, 'archive.hygiene');
  const total = archivedCount + staleUnarchivedCount;
  if (total === 0) return result(1, 'Nenhum repositório parado há mais de 24 meses', [id]);
  return result(
    archivedCount / total,
    `${archivedCount} arquivado(s) e ${staleUnarchivedCount} parado(s) sem arquivar`,
    [id],
  );
};

export const PORTFOLIO_TYPE_DIVERSITY: Grader = ({ facts }) => {
  const n = facts.portfolio.distinctProjectTypes;
  return result(
    bandDesc(n, [[4, 1], [3, 0.85], [2, 0.6], [1, 0.3], [0, 0]]),
    `${n} tipo(s) distinto(s) de projeto entre os selecionados`,
    [cev(facts.profile.login, 'type.diversity')],
  );
};
