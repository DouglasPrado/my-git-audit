import type { EvidenceId, Instant } from '@audit/kernel';
import type { SubjectRef } from './subject';

export type EvidenceKind =
  | 'profile.field'
  | 'repo.field'
  | 'tree.entry'
  | 'file.blob'
  | 'file.span'
  | 'workflow.step'
  | 'check.suite'
  | 'release'
  | 'commit.stat'
  | 'topic'
  | 'language'
  | 'derived.metric';

export interface Locator {
  /** Permalink fixado no commit escaneado — não apodrece, não deriva. */
  url: string;
  repo?: { owner: string; name: string; defaultBranch: string; commitOid: string };
  /** Caso EXATO como existe na árvore: 'README.MD', não 'README.md'. */
  path?: string;
  lineStart?: number;
  lineEnd?: number;
  /** JSON Pointer para dentro do RawScan, quando o fato não tem arquivo. */
  jsonPointer?: string;
}

export interface Evidence<T = unknown> {
  id: EvidenceId;
  kind: EvidenceKind;
  subject: SubjectRef;
  locator: Locator;
  value: T;
  /** Verbatim, no máximo 240 caracteres, para renderização. */
  snippet?: string;
  source: 'graphql' | 'rest' | 'blob' | 'derived';
  derivedFrom?: EvidenceId[];
  collectedAt: Instant;
}

/**
 * Chave natural derivada de coordenadas de conteúdo — nunca índice de array,
 * nunca UUID. É o que faz a mesma evidência ter o mesmo id entre scans,
 * viabilizando o diff por id.
 *
 *   ev:repo:octo-example/vault#file.span:README.MD@L180-L192
 */
export function evidenceId(
  subjectKeyValue: string,
  kind: EvidenceKind,
  selector: string,
): EvidenceId {
  return `ev:${subjectKeyValue}#${kind}:${selector}` as EvidenceId;
}
