import { err, ok, type Result } from '@audit/kernel';
import type { CollectError } from './errors';

const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

/**
 * Função pura, com arquivo de teste próprio. Aceita URL completa ou username, e
 * trata `www.`, barra final, `?tab=repositories` e URL de repositório colada no
 * lugar de perfil.
 */
export function normalizeProfileInput(input: string): Result<string, CollectError> {
  const raw = input.trim();
  if (!raw) return err({ kind: 'invalid_url', input });

  let candidate = raw;
  if (/^(https?:\/\/)?(www\.)?github\.com\//i.test(raw)) {
    const withoutScheme = raw.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
    candidate = withoutScheme.split(/[/?#]/)[0] ?? '';
  } else if (raw.includes('/')) {
    candidate = raw.split('/')[0] ?? '';
  }
  candidate = candidate.replace(/^@/, '').trim();

  if (!candidate || !LOGIN.test(candidate)) return err({ kind: 'invalid_url', input });
  return ok(candidate);
}
