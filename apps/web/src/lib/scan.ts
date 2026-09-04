import 'server-only';
import { collect, GitHubClient, messageFor } from '@audit/collection';
import { createAnalyzer, createFakeInterpreter, createHarnessInterpreter, memoryCache } from '@audit/insight';
import type { SemanticAnalyzer } from '@audit/insight';
import { recommend } from '@audit/reporting';
import { rubricV1, score, type PersonaId } from '@audit/scoring';
import { asInstant, type Clock } from '@audit/kernel';
import type { Signal } from '@audit/contracts';
import { emit, get, put, type Evaluation } from './store';

const clock: Clock = { now: () => asInstant(new Date().toISOString()) };

function token(): string | null {
  // O token nunca vai para o cliente, nunca para log, nunca para prompt.
  return process.env['GITHUB_TOKEN'] ?? null;
}

/**
 * A capacidade AI_ENABLED liga sozinha: com chave, análise semântica; sem chave,
 * o produto segue determinístico e a interface marca as categorias afetadas como
 * "parcialmente interpretado". Ausência de credencial não é erro — é um modo.
 */
const CACHE = memoryCache();

function analyzer(): SemanticAnalyzer | null {
  const apiKey = process.env['AI_API_KEY'];
  const model = process.env['AI_MODEL'] ?? 'anthropic/claude-sonnet-4-20250514';
  if (apiKey) {
    const opts = { apiKey, model, ...(process.env['AI_BASE_URL'] ? { baseUrl: process.env['AI_BASE_URL'] } : {}) };
    return createAnalyzer(createHarnessInterpreter(opts), { model, cache: CACHE });
  }
  // Modo de desenvolvimento explícito, para exercitar o caminho sem gastar.
  if (process.env['AI_FAKE'] === '1') {
    return createAnalyzer(createFakeInterpreter(), { model: 'fake', cache: CACHE });
  }
  return null;
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

  // ---- Análise semântica. Falhar aqui NÃO perde o scan: o relatório sai
  // parcial, com confiança reduzida, porque os slots interpretativos têm
  // variante neutra (docs/arquitetura.md §6.1).
  let signals: ReadonlyMap<string, Signal> = new Map();
  const ai = analyzer();
  if (ai) {
    try {
      const out = await ai.interpret(facts.value);
      signals = new Map(out.signals.map((s) => [s.code, s]));
      evaluation.narrative = out.profileNarrative;
      evaluation.interpreterVersion = out.interpreterVersion;
      emit(id, {
        type: 'semantic.completed',
        signalsCount: out.signals.length,
        degraded: out.degraded > 0,
        cacheHits: out.usage.cacheHits,
      });
      if (out.degraded > 0) {
        emit(id, { type: 'scan.degraded', stage: 'semântica', reason: `${out.degraded} interpretação(ões) não concluída(s)` });
      }
    } catch {
      emit(id, { type: 'scan.degraded', stage: 'semântica', reason: 'análise indisponível' });
    }
  } else {
    emit(id, { type: 'scan.degraded', stage: 'semântica', reason: 'sem credencial de modelo — avaliação determinística' });
  }

  const breakdown = score(facts.value, rubricV1, evaluation.persona, signals);
  emit(id, { type: 'scoring.completed', overall: breakdown.overall, persona: evaluation.persona });

  evaluation.facts = facts.value;
  evaluation.score = breakdown;
  evaluation.recommendations = recommend(facts.value, rubricV1, evaluation.persona, breakdown, signals);
  evaluation.signals = [...signals.values()];
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
