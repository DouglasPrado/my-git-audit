import type { Facts, Signal } from '@audit/contracts';
import type { Result } from '@audit/kernel';
import type { EvidencePack } from './pack';

export type InterpretError =
  | { kind: 'not_configured' }
  | { kind: 'invalid_output'; detail: string }
  | { kind: 'timeout' }
  | { kind: 'provider_error'; detail: string };

export interface InterpretedProfile {
  primaryArea: string;
  secondaryAreas: string[];
  identityClarity: 'confusa' | 'razoavel' | 'clara' | 'inconfundivel';
  rationale: string;
}

export interface InterpretationResult {
  signals: Signal[];
  /** O "10 Second Test". Narrativa exibida; NÃO entra na nota. */
  profileNarrative: InterpretedProfile | null;
  /** Quantas chamadas degradaram. Alimenta a confiança do relatório. */
  degraded: number;
  interpreterVersion: string;
  usage: { calls: number; cacheHits: number };
}

/**
 * Porta de domínio. Fala em `EvidencePack` e sinais — não conhece modelo,
 * fornecedor nem prompt (ADR-0009). A implementação sobre o @gba/ai-harness
 * vive em `harness.ts`; o fake determinístico, em `fake.ts`.
 */
export interface SemanticAnalyzer {
  readonly interpreterVersion: string;
  interpret(facts: Facts, signal?: AbortSignal): Promise<InterpretationResult>;
}

export interface Interpreter {
  interpretRepository(pack: EvidencePack, signal?: AbortSignal): Promise<Result<unknown, InterpretError>>;
  interpretProfile(pack: EvidencePack, signal?: AbortSignal): Promise<Result<unknown, InterpretError>>;
}
