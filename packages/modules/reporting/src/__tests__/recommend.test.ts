import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Facts } from '@audit/contracts';
import { rubricV1, score } from '@audit/scoring';
import { recommend } from '../recommend';

const facts = JSON.parse(
  readFileSync(
    new URL('../../../scoring/src/__tests__/fixtures/example-profile.json', import.meta.url),
    'utf8',
  ),
) as Facts;

const current = score(facts, rubricV1, 'senior-engineer');
const recs = recommend(facts, rubricV1, 'senior-engineer', current);

describe('recomendações', () => {
  it('não inventa recomendação: toda uma deriva de um achado', () => {
    expect(recs.all.length).toBeGreaterThan(0);
    for (const r of recs.all) expect(r.fromFindingIds.length, r.title).toBeGreaterThan(0);
  });

  it('calcula o ganho reexecutando o motor, e nunca propõe ganho nulo', () => {
    for (const r of recs.all) expect(r.estimatedGain.overallDelta, r.title).toBeGreaterThan(0);
  });

  it('coloca no topo a ação que destrava um teto', () => {
    // O `.env.local` de um repositório corta Hygiene a 25. Se o contrafactual não
    // souber liberar o cap, a maior alavanca do produto some da lista.
    expect(recs.highestImpact[0]?.title).toBe('Verificar arquivo de credencial');
  });

  it('mostra o ganho CONJUNTO, que é menor que a soma das partes', () => {
    const t = recs.topThreeTogether;
    expect(t).not.toBeNull();
    const soma = recs.highestImpact.slice(0, 3).reduce((a, r) => a + r.estimatedGain.overallDelta, 0);
    expect(t!.delta).toBeLessThan(soma);
    expect(t!.to).toBeGreaterThan(t!.from);
  });

  it('separa ganhos rápidos de mudanças estruturais', () => {
    for (const r of recs.quickWins) expect(r.effort).toBe('S');
    for (const r of recs.strategic) expect(r.effort).toBe('L');
  });

  it('é determinístico', () => {
    const again = recommend(facts, rubricV1, 'senior-engineer', current);
    expect(again.all.map((r) => r.id)).toEqual(recs.all.map((r) => r.id));
  });
});
