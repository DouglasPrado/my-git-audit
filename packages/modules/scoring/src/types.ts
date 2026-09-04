import type { CategoryId, Confidence, Finding, SubjectRef } from '@audit/contracts';
import type { EvidenceId } from '@audit/kernel';
import type { PersonaId } from './rubric/types';

export interface Contribution {
  kind: 'earned' | 'forgone' | 'bonus' | 'penalty';
  slotId?: string;
  ruleCode?: string;
  label: string;
  /** Assinado, já no espaço 0..100 da categoria. */
  points: number;
  subject?: SubjectRef;
  evidenceIds: EvidenceId[];
  confidence: Confidence;
}

export interface CapApplication {
  capId: string;
  ceiling: number;
  valueBefore: number;
  /** Negativo. Zero quando o cap está ativo mas não é limitante. */
  delta: number;
  binding: boolean;
  reason: string;
  releasedBy: string[];
}

export interface CategoryScore {
  category: CategoryId;
  /** 0..100. INVARIANTE: idêntico entre todas as personas. */
  score: number;
  math: {
    earned: number;
    possible: number;
    floor: number;
    denominator: number;
    base: number;
    bonusTotal: number;
    penaltyTotal: number;
    preCap: number;
    postCap: number;
  };
  contributions: Contribution[];
  caps: CapApplication[];
  slotsNotAssessed: { slotId: string; reason: string }[];
  /** Fração do denominador por confiança. Acima de 0.3 em `low` ⇒ "parcialmente interpretado". */
  confidenceMix: { high: number; medium: number; low: number };
}

export interface RepoScore {
  owner: string;
  name: string;
  projectType: string;
  score: number;
  band: 'Strong' | 'Solid' | 'Thin';
  categories: Partial<Record<CategoryId, number>>;
}

export interface ScoreBreakdown {
  rubricVersion: string;
  personaId: PersonaId;
  personaLabel: string;
  weights: Record<CategoryId, number>;
  categories: Record<CategoryId, CategoryScore>;
  overall: number;
  terms: { category: CategoryId; score: number; weight: number; weighted: number }[];
  /** De graça, porque as categorias são invariantes entre personas. */
  allPersonaOverall: Record<PersonaId, number>;
  repoScores: RepoScore[];
  findings: Finding[];
  excluded: { name: string; reason: string }[];
}
