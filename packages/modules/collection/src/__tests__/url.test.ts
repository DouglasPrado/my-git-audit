import { describe, expect, it } from 'vitest';
import { normalizeProfileInput } from '../url';

const login = (s: string) => {
  const r = normalizeProfileInput(s);
  return r.ok ? r.value : `ERRO:${r.error.kind}`;
};

describe('normalização de entrada de perfil', () => {
  it('aceita as formas que uma pessoa realmente cola', () => {
    for (const input of [
      'https://github.com/octo-example',
      'https://github.com/octo-example/',
      'http://www.github.com/octo-example',
      'github.com/octo-example?tab=repositories',
      'https://github.com/octo-example/vault',
      'octo-example',
      '  @octo-example  ',
    ]) {
      expect(login(input), input).toBe('octo-example');
    }
  });

  it('recusa o que não é perfil', () => {
    for (const input of ['', '   ', 'https://gitlab.com/foo', '-inicio-com-hifen', 'nome_com_underscore']) {
      expect(login(input), input).toBe('ERRO:invalid_url');
    }
  });
});
