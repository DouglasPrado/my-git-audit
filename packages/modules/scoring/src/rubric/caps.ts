import type { Cap, GraderContext, Predicate } from './types';

export const caps: Cap[] = [
  { id: 'CAP_NO_README', categories: ['PRE'], ceiling: 40, condition: 'noReadmeAnywhere', reason: 'Nenhum README encontrado na raiz, em `.github/` ou em `docs/`.', releasedBy: ['REPO_README_PRESENT'] },
  { id: 'CAP_NO_PROFILE_README', categories: ['POS'], ceiling: 55, condition: 'noProfileReadme', reason: 'O perfil não tem Profile README — não há posicionamento algum.', releasedBy: ['PROFILE_README_PRESENT'] },
  { id: 'CAP_SECRETS_SUSPECTED', categories: ['HYG'], ceiling: 25, condition: 'secretsSuspected', reason: 'Um arquivo com nome de credencial está versionado em repositório público — verifique se não contém segredo.', releasedBy: ['SECRETS_SUSPECTED'] },
  { id: 'CAP_NO_LICENSE_PUBLIC', categories: ['OSS'], ceiling: 35, condition: 'majorityWithoutLicense', reason: 'A maioria dos repositórios avaliados não tem licença reconhecível.', releasedBy: ['LICENSE_RECOGNIZED'] },
  { id: 'CAP_ALL_STALE', categories: ['MNT'], ceiling: 30, condition: 'allStale', reason: 'Todo repositório avaliado está parado há mais de 24 meses sem ser arquivado.', releasedBy: ['COMMIT_RECENCY', 'PORTFOLIO_ARCHIVE_HYGIENE'] },
  { id: 'CAP_NO_SCORABLE_REPOS', categories: ['PRE', 'ENG', 'OSS', 'MNT'], ceiling: 20, condition: 'noScorableRepos', reason: 'Nenhum repositório público avaliável.', releasedBy: ['REPO_MATERIALITY'] },
];

const SECRET_ALLOW = new Set(['.env.example', '.env.sample', '.env.template', '.env.dist', 'credentials.yml.enc']);
const SECRET_NAMES = ['.env', '.env.local', '.env.production', '.env.prod', 'id_rsa', 'id_ed25519', 'credentials.json', '.netrc'];
const SECRET_EXT = /\.(pem|p12|pfx|key)$/i;

const DAY = 86_400_000;

export const capConditions: Record<string, Predicate> = {
  noReadmeAnywhere: ({ facts }) => facts.repositories.length > 0 && facts.repositories.every((r) => !r.readme),
  noProfileReadme: ({ facts }) => !facts.profile.profileReadme,
  secretsSuspected: ({ facts }) =>
    facts.repositories.some((r) =>
      r.rootTree.some(
        (e) => e.type === 'blob' && !SECRET_ALLOW.has(e.name.toLowerCase()) && (SECRET_NAMES.includes(e.name.toLowerCase()) || SECRET_EXT.test(e.name)),
      ),
    ),
  majorityWithoutLicense: ({ facts }) => {
    const eligible = facts.repositories.filter((r) => !r.isFork);
    if (eligible.length === 0) return false;
    const without = eligible.filter((r) => !r.licenseSpdxId || r.licenseSpdxId === 'NOASSERTION').length;
    return without / eligible.length > 0.5;
  },
  allStale: ({ facts }: GraderContext) => {
    const active = facts.repositories.filter((r) => !r.isArchived);
    if (active.length === 0) return false;
    const now = Date.parse(facts.scanAt);
    return active.every((r) => {
      if (!r.lastCommitAt) return true;
      return (now - Date.parse(r.lastCommitAt)) / DAY > 730;
    });
  },
  noScorableRepos: ({ facts }) => facts.repositories.length === 0,
};
