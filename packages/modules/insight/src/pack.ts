import type { Facts, ProfileFacts, RepositoryFacts } from '@audit/contracts';
import { evidenceId, subjectKey } from '@audit/contracts';
import type { EvidenceId } from '@audit/kernel';

/**
 * A entrada do analisador NUNCA é o repositório inteiro. É um pacote montado
 * aqui, por três razões nesta ordem: custo, latência e alucinação.
 */
export interface EvidencePack {
  subject: { kind: 'profile' | 'repo'; label: string };
  purpose: 'repository' | 'profile';
  /** Apelidos E1..En em ordem canônica. O schema de saída restringe a estes. */
  aliases: Record<string, EvidenceId>;
  /** Texto já truncado e delimitado. Ver `renderPack`. */
  sections: { alias: string; title: string; body: string }[];
}

const MAX_README = 6_000;
const MAX_DOC = 4_000;
const MAX_HEADLINES = 40;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[… truncado em ${max} de ${text.length} caracteres]`;
}

export function buildRepositoryPack(repo: RepositoryFacts): EvidencePack {
  const key = subjectKey({ kind: 'repo', owner: repo.owner, name: repo.name });
  const sections: EvidencePack['sections'] = [];
  const aliases: Record<string, EvidenceId> = {};
  let n = 0;
  const add = (title: string, body: string, id: EvidenceId) => {
    const alias = `E${++n}`;
    aliases[alias] = id;
    sections.push({ alias, title, body });
  };

  add('Metadados', [
    `nome: ${repo.name}`,
    `descrição: ${repo.description ?? '(vazia)'}`,
    `tipo detectado: ${repo.projectType}`,
    `linguagem principal: ${repo.primaryLanguage ?? '(nenhuma)'}`,
    `topics: ${repo.topics.join(', ') || '(nenhuma)'}`,
  ].join('\n'), evidenceId(key, 'repo.field', 'metadata'));

  if (repo.readme) {
    add(`README (${repo.readme.path})`, truncate(repo.readme.text, MAX_README), evidenceId(key, 'file.blob', repo.readme.path));
  }
  if (repo.architectureDoc) {
    add(`Documento de arquitetura (${repo.architectureDoc.path})`, truncate(repo.architectureDoc.text, MAX_DOC), evidenceId(key, 'file.blob', repo.architectureDoc.path));
  }
  // Caminhos, não conteúdo: é o que permite verificar se o documento cita
  // módulos que existem de verdade.
  add('Árvore da raiz', repo.rootTree.map((e) => (e.type === 'tree' ? `${e.name}/` : e.name)).join('\n'), evidenceId(key, 'tree.entry', '__root__'));

  if (repo.commitHeadlines.length > 0) {
    add('Mensagens de commit recentes', repo.commitHeadlines.slice(0, MAX_HEADLINES).join('\n'), evidenceId(key, 'commit.stat', 'headlines'));
  }

  return { subject: { kind: 'repo', label: repo.name }, purpose: 'repository', aliases, sections };
}

export function buildProfilePack(facts: Facts): EvidencePack {
  const p: ProfileFacts = facts.profile;
  const key = subjectKey({ kind: 'profile', login: p.login });
  const sections: EvidencePack['sections'] = [];
  const aliases: Record<string, EvidenceId> = {};
  let n = 0;
  const add = (title: string, body: string, id: EvidenceId) => {
    const alias = `E${++n}`;
    aliases[alias] = id;
    sections.push({ alias, title, body });
  };

  add('Bio', p.bio ?? '(vazia)', evidenceId(key, 'profile.field', 'bio'));
  if (p.profileReadme) {
    add(`Profile README (${p.profileReadme.path})`, truncate(p.profileReadme.text, MAX_README), evidenceId(key, 'file.blob', p.profileReadme.path));
  }
  add(
    'Repositórios em destaque',
    facts.repositories
      .filter((r) => r.isPinned)
      .map((r) => `${r.name} — ${r.description ?? '(sem descrição)'} [${r.projectType}; ${r.topics.slice(0, 5).join(', ') || 'sem topics'}]`)
      .join('\n') || '(nenhum)',
    evidenceId(subjectKey({ kind: 'portfolio', login: p.login }), 'derived.metric', 'pinned'),
  );

  return { subject: { kind: 'profile', label: p.login }, purpose: 'profile', aliases, sections };
}

/**
 * Renderiza o pacote com delimitação explícita.
 *
 * README e descrição são texto escrito por TERCEIROS e podem conter tentativa de
 * injeção de prompt. A delimitação e a instrução de que nada ali dentro é ordem
 * são a primeira defesa; a validação por enum na saída é a segunda, e é a que
 * não depende do modelo cooperar.
 */
export function renderPack(pack: EvidencePack): string {
  const blocks = pack.sections
    .map((s) => `<evidencia id="${s.alias}" titulo="${s.title}">\n${s.body}\n</evidencia>`)
    .join('\n\n');
  return `Sujeito: ${pack.subject.label}\n\n${blocks}`;
}
