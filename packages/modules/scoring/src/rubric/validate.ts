import type { CategoryId } from '@audit/contracts';
import { CATEGORIES } from '@audit/contracts';
import type { Rubric } from './types';

export interface RubricViolation {
  invariant: string;
  detail: string;
}

/**
 * Invariantes de docs/rubric/rubric-v1.md §4.10. Rodam no boot; falha impede o
 * carregamento. Rubrica inválida é pior que rubrica ausente.
 */
export function validateRubric(r: Rubric): RubricViolation[] {
  const v: RubricViolation[] = [];
  const byCat = (c: CategoryId) => r.slots.filter((s) => s.category === c);

  for (const c of CATEGORIES) {
    const ss = byCat(c);
    const total = ss.reduce((a, s) => a + s.weight, 0);
    if (ss.length === 0) {
      v.push({ invariant: '1. Σ peso = 100', detail: `categoria ${c} não tem slot` });
      continue;
    }
    if (total !== 100) v.push({ invariant: '1. Σ peso = 100', detail: `${c} soma ${total}` });

    const llm = ss.filter((s) => s.interpretive).reduce((a, s) => a + s.weight, 0);
    if (llm > 40) v.push({ invariant: '3. peso de LLM ≤ 40%', detail: `${c} tem ${llm}%` });

    const neutral = ss.filter((s) => s.variants.some((x) => x.body.kind === 'neutral')).reduce((a, s) => a + s.weight, 0);
    if (neutral > 25) v.push({ invariant: '4. peso com variante neutra ≤ 25%', detail: `${c} tem ${neutral}%` });
  }

  for (const p of r.personas) {
    const total = CATEGORIES.reduce((a, c) => a + (p.weights[c] ?? 0), 0);
    if (total !== 100) v.push({ invariant: '5. persona soma 100', detail: `${p.id} soma ${total}` });
    const min = Math.min(...CATEGORIES.map((c) => p.weights[c] ?? 0));
    if (min < 4) v.push({ invariant: '5. nenhum peso < 4', detail: `${p.id} tem peso ${min}` });
  }

  // Categoria com peso ≤5 em alguma persona precisa de ao menos 4 slots.
  for (const c of CATEGORIES) {
    const minWeight = Math.min(...r.personas.map((p) => p.weights[c] ?? 0));
    if (minWeight <= 5 && byCat(c).length < 4) {
      v.push({ invariant: '2. categoria de peso ≤5 precisa de ≥4 slots', detail: `${c} tem ${byCat(c).length}` });
    }
  }

  for (const s of r.slots) {
    const last = s.variants[s.variants.length - 1];
    if (!last || last.when !== 'always') {
      v.push({ invariant: '6. última variante é `always`', detail: `slot ${s.id}` });
    }
    for (const variant of s.variants) {
      if (!r.predicates[variant.when]) v.push({ invariant: '6. predicado existe', detail: `${s.id} → ${variant.when}` });
      if (variant.body.kind === 'rule' && !r.graders[variant.body.ruleCode]) {
        v.push({ invariant: '7. grader existe', detail: `${s.id} → ${variant.body.ruleCode}` });
      }
    }
  }

  for (const c of r.caps) {
    if (!r.predicates[c.condition]) v.push({ invariant: '8. condição de cap existe', detail: c.id });
    if (c.releasedBy.length === 0) v.push({ invariant: '9. cap é liberado por alguma regra', detail: c.id });
  }

  for (const a of r.adjustments) {
    if (!r.adjusters[a.code]) v.push({ invariant: '10. ajustador existe', detail: a.code });
  }

  return v;
}
