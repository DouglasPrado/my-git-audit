import type { ProjectType, TreeEntry } from '@audit/contracts';

const has = (t: readonly TreeEntry[], ...names: string[]) => {
  const lower = new Set(t.map((e) => e.name.toLowerCase()));
  return names.some((n) => lower.has(n.toLowerCase()));
};

export interface ClassifyInput {
  name: string;
  topics: readonly string[];
  primaryLanguage: string | null;
  languages: readonly { name: string; size: number }[];
  rootTree: readonly TreeEntry[];
  srcTree: readonly TreeEntry[];
  manifest: Record<string, unknown> | null;
  releasesCount: number;
}

/**
 * Classificação determinística. Um LLM faria isso melhor, mas o tipo de projeto
 * decide QUAL variante de slot roda — deixar isso para o modelo tornaria o
 * denominador dependente de interpretação. Aqui, não.
 */
export function classifyProjectType(i: ClassifyInput): ProjectType {
  const topics = new Set(i.topics.map((t) => t.toLowerCase()));
  const lang = (i.primaryLanguage ?? '').toLowerCase();
  const root = i.rootTree;
  const nameL = i.name.toLowerCase();

  const topicIs = (...ts: string[]) => ts.some((t) => topics.has(t));

  if (topicIs('dotfiles') || nameL.includes('dotfiles') || has(root, '.zshrc', '.bashrc', '.vimrc')) return 'config-dotfiles';

  const onlyDocs =
    !i.primaryLanguage &&
    i.languages.length === 0 &&
    (has(root, 'docs') || root.filter((e) => e.type === 'blob').every((e) => /\.(md|txt|pdf)$/i.test(e.name)));
  if (onlyDocs) return 'docs';
  if (topicIs('documentation', 'awesome', 'awesome-list', 'handbook')) return 'docs';

  if (topicIs('tutorial', 'learning', 'course', 'exercises', 'study') || /^(learn|curso|estudo|exercicios)/.test(nameL)) return 'learning';

  if (has(root, 'tauri.conf.json') || has(root, 'src-tauri') || topicIs('tauri', 'electron', 'desktop')) return 'desktop';
  if (has(root, 'app.json', 'pubspec.yaml') || has(root, 'android', 'ios') || topicIs('react-native', 'expo', 'flutter', 'android', 'ios', 'mobile')) return 'mobile';

  if (topicIs('cli', 'command-line', 'terminal') || (i.manifest && typeof i.manifest['bin'] === 'object')) return 'cli';

  if (has(root, 'next.config.js', 'next.config.mjs', 'next.config.ts', 'astro.config.mjs', 'nuxt.config.ts', 'index.html', 'svelte.config.js')) return 'web';
  if (topicIs('website', 'landing-page', 'portfolio', 'chrome-extension', 'browser-extension')) return 'web';

  if (has(root, 'dockerfile', 'docker-compose.yml', 'compose.yml', 'fly.toml', 'procfile') || has(root, 'terraform', 'k8s', 'helm', 'charts')) return 'service';
  if (topicIs('api', 'backend', 'microservice', 'server', 'distributed-systems', 'infrastructure')) return 'service';

  if (topicIs('library', 'sdk', 'framework', 'package', 'npm-package', 'crate')) return 'library';
  if (i.releasesCount > 0 && has(root, 'package.json', 'cargo.toml', 'pyproject.toml')) return 'library';
  if (i.manifest && (i.manifest['main'] || i.manifest['exports'] || i.manifest['module'])) return 'library';

  if (topicIs('game', 'engine', 'simulation')) return 'library';
  if (has(root, 'notebooks') || lang === 'jupyter notebook' || topicIs('machine-learning', 'data-science')) return 'data-ml';

  if (i.primaryLanguage) return 'application';
  return 'unknown';
}
