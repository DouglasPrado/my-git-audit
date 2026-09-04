import { Agent } from '@gba/ai-harness';
import { tmpdir } from 'node:os';
import { err, ok, type Result } from '@audit/kernel';
import type { EvidencePack } from './pack';
import { renderPack } from './pack';
import type { InterpretError, Interpreter } from './port';
import { PROFILE_PROMPT, REPOSITORY_PROMPT, type Prompt } from './prompts';

export interface HarnessOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
}

/**
 * Adaptador do @gba/ai-harness.
 *
 * O harness é a abstração de provedor da casa; o domínio não conhece nem ele
 * (ADR-0009). Aqui usamos só `chat` — sem memória, sem RAG, sem ferramentas:
 * classificação é sem estado, e trazer subsistema que não se usa seria
 * complexidade sem finalidade.
 */
export function createHarnessInterpreter(opts: HarnessOptions): Interpreter {
  const model = opts.model ?? 'anthropic/claude-sonnet-4-20250514';
  const timeoutMs = opts.timeoutMs ?? 45_000;

  const agent = (prompt: Prompt) =>
    Agent.create({
      apiKey: opts.apiKey,
      model,
      ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}),
      systemPrompt: prompt.system,
      // O harness expõe modo determinístico com semente. É o mais perto de
      // reprodutível que se consegue de um modelo, e combina com o cache por
      // hash de conteúdo: mesma evidência, mesma saída.
      deterministic: true,
      seed: 1,
      maxOutputTokens: 700,
      // Memória e RAG do harness não são usados: classificação é sem estado.
      // O caminho aponta para área descartável para o padrão não tentar escrever
      // no diretório de trabalho de um container.
      dbPath: `${tmpdir()}/audit-harness.sqlite`,
    });

  async function call(prompt: Prompt, pack: EvidencePack, abort?: AbortSignal): Promise<Result<unknown, InterpretError>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    abort?.addEventListener('abort', onAbort, { once: true });
    try {
      const text = await agent(prompt).chat(prompt.user(renderPack(pack), Object.keys(pack.aliases)), {
        // Classificação é determinística por contrato. Ver ADR-0004.
        temperature: 0,
        signal: controller.signal,
      });
      const json = extractJson(text);
      if (json === null) return err({ kind: 'invalid_output', detail: 'resposta sem JSON' });
      return ok(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (controller.signal.aborted) return err({ kind: 'timeout' });
      // A mensagem pode conter cabeçalho de requisição; nunca propague inteira.
      return err({ kind: 'provider_error', detail: msg.slice(0, 120) });
    } finally {
      clearTimeout(timer);
      abort?.removeEventListener('abort', onAbort);
    }
  }

  return {
    interpretRepository: (pack, signal) => call(REPOSITORY_PROMPT, pack, signal),
    interpretProfile: (pack, signal) => call(PROFILE_PROMPT, pack, signal),
  };
}

/**
 * O prompt pede JSON puro, mas modelos envolvem em cerca de código com
 * frequência suficiente para valer o desembrulho. Isso é tolerância de FORMATO;
 * conteúdo fora do domínio continua sendo erro, tratado pelo Zod no analisador.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}
