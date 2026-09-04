import { canonicalJson } from '@audit/kernel';
import { createHash } from 'node:crypto';

/**
 * Cache por hash do CONTEÚDO enviado.
 *
 * É boa parte do que faz "reproduzível" ser verdade operacional e não aspiração
 * (rubrica §9): o mesmo README produz o mesmo sinal para sempre, e um rescan de
 * perfil pouco alterado não paga de novo pelo que não mudou.
 */
export interface InterpretationCache {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown): void;
}

export function inputHash(promptId: string, promptVersion: number, payload: unknown): string {
  return createHash('sha256')
    .update(`${promptId}@${promptVersion}\n${canonicalJson(payload)}`)
    .digest('hex')
    .slice(0, 32);
}

/** Em processo. Substituível por Redis quando ASYNCHRONOUS for ativada. */
export function memoryCache(max = 500): InterpretationCache {
  const map = new Map<string, unknown>();
  return {
    get: (k) => map.get(k),
    set: (k, v) => {
      if (map.size >= max) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
      map.set(k, v);
    },
  };
}
