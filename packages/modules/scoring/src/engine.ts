import type { CategoryId, Facts, RepositoryFacts, Signal } from '@audit/contracts';
import { CATEGORIES, gradeLabelOf, makeFinding, subjectKey } from '@audit/contracts';
import type { Finding } from '@audit/contracts';
import { invariant } from '@audit/kernel';
import type { GradeResult, GraderContext, PersonaId, Rubric, Slot } from './rubric/types';
import type { CapApplication, CategoryScore, Contribution, RepoScore, ScoreBreakdown } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface SlotOutcome {
  slot: Slot;
  grade: number;
  results: { repo?: RepositoryFacts | undefined; result: GradeResult; ruleCode: string | null }[];
  neutralReason?: string;
}

function resolveVariant(slot: Slot, rubric: Rubric, ctx: GraderContext) {
  for (const v of slot.variants) {
    const pred = rubric.predicates[v.when];
    if (pred && pred(ctx)) return v;
  }
  return slot.variants[slot.variants.length - 1]!;
}

/** Chave de sobreposição: identifica um slot num sujeito específico. */
export const overrideKey = (slotId: string, subject: string) => `${slotId}|${subject}`;

function evaluateSlot(
  slot: Slot,
  rubric: Rubric,
  facts: Facts,
  signals: ReadonlyMap<string, Signal>,
  overrides: ReadonlyMap<string, number>,
): SlotOutcome {
  const run = (repo?: RepositoryFacts) => {
    const ctx: GraderContext = repo ? { facts, repo, signals } : { facts, signals };
    const variant = resolveVariant(slot, rubric, ctx);
    if (variant.body.kind === 'neutral') {
      return {
        repo,
        ruleCode: null,
        result: {
          grade: variant.body.grade,
          label: gradeLabelOf(variant.body.grade),
          confidence: 'medium' as const,
          detail: variant.body.reason,
          evidenceIds: [],
          applicable: false,
          reason: variant.body.reason,
        },
      };
    }
    const grader = rubric.graders[variant.body.ruleCode];
    invariant(grader, `Grader ausente: ${variant.body.ruleCode}`);
    const out = grader(ctx);
    // Contrafactual: o recomendador reexecuta o motor com a nota elevada. Como
    // score() é puro, o ganho é CALCULADO, não estimado a olho.
    const key = overrideKey(slot.id, repo ? subjectKey({ kind: 'repo', owner: repo.owner, name: repo.name }) : subjectKey({ kind: 'profile', login: facts.profile.login }));
    const forced = overrides.get(key);
    return { repo, ruleCode: variant.body.ruleCode, result: forced === undefined ? out : { ...out, grade: forced } };
  };

  if (slot.scope !== 'repo-agg') {
    const one = run();
    return { slot, grade: one.result.grade, results: [one] };
  }

  const repos = facts.repositories;
  if (repos.length === 0) return { slot, grade: 0, results: [], neutralReason: 'nenhum repositório avaliável' };

  const results = repos.map((r) => run(r));
  // Média ponderada por proeminência. Nunca `min` (um repo ruim não derruba o
  // perfil) nem `max` (burlável com um único repositório-vitrine).
  const wsum = repos.reduce((a, r) => a + r.prominence, 0);
  const grade = results.reduce((a, x, i) => a + repos[i]!.prominence * x.result.grade, 0) / wsum;
  return { slot, grade, results };
}


const PASS = 0.8;

/**
 * Rótulo de slot agregado NÃO pode ser o detalhe do primeiro repositório — isso
 * produz linhas contraditórias ("nenhum segredo versionado" ao lado de um cap que
 * acusa segredo). Slot agregado resume; slot de perfil usa o detalhe do grader.
 */
function earnedLabel(o: SlotOutcome): string {
  if (o.slot.scope !== 'repo-agg') return o.results[0]?.result.detail ?? o.slot.label;
  const pass = o.results.filter((x) => x.result.grade >= PASS).length;
  const total = o.results.length;
  if (total === 0) return o.slot.label;
  if (pass === total) return `${o.slot.label} — em todos os ${total} repositórios`;
  return `${o.slot.label} — em ${pass} de ${total} repositórios`;
}

function forgoneLabel(o: SlotOutcome): string {
  if (o.slot.scope !== 'repo-agg') {
    const d = o.results[0]?.result.detail;
    return d ? `${o.slot.label} — ${lowerFirst(d)}` : o.slot.label;
  }
  const failing = o.results.filter((x) => x.result.grade < PASS);
  if (failing.length === 0) return `${o.slot.label} — parcialmente atendido`;
  const names = failing.map((x) => x.repo?.name).filter(Boolean).slice(0, 3).join(', ');
  const extra = failing.length > 3 ? ` e mais ${failing.length - 3}` : '';
  return `${o.slot.label} — falta em ${names}${extra}`;
}

const lowerFirst = (s: string) => (s.length > 1 && s[1] === s[1]?.toLowerCase() ? s[0]!.toLowerCase() + s.slice(1) : s);

