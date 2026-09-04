import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../canonical';
import { all, err, ok, unwrapOr } from '../result';

describe('JSON canônico', () => {
  it('não depende da ordem de inserção das chaves', () => {
    // É o que torna rawScanHash e factsHash estáveis — e, portanto, o que faz a
    // definição de reprodutibilidade da rubrica §10 ser verdadeira.
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it('ordena em profundidade, inclusive dentro de arrays', () => {
    expect(canonicalJson({ x: [{ z: 1, y: 2 }] })).toBe('{"x":[{"y":2,"z":1}]}');
  });

  it('preserva a ordem do array, que é informação', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });
});

describe('Result', () => {
  it('propaga o primeiro erro em `all`', () => {
    expect(all([ok(1), err('x'), err('y')])).toEqual({ ok: false, error: 'x' });
  });

  it('coleta os valores quando tudo dá certo', () => {
    expect(all([ok(1), ok(2)])).toEqual({ ok: true, value: [1, 2] });
  });

  it('cai no fallback em caso de erro', () => {
    expect(unwrapOr(err('x') as never, 9)).toBe(9);
  });
});
