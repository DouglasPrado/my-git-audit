import type { Grader } from '../rubric/types';
import { ev, hasEntry, result } from './helpers';

/** Só faz sentido em repositório que convida contribuição. Cobrar CoC de ferramenta solo queima confiança. */
function invitesContribution(stars: number): boolean {
  return stars >= 10;
}

/**
 * A escada mais limpa que existe: o `licenseInfo` do GitHub vem do licensee, que
 * faz casamento de CONTEÚDO, não de nome de arquivo. Licença vazia ou adulterada
 * resulta em null ou NOASSERTION sozinha. Forks herdam — e são excluídos antes daqui.
 */
export const LICENSE_RECOGNIZED: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'repo.field', 'license');
  const spdx = repo.licenseSpdxId;
  const fileExists = hasEntry(repo.rootTree, 'license', 'license.md', 'license.txt', 'licence', 'copying');
  if (spdx && spdx !== 'NOASSERTION') return result(1, `Licença ${spdx}`, [id]);
  if (spdx === 'NOASSERTION') return result(0.3, 'Arquivo de licença presente, mas o texto não corresponde a nenhuma licença conhecida', [id]);
  // Arquivo LICENSE que o GitHub não reconhece vale ZERO, igual a não ter.
  // Dar crédito parcial aqui recompensaria criar um arquivo vazio — e um LICENSE
  // ilegível não dá a ninguém a clareza jurídica que é o objetivo inteiro da regra.
  if (fileExists) return result(0, 'Existe um arquivo LICENSE, mas o conteúdo não é uma licença reconhecível — na prática, é o mesmo que não ter', [id]);
  return result(0, 'Sem licença — ninguém sabe se pode usar este código', [id]);
};

export const RELEASES_AND_VERSIONING: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'release', 'count');
  if (repo.releasesCount === 0) return result(0, 'Nenhuma release publicada', [id]);
  const semver = repo.latestReleaseTag ? /^v?\d+\.\d+\.\d+/.test(repo.latestReleaseTag) : false;
  if (repo.releasesCount >= 5 && semver) return result(1, `${repo.releasesCount} releases, versionamento semântico`, [id]);
  if (semver) return result(0.8, `${repo.releasesCount} release(s) em versionamento semântico`, [id]);
  return result(0.55, `${repo.releasesCount} release(s), tag fora de SemVer`, [id]);
};

export const CHANGELOG_PRESENT: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'changelog');
  const found = hasEntry(repo.rootTree, 'changelog.md', 'changelog', 'changes.md', 'history.md');
  if (found) return result(1, 'CHANGELOG versionado', [id]);
  if (repo.releasesCount > 0) return result(0.7, `Sem CHANGELOG, mas há ${repo.releasesCount} release(s)`, [id]);
  return result(0, 'Sem CHANGELOG nem releases — não há como saber o que mudou', [id]);
};

export const CONTRIBUTING_AND_TEMPLATES: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'contributing');
  if (!invitesContribution(repo.stars)) {
    return result(0.5, 'Projeto pessoal — não avaliado quanto a processo de contribuição', [id], {
      confidence: 'medium',
      reason: 'menos de 10 stars; não convida contribuição externa',
    });
  }
  const c = repo.community;
  const n = [c.contributing, c.issueTemplate, c.pullRequestTemplate].filter(Boolean).length;
  return result(n / 3, `${n} de 3 artefatos de contribuição presentes`, [id]);
};

export const CODE_OF_CONDUCT_PRESENT: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'coc');
  if (!invitesContribution(repo.stars)) {
    return result(0.5, 'Projeto pessoal — código de conduta não é exigido', [id], {
      confidence: 'medium',
      reason: 'menos de 10 stars',
    });
  }
  return result(repo.community.codeOfConduct ? 1 : 0, repo.community.codeOfConduct ? 'Código de conduta presente' : 'Sem código de conduta', [id]);
};

export const SECURITY_POLICY_PRESENT: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'security');
  const found = repo.community.securityPolicy || hasEntry(repo.rootTree, 'security.md') || hasEntry(repo.githubTree, 'security.md');
  if (found) return result(1, 'Política de segurança publicada', [id]);
  if (!invitesContribution(repo.stars)) {
    return result(0.5, 'Projeto pessoal — política de segurança não é exigida', [id], { confidence: 'medium', reason: 'menos de 10 stars' });
  }
  return result(0, 'Sem `SECURITY.md` — não há canal para reportar vulnerabilidade', [id]);
};
