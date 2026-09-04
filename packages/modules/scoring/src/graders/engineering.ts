import type { Grader } from '../rubric/types';
import { ev, hasEntry, hasPrefix, readmeMetrics, result } from './helpers';

const TEST_RUNNER = /\b(vitest|jest|pytest|cargo test|go test|npm test|pnpm test|yarn test|mocha|ava|rspec|phpunit|dotnet test|gradle test|mvn test)\b/i;
const BUILD_LINT = /\b(build|lint|clippy|fmt|typecheck|tsc|eslint|ruff|black)\b/i;
const ONLY_DISPATCH = /on:\s*\n\s*workflow_dispatch:/;

/**
 * O pior falso positivo possível do catálogo. Rust usa `#[cfg(test)]` inline e Go
 * usa `*_test.go` ao lado do fonte — nenhum dos dois tem diretório `tests/`.
 * Na dúvida: "não avaliado" com confiança baixa, NUNCA "ausente".
 */
export const TESTS_SUBSTANTIVE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'tests');
  const inRoot = hasEntry(repo.rootTree, 'tests', 'test', '__tests__', 'spec');
  const inSrc = hasEntry(repo.srcTree, 'tests', 'test', '__tests__') ||
    repo.srcTree.some((e) => /\.(test|spec)\.[jt]sx?$/i.test(e.name) || /_test\.go$/i.test(e.name));
  const found = inRoot || inSrc;
  const lang = (repo.primaryLanguage ?? '').toLowerCase();

  if (!found && (lang === 'rust' || lang === 'go')) {
    return result(0.5, `Testes não localizáveis sem clonar: ${repo.primaryLanguage} costuma tê-los junto ao código-fonte`, [id], {
      confidence: 'low',
      reason: 'testes inline não são detectáveis no Quick Scan',
    });
  }
  if (!found) return result(0, 'Nenhum diretório ou arquivo de teste encontrado', [id]);

  const ciRunsTests = repo.workflows.some((w) => TEST_RUNNER.test(w.text));
  const multiJob = repo.workflows.some((w) => /strategy:\s*\n\s*matrix:/.test(w.text) || (w.text.match(/^\s{2}\w[\w-]*:\s*$/gm) ?? []).length >= 2);
  if (ciRunsTests && multiJob) return result(1, 'Testes presentes e executados em matriz no CI', [id]);
  if (ciRunsTests) return result(0.85, 'Testes presentes e executados no CI', [id]);
  return result(0.6, 'Testes presentes, mas nenhum workflow os executa', [id]);
};

/** Nome de arquivo não prova nada. E CI não é só GitHub Actions. */
export const CI_WORKFLOW_SUBSTANTIVE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'workflow.step', 'ci');
  if (repo.workflows.length === 0 && repo.otherCiFiles.length === 0) {
    return result(0, 'Nenhuma automação de CI em nenhum provedor', [id]);
  }
  if (repo.workflows.length === 0) {
    return result(0.6, `CI em ${repo.otherCiFiles.join(', ')}`, [id], { confidence: 'medium' });
  }
  const text = repo.workflows.map((w) => w.text).join('\n');
  const runs = /^\s*(- )?run:/m.test(text);
  if (!runs || repo.workflows.every((w) => ONLY_DISPATCH.test(w.text))) {
    return result(0.25, 'Workflow existe mas só dispara manualmente ou não executa comando', [id]);
  }
  const tests = TEST_RUNNER.test(text);
  const multiJob = repo.workflows.length >= 2 || /strategy:\s*\n\s*matrix:/.test(text);
  if (tests && multiJob) return result(1, `${repo.workflows.length} workflow(s), com testes e execução em matriz`, [id]);
  if (tests) return result(0.85, 'CI executa a suíte de testes', [id]);
  if (BUILD_LINT.test(text)) return result(0.6, 'CI executa build ou lint, mas não testes', [id]);
  return result(0.4, 'CI presente, propósito não identificado', [id], { confidence: 'medium' });
};

/**
 * Núcleo anti-gaming: os módulos citados no documento precisam existir na árvore.
 * Encher de texto não passa de 0.75.
 */
export const ARCHITECTURE_DOC_SUBSTANTIVE: Grader = ({ repo, signals }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'file.blob', 'architecture');
  const doc = repo.architectureDoc;
  if (!doc) return result(0, 'Sem documento de arquitetura', [id]);
  const m = readmeMetrics(doc);
  if (doc.byteSize < 800 || m.words < 120) return result(0.25, `Documento de arquitetura com apenas ${m.words} palavras`, [id]);

  const s = signals.get(`ARCHITECTURE_DOC_SUBSTANTIVE:${repo.name}`);
  const describesComponents = s?.value.type === 'enum' ? s.value.value === 'componentes' || s.value.value === 'fronteiras' : m.headings >= 3;
  if (!describesComponents) return result(0.5, 'Documento longo, sem descrição de componentes', [id], { confidence: 'medium' });

  const names = new Set([...repo.rootTree, ...repo.srcTree].map((e) => e.name.toLowerCase().replace(/\.[a-z]+$/, '')));
  const cited = [...doc.text.matchAll(/`([a-z][\w-]{2,})`/gi)].map((x) => x[1]!.toLowerCase());
  const resolved = new Set(cited.filter((c) => names.has(c))).size;
  const hasDiagram = m.mermaid > 0 || m.images > 0;
  if (hasDiagram && resolved >= 2) return result(1, `Diagrama presente e ${resolved} módulos citados existem na árvore`, [id]);
  return result(0.75, 'Descreve componentes, sem diagrama ou sem módulos verificáveis', [id], { confidence: 'medium' });
};

