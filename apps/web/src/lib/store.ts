import type { Facts } from '@audit/contracts';
import type { ScanEvent } from '@audit/collection';
import type { ScoreBreakdown } from '@audit/scoring';
import type { RecommendationSet } from '@audit/reporting';
import type { PersonaId } from '@audit/scoring';

export type EvaluationStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface Evaluation {
  id: string;
  subjectLogin: string;
  persona: PersonaId;
  status: EvaluationStatus;
  createdAt: string;
  completedAt: string | null;
  events: (ScanEvent | { type: 'scan.failed'; kind: string; message: string } | { type: 'report.completed' })[];
  facts: Facts | null;
  score: ScoreBreakdown | null;
  recommendations: RecommendationSet | null;
  error: { kind: string; message: string } | null;
}

/**
 * Store em processo. É o adaptador que a capacidade PERSISTENCE substitui por
 * Postgres — a forma do port já é esta, então trocar não toca no domínio.
 * Enquanto ASYNCHRONOUS estiver desligada, o scan roda aqui mesmo (ADR-0010).
 */
const store = new Map<string, Evaluation>();
const subscribers = new Map<string, Set<(e: unknown) => void>>();

export const put = (e: Evaluation): void => void store.set(e.id, e);
export const get = (id: string): Evaluation | undefined => store.get(id);

export function emit(id: string, event: unknown): void {
  const e = store.get(id);
  if (e) e.events.push(event as ScanEvent);
  for (const fn of subscribers.get(id) ?? []) fn(event);
}

export function subscribe(id: string, fn: (e: unknown) => void): () => void {
  const set = subscribers.get(id) ?? new Set();
  set.add(fn);
  subscribers.set(id, set);
  return () => set.delete(fn);
}

export function newId(): string {
  return `eval_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
