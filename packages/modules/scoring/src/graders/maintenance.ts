import type { Grader } from '../rubric/types';
import { band, bandDesc, daysBetween, ev, result } from './helpers';

/** Terminado não é abandonado. Arquivado recebe neutro rotulado como intencional. */
export const COMMIT_RECENCY: Grader = ({ repo, facts }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'commit.stat', 'last');
  if (repo.isArchived) {
    return result(0.7, 'Arquivado — parada intencional, sinalizada corretamente', [id], {
      applicable: true,
      reason: 'repositório arquivado',
    });
  }
  const d = daysBetween(repo.lastCommitAt, facts.scanAt);
  if (d === null) return result(0, 'Sem histórico de commits', [id]);
  return result(
    band(d, [[30, 1], [90, 0.85], [180, 0.7], [365, 0.5], [730, 0.25], [Number.MAX_SAFE_INTEGER, 0.05]]),
    d <= 30 ? `Último commit há ${d} dia(s)` : `Sem commits há ${d} dias`,
    [id],
  );
};

/** Fluxo de squash-merge comprime a contagem. Faixas largas, de propósito. */
export const COMMIT_CADENCE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'commit.stat', 'cadence');
  if (repo.isArchived) return result(0.7, 'Arquivado — cadência não se aplica', [id], { reason: 'repositório arquivado' });
  const n = repo.commitsLast365;
  return result(
    bandDesc(n, [[100, 1], [40, 0.85], [15, 0.65], [5, 0.4], [1, 0.2], [0, 0]]),
    `${n} commit(s) nos últimos 12 meses`,
    [id],
  );
};

export const RELEASE_RECENCY: Grader = ({ repo, facts }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'release', 'recency');
  if (repo.releasesCount === 0) return result(0, 'Nunca publicou release', [id]);
  const d = daysBetween(repo.latestReleaseAt, facts.scanAt);
  if (d === null) return result(0.5, 'Release sem data', [id], { confidence: 'medium' });
  return result(band(d, [[90, 1], [180, 0.85], [365, 0.6], [730, 0.3], [Number.MAX_SAFE_INTEGER, 0.1]]), `Última release há ${d} dias`, [id]);
};

export const ISSUE_HYGIENE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'repo.field', 'issues');
  const { openIssues, closedIssues } = repo;
  if (openIssues === 0 && closedIssues === 0) return result(1, 'Nenhuma issue aberta', [id], { confidence: 'medium' });
  const ratio = closedIssues / (openIssues + closedIssues);
  return result(bandDesc(ratio, [[0.8, 1], [0.6, 0.85], [0.4, 0.6], [0.2, 0.35], [0, 0.15]]), `${openIssues} aberta(s), ${closedIssues} fechada(s)`, [id]);
};

/**
 * Workflow instável, abandonado ou quebrado por permissão gera ruído. Só acusa
 * quando a suite rodou há menos de 90 dias E as DUAS últimas falharam.
 */
export const CI_STATUS: Grader = ({ repo, facts }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'check.suite', 'latest');
  const suites = repo.checkSuites.filter((s) => s.conclusion !== null);
  if (repo.workflows.length === 0 && repo.otherCiFiles.length === 0) {
    return result(0.5, 'Sem CI configurado — status não avaliado', [id], { confidence: 'low', reason: 'não há CI' });
  }
  if (suites.length === 0) return result(0.4, 'CI configurado, mas nunca executou', [id], { confidence: 'medium' });
  const recent = suites.filter((s) => {
    const d = daysBetween(s.updatedAt, facts.scanAt);
    return d !== null && d <= 90;
  });
  const lastTwoFailed = suites.slice(0, 2).length === 2 && suites.slice(0, 2).every((s) => s.conclusion === 'FAILURE');
  if (recent.length > 0 && lastTwoFailed) return result(0, 'As duas últimas execuções do CI falharam', [id]);
  if (suites[0]?.conclusion === 'SUCCESS') return result(1, 'CI verde na última execução', [id]);
  return result(0.6, `Última execução do CI: ${suites[0]?.conclusion ?? 'desconhecida'}`, [id], { confidence: 'medium' });
};
