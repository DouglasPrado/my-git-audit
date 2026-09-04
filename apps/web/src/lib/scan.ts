import 'server-only';
import { collect, GitHubClient, messageFor } from '@audit/collection';
import { recommend } from '@audit/reporting';
import { rubricV1, score, type PersonaId } from '@audit/scoring';
import { asInstant, type Clock } from '@audit/kernel';
import { emit, get, put, type Evaluation } from './store';

const clock: Clock = { now: () => asInstant(new Date().toISOString()) };

function token(): string | null {
  // O token nunca vai para o cliente, nunca para log, nunca para prompt.
  return process.env['GITHUB_TOKEN'] ?? null;
}

export async function runScan(id: string): Promise<void> {
  const evaluation = get(id);
  if (!evaluation) return;
  const t = token();
  if (!t) {
    finish(evaluation, { kind: 'token_invalid', message: 'O servidor não tem um token do GitHub configurado.' });
    return;
  }

  evaluation.status = 'running';
  const client = new GitHubClient({ token: t });
  const facts = await collect(evaluation.subjectLogin, client, clock, (e) => emit(id, e));

  if (!facts.ok) {
    finish(evaluation, { kind: facts.error.kind, message: messageFor(facts.error) });
    return;
  }

  const breakdown = score(facts.value, rubricV1, evaluation.persona);
  emit(id, { type: 'scoring.completed', overall: breakdown.overall, persona: evaluation.persona });

  evaluation.facts = facts.value;
  evaluation.score = breakdown;
  evaluation.recommendations = recommend(facts.value, rubricV1, evaluation.persona, breakdown);
  evaluation.status = 'completed';
  evaluation.completedAt = new Date().toISOString();
  put(evaluation);
  emit(id, { type: 'report.completed' });
}

function finish(e: Evaluation, error: { kind: string; message: string }): void {
  e.status = 'failed';
  e.error = error;
  e.completedAt = new Date().toISOString();
  put(e);
  emit(e.id, { type: 'scan.failed', ...error });
}

export const PERSONAS: PersonaId[] = ['general', 'recruiter', 'senior-engineer', 'staff-engineer', 'oss-maintainer', 'freelancer'];
