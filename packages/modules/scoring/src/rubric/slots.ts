import type { Slot } from './types';

const rule = (ruleCode: string) => ({ kind: 'rule' as const, ruleCode });
const neutral = (grade: number, reason: string) => ({ kind: 'neutral' as const, grade, reason });

export const slots: Slot[] = [
  // ---- Positioning ------------------------------------------------------
  { id: 'POS.profileReadme', label: 'Profile README presente', category: 'POS', scope: 'profile', weight: 22, universal: true, variants: [{ when: 'always', body: rule('PROFILE_README_PRESENT') }] },
  { id: 'POS.readmeStructure', label: 'Profile README estruturado', category: 'POS', scope: 'profile', weight: 13, universal: true, variants: [{ when: 'always', body: rule('PROFILE_README_STRUCTURE') }] },
  { id: 'POS.readmeClarity', label: 'Profile README comunica a especialidade', category: 'POS', scope: 'profile', weight: 20, universal: true, interpretive: true, variants: [{ when: 'always', body: rule('PROFILE_README_SUBSTANCE') }] },
  { id: 'POS.bio', label: 'Bio preenchida', category: 'POS', scope: 'profile', weight: 8, universal: true, variants: [{ when: 'always', body: rule('PROFILE_BIO_PRESENT') }] },
  { id: 'POS.bioSpecificity', label: 'Bio específica', category: 'POS', scope: 'profile', weight: 15, universal: true, interpretive: true, variants: [{ when: 'always', body: rule('PROFILE_BIO_SPECIFICITY') }] },
  { id: 'POS.coherence', label: 'Portfólio com narrativa coerente', category: 'POS', scope: 'portfolio', weight: 12, universal: true, variants: [{ when: 'always', body: rule('PORTFOLIO_COHERENCE') }] },
  { id: 'POS.profileRepoDescription', label: 'Repositório de perfil descrito', category: 'POS', scope: 'profile', weight: 10, universal: true, variants: [{ when: 'always', body: rule('PROFILE_REPO_DESCRIPTION') }] },

  // ---- Portfolio Curation -----------------------------------------------
  { id: 'CUR.pinnedUsed', label: 'Repositórios fixados em uso', category: 'CUR', scope: 'portfolio', weight: 15, universal: true, variants: [{ when: 'always', body: rule('PROFILE_PINNED_USED') }] },
  { id: 'CUR.pinnedSelfExplanatory', label: 'Fixados se explicam sozinhos', category: 'CUR', scope: 'portfolio', weight: 25, universal: true, variants: [{ when: 'always', body: rule('PINNED_SELF_EXPLANATORY') }] },
  { id: 'CUR.pinnedQuality', label: 'Fixados representam o melhor trabalho', category: 'CUR', scope: 'portfolio', weight: 20, universal: true, variants: [{ when: 'always', body: rule('PINNED_BEST_WORK') }] },
  { id: 'CUR.noiseRatio', label: 'Portfólio sem ruído', category: 'CUR', scope: 'portfolio', weight: 15, universal: true, variants: [{ when: 'always', body: rule('PORTFOLIO_NOISE_RATIO') }] },
  { id: 'CUR.archiveHygiene', label: 'Projetos parados estão arquivados', category: 'CUR', scope: 'portfolio', weight: 10, universal: true, variants: [{ when: 'always', body: rule('PORTFOLIO_ARCHIVE_HYGIENE') }] },
  { id: 'CUR.diversity', label: 'Variedade de tipos de projeto', category: 'CUR', scope: 'portfolio', weight: 15, universal: true, variants: [{ when: 'always', body: rule('PORTFOLIO_TYPE_DIVERSITY') }] },

  // ---- Project Presentation ---------------------------------------------
  { id: 'PRE.readme', label: 'README presente', category: 'PRE', scope: 'repo-agg', weight: 30, universal: true, variants: [{ when: 'always', body: rule('REPO_README_PRESENT') }] },
  { id: 'PRE.structure', label: 'README estruturado', category: 'PRE', scope: 'repo-agg', weight: 20, universal: true, interpretive: true, variants: [{ when: 'always', body: rule('README_STRUCTURE') }] },
  { id: 'PRE.pitch', label: 'README explica o que o projeto faz', category: 'PRE', scope: 'repo-agg', weight: 15, universal: true, interpretive: true, variants: [{ when: 'always', body: rule('README_WHAT_AND_WHY') }] },
  {
    id: 'PRE.demo', label: 'Demonstração do projeto', category: 'PRE', scope: 'repo-agg', weight: 20, universal: false,
    variants: [
      { when: 'isVisualApp', body: rule('README_VISUAL_ASSET') },
      { when: 'isCli', body: rule('README_TERMINAL_DEMO') },
      { when: 'isService', body: rule('ARCHITECTURE_DIAGRAM') },
      { when: 'isDocs', body: neutral(0.6, 'Repositório de documentação não precisa de demonstração visual') },
      { when: 'always', body: rule('README_API_EXAMPLE') },
    ],
  },
  {
    id: 'PRE.quickstart', label: 'Instruções de uso corroboradas', category: 'PRE', scope: 'repo-agg', weight: 15, universal: true,
    variants: [
      { when: 'isDocs', body: rule('DOCS_BUILD_INSTRUCTIONS') },
      { when: 'always', body: rule('README_QUICKSTART_CORROBORATED') },
    ],
  },

  // ---- Engineering Signals ----------------------------------------------
  { id: 'ENG.tests', label: 'Testes', category: 'ENG', scope: 'repo-agg', weight: 25, universal: true, variants: [{ when: 'always', body: rule('TESTS_SUBSTANTIVE') }] },
  { id: 'ENG.ci', label: 'Integração contínua', category: 'ENG', scope: 'repo-agg', weight: 22, universal: true, variants: [{ when: 'always', body: rule('CI_WORKFLOW_SUBSTANTIVE') }] },
  { id: 'ENG.architectureDoc', label: 'Documento de arquitetura', category: 'ENG', scope: 'repo-agg', weight: 15, universal: true, interpretive: true, variants: [{ when: 'always', body: rule('ARCHITECTURE_DOC_SUBSTANTIVE') }] },
  { id: 'ENG.commitQuality', label: 'Qualidade das mensagens de commit', category: 'ENG', scope: 'repo-agg', weight: 10, universal: true, interpretive: true, variants: [{ when: 'always', body: rule('COMMIT_MESSAGE_QUALITY') }] },
  { id: 'ENG.lintConfig', label: 'Lint e formatação configurados', category: 'ENG', scope: 'repo-agg', weight: 10, universal: true, variants: [{ when: 'always', body: rule('LINT_FORMAT_CONFIG') }] },
  { id: 'ENG.depManifest', label: 'Dependências declaradas', category: 'ENG', scope: 'repo-agg', weight: 10, universal: true, variants: [{ when: 'always', body: rule('DEP_MANIFEST_LOCKFILE') }] },
  {
    id: 'ENG.deployable', label: 'Caminho de distribuição', category: 'ENG', scope: 'repo-agg', weight: 8, universal: false,
    variants: [
      { when: 'isLibrary', body: rule('PUBLISHED_PACKAGE') },
      { when: 'isDesktopOrMobile', body: neutral(0.6, 'Aplicativo nativo não se implanta como serviço') },
      { when: 'always', body: rule('CONTAINERIZED_OR_DEPLOYABLE') },
    ],
  },

  // ---- Open Source Maturity ---------------------------------------------
  { id: 'OSS.license', label: 'Licença reconhecível', category: 'OSS', scope: 'repo-agg', weight: 35, universal: true, variants: [{ when: 'always', body: rule('LICENSE_RECOGNIZED') }] },
  {
    id: 'OSS.releases', label: 'Releases e versionamento', category: 'OSS', scope: 'repo-agg', weight: 25, universal: true,
    variants: [
      { when: 'isAppOrDotfiles', body: rule('CHANGELOG_PRESENT') },
      { when: 'always', body: rule('RELEASES_AND_VERSIONING') },
    ],
  },
  { id: 'OSS.contributing', label: 'Processo de contribuição', category: 'OSS', scope: 'repo-agg', weight: 20, universal: true, variants: [{ when: 'always', body: rule('CONTRIBUTING_AND_TEMPLATES') }] },
  { id: 'OSS.codeOfConduct', label: 'Código de conduta', category: 'OSS', scope: 'repo-agg', weight: 10, universal: true, variants: [{ when: 'always', body: rule('CODE_OF_CONDUCT_PRESENT') }] },
  { id: 'OSS.security', label: 'Política de segurança', category: 'OSS', scope: 'repo-agg', weight: 10, universal: true, variants: [{ when: 'always', body: rule('SECURITY_POLICY_PRESENT') }] },

  // ---- Maintenance --------------------------------------------------------
  { id: 'MNT.recency', label: 'Commits recentes', category: 'MNT', scope: 'repo-agg', weight: 40, universal: true, variants: [{ when: 'always', body: rule('COMMIT_RECENCY') }] },
  { id: 'MNT.cadence', label: 'Cadência de commits', category: 'MNT', scope: 'repo-agg', weight: 25, universal: true, variants: [{ when: 'always', body: rule('COMMIT_CADENCE') }] },
  { id: 'MNT.releaseRecency', label: 'Releases recentes', category: 'MNT', scope: 'repo-agg', weight: 15, universal: true, variants: [{ when: 'always', body: rule('RELEASE_RECENCY') }] },
  { id: 'MNT.issueHygiene', label: 'Issues sob controle', category: 'MNT', scope: 'repo-agg', weight: 10, universal: true, variants: [{ when: 'always', body: rule('ISSUE_HYGIENE') }] },
  { id: 'MNT.ciHealth', label: 'CI passando', category: 'MNT', scope: 'repo-agg', weight: 10, universal: true, variants: [{ when: 'always', body: rule('CI_STATUS') }] },

  // ---- Professional Hygiene ----------------------------------------------
  { id: 'HYG.secrets', label: 'Sem credenciais versionadas', category: 'HYG', scope: 'repo-agg', weight: 30, universal: true, variants: [{ when: 'always', body: rule('SECRETS_SUSPECTED') }] },
  { id: 'HYG.artifacts', label: 'Sem artefatos de build versionados', category: 'HYG', scope: 'repo-agg', weight: 25, universal: true, variants: [{ when: 'always', body: rule('COMMITTED_ARTIFACTS') }] },
  { id: 'HYG.gitignore', label: '`.gitignore` presente', category: 'HYG', scope: 'repo-agg', weight: 15, universal: true, variants: [{ when: 'always', body: rule('GITIGNORE_PRESENT') }] },
  { id: 'HYG.identity', label: 'Identidade profissional completa', category: 'HYG', scope: 'profile', weight: 15, universal: true, variants: [{ when: 'always', body: rule('PROFILE_IDENTITY_COMPLETE') }] },
  { id: 'HYG.authorship', label: 'Autoria dos commits', category: 'HYG', scope: 'repo-agg', weight: 15, universal: true, variants: [{ when: 'always', body: rule('COMMIT_AUTHORSHIP') }] },

  // ---- Discoverability ----------------------------------------------------
  { id: 'DIS.repoDescription', label: 'Descrição do repositório', category: 'DIS', scope: 'repo-agg', weight: 25, universal: true, variants: [{ when: 'always', body: rule('REPO_DESCRIPTION') }] },
  { id: 'DIS.repoTopics', label: 'Topics', category: 'DIS', scope: 'repo-agg', weight: 25, universal: true, variants: [{ when: 'always', body: rule('REPO_TOPICS') }] },
  { id: 'DIS.profileWebsite', label: 'Site no perfil', category: 'DIS', scope: 'profile', weight: 12, universal: true, variants: [{ when: 'always', body: rule('PROFILE_WEBSITE') }] },
  { id: 'DIS.profileSocial', label: 'LinkedIn no perfil', category: 'DIS', scope: 'profile', weight: 13, universal: true, variants: [{ when: 'always', body: rule('PROFILE_SOCIAL') }] },
  { id: 'DIS.profileEmail', label: 'E-mail público', category: 'DIS', scope: 'profile', weight: 10, universal: true, variants: [{ when: 'always', body: rule('PROFILE_EMAIL') }] },
  { id: 'DIS.homepage', label: 'Homepage do projeto', category: 'DIS', scope: 'repo-agg', weight: 15, universal: true, variants: [{ when: 'always', body: rule('REPO_HOMEPAGE_URL') }] },
];
