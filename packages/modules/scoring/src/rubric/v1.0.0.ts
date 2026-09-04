import * as graders from '../graders/index';
import { adjusters, adjustmentRules } from './adjustments';
import { capConditions, caps } from './caps';
import { personas } from './personas';
import { predicates } from './predicates';
import { slots } from './slots';
import type { Grader, Rubric } from './types';

/**
 * VERSÃO CONGELADA. Mudar peso, teto, ordem de operação ou faixa exige um arquivo
 * novo — nunca editar este. Ver ADR-0006.
 */
export const rubricV1: Rubric = {
  version: '1.0.0',
  slots,
  caps,
  personas,
  adjustments: adjustmentRules,
  bonusCap: 10,
  penaltyCap: 25,
  graders: Object.fromEntries(
    Object.entries(graders).filter(([k, v]) => /^[A-Z][A-Z0-9_]+$/.test(k) && typeof v === 'function'),
  ) as Record<string, Grader>,
  predicates: { ...predicates, ...capConditions },
  adjusters,
};
