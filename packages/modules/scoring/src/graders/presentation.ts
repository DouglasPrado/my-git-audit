import type { Grader } from '../rubric/types';
import { ev, hasEntry, hasPrefix, hasVideoDemo, readmeMetrics, result } from './helpers';

export const REPO_README_PRESENT: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'readme');
  if (!repo.readme) return result(0, 'Sem README na raiz, em `.github/` ou em `docs/`', [id]);
  const m = readmeMetrics(repo.readme);
  if (m.bytes < 500) return result(0.3, `README de apenas ${m.bytes} bytes`, [id]);
  return result(1, `README em \`${repo.readme.path}\`, ${m.bytes} bytes`, [id]);
};

/** Parede de badges parece estruturada. Exige ao menos um parágrafo de prosa com 40+ palavras. */
export const README_STRUCTURE: Grader = ({ repo, signals }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'derived.metric', 'readme.structure');
  if (!repo.readme) return result(0, 'Sem README', [id]);
  const m = readmeMetrics(repo.readme);
  const s = signals.get(`README_STRUCTURE:${repo.name}`);
  let g = 0;
  if (m.headings >= 3) g += 0.3;
  if (m.proseParagraphs >= 1) g += 0.3;
  if (m.codeFences >= 1) g += 0.2;
  if (m.links >= 2) g += 0.2;
  if (m.proseParagraphs === 0 && m.badges >= 3) {
    return result(0.25, `${m.badges} badges e nenhum parágrafo de prosa`, [id], { confidence: 'high' });
  }
  const base = Math.min(1, g);
  if (!s || s.value.type !== 'enum') {
    return result(base, `${m.headings} títulos, ${m.proseParagraphs} parágrafo(s) de prosa, ${m.codeFences} blocos de código`, [id], { confidence: 'medium' });
  }
  const map: Record<string, number> = { confuso: 0.3, aceitavel: 0.6, claro: 0.85, exemplar: 1 };
  return result((base + (map[s.value.value] ?? 0.5)) / 2, `Estrutura ${s.value.value}`, s.evidenceIds, { confidence: 'low' });
};

export const README_WHAT_AND_WHY: Grader = ({ repo, signals }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'file.span', 'readme.opening');
  if (!repo.readme) return result(0, 'Sem README', [id]);
  const s = signals.get(`README_WHAT_AND_WHY:${repo.name}`);
  if (!s || s.value.type !== 'enum') {
    // Aproximação determinística: descrição + abertura em prosa antes do primeiro bloco.
    const opening = repo.readme.text.slice(0, 400);
    const hasProse = opening.split(/\n\s*\n/).some((p) => !p.startsWith('#') && p.trim().split(/\s+/).length >= 15);
    return result(
      (repo.description ? 0.5 : 0) + (hasProse ? 0.4 : 0),
      hasProse ? 'Abertura explica o projeto em prosa' : 'A abertura não explica o que o projeto faz',
      [id],
      { confidence: 'medium' },
    );
  }
  const map: Record<string, number> = { ausente: 0, vago: 0.35, claro: 1 };
  return result(map[s.value.value] ?? 0.5, `Proposta ${s.value.value}`, s.evidenceIds, { confidence: 'low' });
};

/**
 * Variantes do slot de demonstração. Uma biblioteca não escapa do slot —
 * recebe exemplo de API no lugar de screenshot, pelos mesmos 20 pontos.
 */
export const README_VISUAL_ASSET: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'derived.metric', 'readme.images');
  const m = readmeMetrics(repo.readme);
  const video = hasVideoDemo(repo.readme);
  if (m.images === 0 && !video) return result(0, 'Nenhuma imagem ou vídeo no README de um projeto visual', [id]);
  if (video) return result(1, 'README traz demonstração em vídeo', [id]);
  return result(m.images >= 2 ? 1 : 0.7, `${m.images} imagem(ns) no README`, [id]);
};

export const README_API_EXAMPLE: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'derived.metric', 'readme.fences');
  const m = readmeMetrics(repo.readme);
  return result(
    m.codeFences >= 3 ? 1 : m.codeFences >= 1 ? 0.6 : 0,
    `${m.codeFences} bloco(s) de código mostrando uso`,
    [id],
  );
};

export const README_TERMINAL_DEMO: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'derived.metric', 'readme.terminal');
  const m = readmeMetrics(repo.readme);
  const video = hasVideoDemo(repo.readme);
  if (video || m.images > 0) return result(1, 'README traz demonstração visual da CLI', [id]);
  return result(m.codeFences >= 2 ? 0.6 : 0, `${m.codeFences} bloco(s) de sessão de terminal`, [id]);
};

export const ARCHITECTURE_DIAGRAM: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'derived.metric', 'readme.diagram');
  const m = readmeMetrics(repo.readme);
  const inDoc = repo.architectureDoc ? readmeMetrics(repo.architectureDoc) : null;
  const mermaid = m.mermaid + (inDoc?.mermaid ?? 0);
  const images = m.images + (inDoc?.images ?? 0);
  if (mermaid > 0) return result(1, `${mermaid} diagrama(s) mermaid`, [id]);
  if (images > 0) return result(0.8, `${images} imagem(ns) de diagrama`, [id]);
  return result(0, 'Nenhum diagrama de arquitetura em serviço distribuído', [id]);
};

/**
 * Corroboração cruzada: comando citado no README precisa de manifesto na árvore.
 * Em monorepo os manifestos vivem sob packages/, apps/, crates/ — varrer um nível
 * antes de acusar, ou todo monorepo vira falso positivo.
 */
export const README_QUICKSTART_CORROBORATED: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'derived.metric', 'readme.quickstart');
  const m = readmeMetrics(repo.readme);
  if (m.installCommands === 0) return result(0, 'O README não diz como rodar o projeto', [id]);
  const manifest =
    hasEntry(repo.rootTree, 'package.json', 'cargo.toml', 'go.mod', 'pyproject.toml', 'requirements.txt', 'gemfile', 'composer.json', 'makefile', 'dockerfile', 'docker-compose.yml') ||
    hasPrefix(repo.rootTree, 'packages', 'apps', 'crates');
  if (!manifest) return result(0.4, `${m.installCommands} comando(s) citados, mas nenhum manifesto correspondente na árvore`, [id], { confidence: 'medium' });
  return result(1, `${m.installCommands} comando(s) de instalação, corroborados por manifesto`, [id]);
};

export const DOCS_BUILD_INSTRUCTIONS: Grader = ({ repo }) => {
  if (!repo) return result(0, 'sem repositório', []);
  const id = ev(repo, 'tree.entry', 'docs');
  const m = readmeMetrics(repo.readme);
  const docs = hasEntry(repo.rootTree, 'docs') || hasPrefix(repo.rootTree, 'docs');
  return result(docs && m.headings >= 3 ? 1 : docs ? 0.6 : 0.3, docs ? 'Documentação organizada em `docs/`' : 'Sem diretório de documentação', [id]);
};