export function score(
  facts: Facts,
  rubric: Rubric,
  personaId: PersonaId,
  signals: ReadonlyMap<string, Signal> = new Map(),
  overrides: ReadonlyMap<string, number> = new Map(),
  /**
   * Caps a ignorar. Existe para o contrafactual ser honesto: a condição de cap
   * é um predicado sobre FATOS, então elevar a nota de um achado não a desfaz
   * sozinha. Sem isso o recomendador jamais mostraria a ação de maior impacto
   * do produto — a que destrava um teto.
   */
  suppressCaps: ReadonlySet<string> = new Set(),
): ScoreBreakdown {
  const persona = rubric.personas.find((p) => p.id === personaId);
  invariant(persona, `Persona desconhecida: ${personaId}`);

  const outcomes = rubric.slots.map((s) => evaluateSlot(s, rubric, facts, signals, overrides));
  const findings: Finding[] = [];
  const categories = {} as Record<CategoryId, CategoryScore>;

  for (const category of CATEGORIES) {
    const own = outcomes.filter((o) => o.slot.category === category);
    const contributions: Contribution[] = [];
    const slotsNotAssessed: { slotId: string; reason: string }[] = [];
    let earned = 0;
    let possible = 0;
    let floor = 0;
    const confWeight = { high: 0, medium: 0, low: 0 };

    for (const o of own) {
      // possible += weight INCONDICIONALMENTE. Não há denominador para encolher.
      possible += o.slot.weight;
      if (o.slot.universal) floor += o.slot.weight;
      earned += o.slot.weight * o.grade;

      const worst = o.results.reduce<GradeResult['confidence']>((acc, x) => {
        const rank = { high: 0, medium: 1, low: 2 };
        return rank[x.result.confidence] > rank[acc] ? x.result.confidence : acc;
      }, 'high');
      confWeight[worst] += o.slot.weight;

      if (o.neutralReason) slotsNotAssessed.push({ slotId: o.slot.id, reason: o.neutralReason });
      for (const x of o.results) {
        if (!x.result.applicable && x.result.reason) slotsNotAssessed.push({ slotId: o.slot.id, reason: x.result.reason });
        if (x.ruleCode) {
          findings.push(
            makeFinding({
              ruleCode: x.ruleCode,
              slotId: o.slot.id,
              category,
              subject: x.repo ? { kind: 'repo', owner: x.repo.owner, name: x.repo.name } : o.slot.scope === 'portfolio' ? { kind: 'portfolio', login: facts.profile.login } : { kind: 'profile', login: facts.profile.login },
              grade: r2(x.result.grade),
              gradeLabel: x.result.label,
              polarity: x.result.grade >= 0.8 ? 'positive' : x.result.grade <= 0.35 ? 'negative' : 'neutral',
              severity: x.result.grade <= 0.05 ? 'high' : x.result.grade <= 0.35 ? 'medium' : x.result.grade < 0.8 ? 'low' : 'info',
              title: x.ruleCode,
              detail: x.result.detail,
              applicable: x.result.applicable,
              ...(x.result.reason !== undefined ? { applicabilityReason: x.result.reason } : {}),
              evidenceIds: x.result.evidenceIds,
              signalIds: [],
              confidence: x.result.confidence,
            }),
          );
        }
      }
    }

    const denominator = Math.max(possible, floor);
    const base = denominator === 0 ? 0 : (100 * earned) / denominator;

    for (const o of own) {
      const e = (100 * o.slot.weight * o.grade) / denominator;
      const f = (100 * o.slot.weight * (1 - o.grade)) / denominator;
      const conf = o.results[0]?.result.confidence ?? 'medium';
      const ids = o.results.flatMap((x) => x.result.evidenceIds);
      if (e > 0.005) {
        contributions.push({ kind: 'earned', slotId: o.slot.id, label: earnedLabel(o), points: r2(e), evidenceIds: ids, confidence: conf });
      }
      if (f > 0.005) {
        contributions.push({ kind: 'forgone', slotId: o.slot.id, label: forgoneLabel(o), points: r2(-f), evidenceIds: ids, confidence: conf });
      }
    }

    // Bônus e penalidades vivem FORA da razão: são esparsos e distorceriam o
    // denominador dos 95% de perfis que não os disparam.
    let bonusTotal = 0;
    let penaltyTotal = 0;
    for (const rule of rubric.adjustments.filter((a) => a.category === category)) {
      const fn = rubric.adjusters[rule.code];
      if (!fn) continue;
      const out = fn({ facts, signals });
      if (!out || out.points === 0) continue;
      const pts = Math.min(out.points, rule.max);
      if (rule.kind === 'bonus') {
        bonusTotal += pts;
        contributions.push({ kind: 'bonus', ruleCode: rule.code, label: out.detail, points: r2(pts), evidenceIds: out.evidenceIds, confidence: 'high' });
      } else {
        penaltyTotal += pts;
        contributions.push({ kind: 'penalty', ruleCode: rule.code, label: out.detail, points: r2(-pts), evidenceIds: out.evidenceIds, confidence: 'high' });
      }
    }
    bonusTotal = Math.min(bonusTotal, rubric.bonusCap);
    penaltyTotal = Math.min(penaltyTotal, rubric.penaltyCap);

    const preCap = base + bonusTotal - penaltyTotal;

    // Caps por último, e SÓ sobre categoria — nunca sobre o overall. É o que
    // mantém o overall uma combinação convexa e as personas comparáveis.
    const active = rubric.caps.filter(
      (c) => c.categories.includes(category) && !suppressCaps.has(c.id) && rubric.predicates[c.condition]?.({ facts, signals }),
    );
    const ceiling = active.length > 0 ? Math.min(...active.map((c) => c.ceiling)) : Number.POSITIVE_INFINITY;
    const postCap = Math.min(preCap, ceiling);
    const capApplications: CapApplication[] = active.map((c) => ({
      capId: c.id,
      ceiling: c.ceiling,
      valueBefore: r2(preCap),
      delta: r2(Math.min(0, c.ceiling - preCap)),
      binding: c.ceiling === ceiling && preCap > ceiling,
      reason: c.reason,
      releasedBy: c.releasedBy,
    }));

    const final = clamp(postCap, 0, 100);
    const totalW = confWeight.high + confWeight.medium + confWeight.low || 1;

    categories[category] = {
      category,
      score: r1(final),
      math: {
        earned: r2(earned), possible: r2(possible), floor: r2(floor), denominator: r2(denominator),
        base: r2(base), bonusTotal: r2(bonusTotal), penaltyTotal: r2(penaltyTotal),
        preCap: r2(preCap), postCap: r2(postCap),
      },
      contributions,
      caps: capApplications,
      slotsNotAssessed,
      confidenceMix: { high: r2(confWeight.high / totalW), medium: r2(confWeight.medium / totalW), low: r2(confWeight.low / totalW) },
    };
  }

  const overallFor = (p: (typeof rubric.personas)[number]) =>
    r1(CATEGORIES.reduce((a, c) => a + categories[c].score * p.weights[c], 0) / 100);

  const allPersonaOverall = Object.fromEntries(rubric.personas.map((p) => [p.id, overallFor(p)])) as Record<PersonaId, number>;

  return {
    rubricVersion: rubric.version,
    personaId,
    personaLabel: persona.label,
    weights: persona.weights,
    categories,
    overall: overallFor(persona),
    terms: CATEGORIES.map((c) => ({ category: c, score: categories[c].score, weight: persona.weights[c], weighted: r2((categories[c].score * persona.weights[c]) / 100) })),
    allPersonaOverall,
    repoScores: scoreRepos(facts, rubric, signals),
    findings,
    excluded: facts.excluded,
  };
}

