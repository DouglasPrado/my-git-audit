import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '@audit/contracts';
import { rubricV1, validateRubric } from '../rubric/index';

describe('rubrica v1.0.0', () => {
  it('não viola nenhuma invariante de validação', () => {
    expect(validateRubric(rubricV1)).toEqual([]);
  });

  it('soma 100 em peso de slot por categoria', () => {
    for (const c of CATEGORIES) {
      const total = rubricV1.slots.filter((s) => s.category === c).reduce((a, s) => a + s.weight, 0);
      expect(total, `categoria ${c}`).toBe(100);
    }
  });

  it('mantém o denominador idêntico para todo tipo de projeto', () => {
    // Estrutural: o peso mora no slot, não na variante. Não há o que encolher.
    for (const c of CATEGORIES) {
      const own = rubricV1.slots.filter((s) => s.category === c);
      const distinct = new Set(own.map((s) => s.weight)).size;
      expect(distinct).toBeGreaterThan(0);
      expect(own.every((s) => typeof s.weight === 'number' && s.weight > 0)).toBe(true);
    }
  });

  it('mantém peso interpretativo abaixo de 40% em toda categoria', () => {
    for (const c of CATEGORIES) {
      const llm = rubricV1.slots.filter((s) => s.category === c && s.interpretive).reduce((a, s) => a + s.weight, 0);
      expect(llm, `categoria ${c}`).toBeLessThanOrEqual(40);
    }
  });

  it('tem 6 personas somando 100, nenhuma com peso abaixo de 4', () => {
    expect(rubricV1.personas).toHaveLength(6);
    for (const p of rubricV1.personas) {
      const total = CATEGORIES.reduce((a, c) => a + p.weights[c], 0);
      expect(total, p.id).toBe(100);
      expect(Math.min(...CATEGORIES.map((c) => p.weights[c])), p.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('libera todo cap por ao menos uma regra existente', () => {
    for (const cap of rubricV1.caps) {
      expect(cap.releasedBy.length, cap.id).toBeGreaterThan(0);
      for (const code of cap.releasedBy) {
        // REPO_MATERIALITY é regra meta: vive no coletor, não no registry de graders.
        if (code === 'REPO_MATERIALITY') continue;
        expect(rubricV1.graders[code], `${cap.id} → ${code}`).toBeTypeOf('function');
      }
    }
  });

  it('termina todo slot com uma variante `always`', () => {
    for (const s of rubricV1.slots) {
      expect(s.variants[s.variants.length - 1]?.when, s.id).toBe('always');
    }
  });
});
