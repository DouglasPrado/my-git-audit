import type { Instant } from '@audit/kernel';

export type ProjectType =
  | 'library'
  | 'application'
  | 'cli'
  | 'service'
  | 'desktop'
  | 'mobile'
  | 'web'
  | 'docs'
  | 'config-dotfiles'
  | 'data-ml'
  | 'learning'
  | 'unknown';

export interface TreeEntry {
  /** Caso EXATO como veio da árvore. */
  name: string;
  type: 'blob' | 'tree';
}

export interface DocFile {
  /** Caso EXATO, para o permalink resolver. */
  path: string;
  text: string;
  byteSize: number;
}

export interface WorkflowFile {
  name: string;
  text: string;
}

export interface CommunityFacts {
  license: boolean;
  contributing: boolean;
  codeOfConduct: boolean;
  issueTemplate: boolean;
  pullRequestTemplate: boolean;
  securityPolicy: boolean;
}

export interface CheckSuiteFacts {
  conclusion: 'SUCCESS' | 'FAILURE' | 'CANCELLED' | 'SKIPPED' | 'NEUTRAL' | 'STALE' | null;
  updatedAt: Instant | null;
}

export interface RepositoryFacts {
  owner: string;
  name: string;
  description: string | null;
  homepageUrl: string | null;
  isFork: boolean;
  isArchived: boolean;
  isEmpty: boolean;
  isPinned: boolean;
  /** 3 fixado · 2 topo · 1 demais. */
  prominence: 1 | 2 | 3;
  projectType: ProjectType;
  defaultBranch: string | null;
  /** OID escaneado. Base de todo permalink de evidência. */
  commitOid: string | null;
  topics: string[];
  languages: { name: string; size: number }[];
  primaryLanguage: string | null;
  licenseSpdxId: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  closedIssues: number;
  releasesCount: number;
  latestReleaseTag: string | null;
  latestReleaseAt: Instant | null;
  lastCommitAt: Instant | null;
  commitsLast365: number;
  commitHeadlines: string[];
  /** login resolvido, ou null quando o e-mail não está vinculado. */
  commitAuthors: (string | null)[];
  rootTree: TreeEntry[];
  githubTree: TreeEntry[];
  srcTree: TreeEntry[];
  workflows: WorkflowFile[];
  otherCiFiles: string[];
  readme: DocFile | null;
  architectureDoc: DocFile | null;
  community: CommunityFacts;
  checkSuites: CheckSuiteFacts[];
}

export interface ProfileFacts {
  login: string;
  name: string | null;
  bio: string | null;
  websiteUrl: string | null;
  location: string | null;
  company: string | null;
  followers: number;
  socialAccounts: number;
  email: string | null;
  profileReadme: DocFile | null;
  profileReadmeRepoExists: boolean;
  pinnedCount: number;
}

export interface PortfolioFacts {
  totalOwnRepos: number;
  archivedCount: number;
  staleUnarchivedCount: number;
  noisyCount: number;
  forkCount: number;
  /** Herfindahl sobre topics e linguagens: 0 disperso, 1 concentrado. */
  topicConcentration: number;
  languageConcentration: number;
  distinctProjectTypes: number;
  mergedPullRequestsToOthers: number;
}

export interface Facts {
  /** O "agora" congelado. Toda regra temporal lê daqui — o motor não lê relógio. */
  scanAt: Instant;
  collectorVersion: string;
  profile: ProfileFacts;
  portfolio: PortfolioFacts;
  /** Apenas os selecionados. Exclusões vivem em `excluded`. */
  repositories: RepositoryFacts[];
  excluded: { name: string; reason: string }[];
}