const REPO_CATEGORIES: CategoryId[] = ['PRE', 'ENG', 'OSS', 'MNT', 'HYG', 'DIS'];

function scoreRepos(facts: Facts, rubric: Rubric, signals: ReadonlyMap<string, Signal>): RepoScore[] {
  return facts.repositories.map((repo) => {
    const cats: Partial<Record<CategoryId, number>> = {};
    let weightedSum = 0;
    let weightTotal = 0;
    for (const category of REPO_CATEGORIES) {
      const own = rubric.slots.filter((s) => s.category === category && s.scope === 'repo-agg');
      if (own.length === 0) continue;
      let earned = 0;
      let possible = 0;
      for (const slot of own) {
        possible += slot.weight;
        const ctx: GraderContext = { facts, repo, signals };
        const variant = resolveVariant(slot, rubric, ctx);
        const g = variant.body.kind === 'neutral' ? variant.body.grade : (rubric.graders[variant.body.ruleCode]?.(ctx).grade ?? 0);
        earned += slot.weight * g;
      }
      const v = possible === 0 ? 0 : (100 * earned) / possible;
      cats[category] = r1(v);
      weightedSum += v;
      weightTotal += 1;
    }
    const s = weightTotal === 0 ? 0 : weightedSum / weightTotal;
    return {
      owner: repo.owner,
      name: repo.name,
      projectType: repo.projectType,
      score: r1(s),
      band: s >= 75 ? 'Strong' : s >= 50 ? 'Solid' : 'Thin',
      categories: cats,
    };
  });
}

/** A trilha fecha: Σ earned + Σ |forgone| = 100. Defeito de cálculo, não de apresentação. */
export function assertTrailBalances(cs: CategoryScore): void {
  if (cs.math.denominator !== cs.math.possible) return;
  const sum = cs.contributions
    .filter((c) => c.kind === 'earned' || c.kind === 'forgone')
    .reduce((a, c) => a + Math.abs(c.points), 0);
  invariant(Math.abs(sum - 100) < 0.5, `Trilha não fecha em ${cs.category}: ${sum}`);
}

export const _subjectKey = subjectKey;