export const LINT_FORMAT_CONFIG: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'lint');
  const names = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts', '.eslintrc', '.eslintrc.json', '.eslintrc.js', 'biome.json', 'biome.jsonc', 'ruff.toml', '.ruff.toml', 'rustfmt.toml', '.rustfmt.toml', '.editorconfig', '.pre-commit-config.yaml', '.prettierrc', '.prettierrc.json', 'clippy.toml', '.golangci.yml'];
  const found = hasEntry(repo.rootTree, ...names) || hasPrefix(repo.rootTree, 'eslint.config', '.eslintrc', '.prettierrc');
  return result(found ? 1 : 0, found ? 'Configuração de lint ou formatação versionada' : 'Nenhuma configuração de lint ou formatação', [id]);
};

/**
 * Biblioteca corretamente omite lockfile. Errar isso sinaliza a qualquer
 * desenvolvedor experiente que a ferramenta não sabe do que fala.
 */
export const DEP_MANIFEST_LOCKFILE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'manifest');
  const manifest = hasEntry(repo.rootTree, 'package.json', 'cargo.toml', 'go.mod', 'pyproject.toml', 'requirements.txt', 'gemfile', 'composer.json');
  if (!manifest) return result(0, 'Nenhum manifesto de dependências', [id]);
  const lock = hasEntry(repo.rootTree, 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lockb', 'cargo.lock', 'go.sum', 'poetry.lock', 'uv.lock', 'gemfile.lock', 'composer.lock');
  if (repo.projectType === 'library' && !lock) {
    return result(1, 'Manifesto presente; biblioteca corretamente não versiona lockfile', [id]);
  }
  return result(lock ? 1 : 0.5, lock ? 'Manifesto e lockfile versionados' : 'Manifesto sem lockfile', [id]);
};

export const CONTAINERIZED_OR_DEPLOYABLE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'deploy');
  const found = hasEntry(repo.rootTree, 'dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'fly.toml', 'vercel.json', 'procfile', 'netlify.toml', 'railway.json') || hasPrefix(repo.rootTree, 'dockerfile', 'terraform', 'k8s', 'helm');
  return result(found ? 1 : 0, found ? 'Projeto tem caminho de implantação declarado' : 'Nenhuma configuração de implantação', [id]);
};

export const PUBLISHED_PACKAGE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'repo.field', 'published');
  if (repo.releasesCount > 0) return result(1, `${repo.releasesCount} release(s) publicada(s)`, [id]);
  const manifest = hasEntry(repo.rootTree, 'package.json', 'cargo.toml', 'pyproject.toml');
  return result(manifest ? 0.4 : 0, manifest ? 'Manifesto de pacote presente, nada publicado' : 'Sem sinal de publicação', [id]);
};

export const COMMIT_MESSAGE_QUALITY: Grader = ({ repo, signals }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'commit.stat', 'headlines');
  const heads = repo.commitHeadlines;
  if (heads.length === 0) return result(0.5, 'Sem histórico para avaliar', [id], { confidence: 'low' });
  const s = signals.get(`COMMIT_MESSAGE_QUALITY:${repo.name}`);
  const conventional = heads.filter((h) => /^(feat|fix|docs|chore|refactor|test|build|ci|perf|style|revert)(\(.+?\))?!?:/i.test(h)).length / heads.length;
  const lowInfo = heads.filter((h) => /^(wip|update|fix|changes?|stuff|asdf|\.+|test)$/i.test(h.trim())).length / heads.length;
  const median = [...heads.map((h) => h.length)].sort((a, b) => a - b)[Math.floor(heads.length / 2)] ?? 0;
  const base = Math.max(0, Math.min(1, conventional * 0.5 + (median >= 20 ? 0.35 : median >= 12 ? 0.2 : 0) + 0.15 - lowInfo));
  if (!s || s.value.type !== 'enum') {
    return result(base, `${Math.round(conventional * 100)}% em Conventional Commits, mediana de ${median} caracteres`, [id], { confidence: 'medium' });
  }
  const map: Record<string, number> = { ruim: 0.25, aceitavel: 0.6, bom: 0.85, exemplar: 1 };
  return result((base + (map[s.value.value] ?? 0.5)) / 2, `Mensagens de commit: ${s.value.value}`, s.evidenceIds, { confidence: 'low' });
};
