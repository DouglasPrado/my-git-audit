import type { CategoryId, Confidence, GradeLabel, Facts, RepositoryFacts, Signal } from '@audit/contracts';
import type { EvidenceId } from '@audit/kernel';

export interface GraderContext {
  facts: Facts;
  /** Presente quando o slot é de escopo repo-agg. */
  repo?: RepositoryFacts;
  /** Sinais interpretativos, indexados por `code`. Ausentes ⇒ variante neutra. */
  signals: ReadonlyMap<string, Signal>;
}

export interface GradeResult {
  grade: number;
  label: GradeLabel;
  confidence: Confidence;
  detail: string;
  evidenceIds: EvidenceId[];
  applicable: boolean;
  reason?: string;
}

export type Grader = (ctx: GraderContext) => GradeResult;
export type Predicate = (ctx: GraderContext) => boolean;

export type SlotScope = 'profile' | 'portfolio' | 'repo-agg';

export interface SlotVariant {
  when: string;
  body: { kind: 'rule'; ruleCode: string } | { kind: 'neutral'; grade: number; reason: string };
}

export interface Slot {
  id: string;
  /** Rótulo humano do que o slot mede. É o que a trilha de auditoria exibe. */
  label: string;
  category: CategoryId;
  scope: SlotScope;
  /** CONSTANTE — independe do tipo de projeto. É o que impede gaming de denominador. */
  weight: number;
  universal: boolean;
  /** Primeira que casar vence. A última DEVE ser `when: 'always'`. */
  variants: SlotVariant[];
  /** Marca peso interpretativo, para o teto de 40% por categoria. */
  interpretive?: boolean;
}

export interface Cap {
  id: string;
  categories: CategoryId[];
  ceiling: number;
  condition: string;
  reason: string;
  releasedBy: string[];
}

export type PersonaId =
  | 'general'
  | 'recruiter'
  | 'senior-engineer'
  | 'staff-engineer'
  | 'oss-maintainer'
  | 'freelancer';

export interface Persona {
  id: PersonaId;
  label: string;
  /** Absolutos, somando 100. Nenhum abaixo de 4. */
  weights: Record<CategoryId, number>;
  narrative: string;
}

export interface AdjustmentRule {
  code: string;
  category: CategoryId;
  kind: 'bonus' | 'penalty';
  /** Pontos máximos que a regra pode mover, no espaço 0..100 da categoria. */
  max: number;
  scope: SlotScope;
}

export interface Rubric {
  version: string;
  slots: Slot[];
  caps: Cap[];
  personas: Persona[];
  adjustments: AdjustmentRule[];
  bonusCap: number;
  penaltyCap: number;
  graders: Record<string, Grader>;
  predicates: Record<string, Predicate>;
  adjusters: Record<string, (ctx: GraderContext) => { points: number; detail: string; evidenceIds: EvidenceId[] } | null>;
}
