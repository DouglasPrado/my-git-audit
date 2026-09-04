import type { EvidenceId, SignalId } from '@audit/kernel';
import { invariant } from '@audit/kernel';
import type { SubjectRef } from './subject';
import { subjectKey } from './subject';

export type Confidence = 'high' | 'medium' | 'low';

export type SignalValue =
  | { type: 'bool'; value: boolean }
  | { type: 'count'; value: number }
  | { type: 'ratio'; value: number }
  | { type: 'bytes'; value: number }
  | { type: 'days'; value: number }
  | { type: 'enum'; value: string; domain: readonly string[] };

export type ProducerRef =
  | { kind: 'deterministic'; fn: string; v: number }
  | {
      kind: 'llm';
      model: string;
      promptId: string;
      promptVersion: number;
      temperature: 0;
      samples: 1 | 3;
      agreement?: number;
    };

export interface Signal {
  id: SignalId;
  code: string;
  subject: SubjectRef;
  value: SignalValue;
  confidence: Confidence;
  producer: ProducerRef;
  /** INVARIANTE: não vazio. Verificado na construção. */
  evidenceIds: EvidenceId[];
  /** Prosa do modelo. Exibida. NUNCA usada em cálculo. */
  rationale?: string;
}

/**
 * Única porta de entrada para criar Signal. A invariante de evidência é
 * verificada aqui e lança — sinal sem evidência é defeito, não caso degradado
 * (CLAUDE.md regra 16, ADR-0003).
 */
export function makeSignal(s: Omit<Signal, 'id'>): Signal {
  invariant(
    s.evidenceIds.length > 0,
    `Signal ${s.code} em ${subjectKey(s.subject)} não tem evidência`,
  );
  if (s.producer.kind === 'llm') {
    invariant(
      s.value.type === 'enum',
      `Signal ${s.code} vem de LLM e precisa ser enum, não ${s.value.type} (ADR-0004)`,
    );
  }
  return { ...s, id: `sig:${subjectKey(s.subject)}#${s.code}` as SignalId };
}
