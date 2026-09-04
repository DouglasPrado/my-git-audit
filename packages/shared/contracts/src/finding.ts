import type { EvidenceId, FindingId, SignalId } from '@audit/kernel';
import { invariant } from '@audit/kernel';
import type { SubjectRef } from './subject';
import { subjectKey } from './subject';
import type { Confidence } from './signal';

export type CategoryId = 'ENG' | 'POS' | 'CUR' | 'PRE' | 'OSS' | 'MNT' | 'HYG' | 'DIS';

export const CATEGORIES: readonly CategoryId[] = ['ENG', 'POS', 'CUR', 'PRE', 'OSS', 'MNT', 'HYG', 'DIS'];

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  ENG: 'Engineering Signals',
  POS: 'Positioning',
  CUR: 'Portfolio Curation',
  PRE: 'Project Presentation',
  OSS: 'Open Source Maturity',
  MNT: 'Maintenance',
  HYG: 'Professional Hygiene',
  DIS: 'Discoverability',
};

export type GradeLabel = 'absent' | 'stub' | 'partial' | 'good' | 'exemplary';
export type Severity = 'info' | 'low' | 'medium' | 'high';
export type Polarity = 'positive' | 'negative' | 'neutral';

export interface Finding {
  id: FindingId;
  ruleCode: string;
  slotId: string | null;
  category: CategoryId;
  subject: SubjectRef;
  /** 0..1, encaixado nas faixas da regra. */
  grade: number;
  gradeLabel: GradeLabel;
  polarity: Polarity;
  severity: Severity;
  /** Template determinístico. Sem prosa de LLM. */
  title: string;
  detail: string;
  applicable: boolean;
  applicabilityReason?: string;
  evidenceIds: EvidenceId[];
  signalIds: SignalId[];
  confidence: Confidence;
}

export function makeFinding(f: Omit<Finding, 'id'>): Finding {
  return { ...f, id: `fnd:${subjectKey(f.subject)}#${f.ruleCode}` as FindingId };
}

export function gradeLabelOf(grade: number): GradeLabel {
  if (grade <= 0.05) return 'absent';
  if (grade <= 0.3) return 'stub';
  if (grade <= 0.65) return 'partial';
  if (grade < 0.95) return 'good';
  return 'exemplary';
}

export interface Recommendation {
  id: string;
  /** INVARIANTE: não vazio. Recomendação sem achado não existe (CLAUDE.md regra 17). */
  fromFindingIds: FindingId[];
  title: string;
  action: string;
  category: CategoryId;
  subject: SubjectRef;
  /** Contrafactual calculado reexecutando o motor puro. Não estimado. */
  estimatedGain: { categoryBefore: number; categoryAfter: number; overallDelta: number };
  effort: 'S' | 'M' | 'L';
  evidenceIds: EvidenceId[];
}

export function makeRecommendation(r: Omit<Recommendation, 'id'>): Recommendation {
  invariant(
    r.fromFindingIds.length > 0,
    `Recomendação "${r.title}" não deriva de nenhum achado (ADR-0003)`,
  );
  return { ...r, id: `rec:${subjectKey(r.subject)}#${r.fromFindingIds[0]!}` };
}
