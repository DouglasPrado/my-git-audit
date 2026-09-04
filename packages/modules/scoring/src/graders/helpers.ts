import type { DocFile, RepositoryFacts, TreeEntry } from '@audit/contracts';
import { evidenceId, subjectKey } from '@audit/contracts';
import type { EvidenceId, Instant } from '@audit/kernel';
import type { GradeResult } from '../rubric/types';
import { gradeLabelOf } from '@audit/contracts';

export const repoKey = (r: RepositoryFacts) => subjectKey({ kind: 'repo', owner: r.owner, name: r.name });

export function ev(r: RepositoryFacts, kind: Parameters<typeof evidenceId>[1], sel: string): EvidenceId {
  return evidenceId(repoKey(r), kind, sel);
}

/** Comparação de nome de arquivo é SEMPRE case-insensitive. Ver a armadilha README.MD. */
export function hasEntry(tree: readonly TreeEntry[], ...names: string[]): boolean {
  const lower = new Set(tree.map((e) => e.name.toLowerCase()));
  return names.some((n) => lower.has(n.toLowerCase()));
}

/** Devolve a entrada com o CASO EXATO preservado, para o permalink resolver. */
export function findEntry(tree: readonly TreeEntry[], ...names: string[]): TreeEntry | null {
  const wanted = names.map((n) => n.toLowerCase());
  return tree.find((e) => wanted.includes(e.name.toLowerCase())) ?? null;
}

export function hasPrefix(tree: readonly TreeEntry[], ...prefixes: string[]): boolean {
  return tree.some((e) => prefixes.some((p) => e.name.toLowerCase().startsWith(p.toLowerCase())));
}

export function daysBetween(from: Instant | null, to: Instant): number | null {
  if (!from) return null;
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

/** Faixas por tabela de limiares — nunca fórmula com Math.log/Math.pow (ADR-0005, rubrica §11). */
export function band(value: number, table: readonly (readonly [number, number])[]): number {
  for (const [threshold, grade] of table) if (value <= threshold) return grade;
  return table.length > 0 ? table[table.length - 1]![1] : 0;
}

export function bandDesc(value: number, table: readonly (readonly [number, number])[]): number {
  for (const [threshold, grade] of table) if (value >= threshold) return grade;
  return 0;
}

export interface ReadmeMetrics {
  bytes: number;
  words: number;
  headings: number;
  /** Conta markdown `![](...)` E `<img>` HTML. Contar só markdown é falso positivo real. */
  images: number;
  mermaid: number;
  codeFences: number;
  installCommands: number;
  badges: number;
  proseParagraphs: number;
  links: number;
}

const IMG_MD = /!\[[^\]]*\]\([^)]+\)/g;
const IMG_HTML = /<img\b/gi;
const VIDEO = /\.(mp4|webm|mov)\b|youtube\.com|youtu\.be|asciinema\.org|loom\.com/gi;
const BADGE = /!\[[^\]]*\]\(https:\/\/(img\.shields\.io|badge)/g;
const MERMAID = /```mermaid/g;
const FENCE = /^```/gm;
const HEADING = /^#{1,4}\s+\S/gm;
const INSTALL = /\b(npm|pnpm|yarn|bun|cargo|go|pip|uv|docker)\s+(install|add|run|build|compose|get|i)\b|\bgit clone\b|\bmake\b/gi;
const LINK = /\[[^\]]+\]\([^)]+\)/g;

const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

export function readmeMetrics(doc: DocFile | null): ReadmeMetrics {
  if (!doc) {
    return { bytes: 0, words: 0, headings: 0, images: 0, mermaid: 0, codeFences: 0, installCommands: 0, badges: 0, proseParagraphs: 0, links: 0 };
  }
  const t = doc.text;
  const badges = count(t, BADGE);
  const images = count(t, IMG_MD) + count(t, IMG_HTML) - badges;
  const proseParagraphs = t
    .split(/\n\s*\n/)
    .filter((p) => !p.trim().startsWith('#') && !p.trim().startsWith('```') && !p.trim().startsWith('|') && p.trim().split(/\s+/).length >= 40).length;
  return {
    bytes: doc.byteSize,
    words: t.split(/\s+/).filter(Boolean).length,
    headings: count(t, HEADING),
    images: Math.max(0, images),
    mermaid: count(t, MERMAID),
    codeFences: Math.floor(count(t, FENCE) / 2),
    installCommands: count(t, INSTALL),
    badges,
    proseParagraphs,
    links: count(t, LINK),
  };
}

export function hasVideoDemo(doc: DocFile | null): boolean {
  return doc ? VIDEO.test(doc.text) : false;
}

export function result(
  grade: number,
  detail: string,
  evidenceIds: EvidenceId[],
  opts: Partial<Pick<GradeResult, 'confidence' | 'applicable' | 'reason'>> = {},
): GradeResult {
  return {
    grade,
    label: gradeLabelOf(grade),
    confidence: opts.confidence ?? 'high',
    detail,
    evidenceIds,
    applicable: opts.applicable ?? true,
    ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
  };
}
