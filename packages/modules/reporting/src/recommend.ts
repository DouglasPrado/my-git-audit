import type { Facts, Finding, Recommendation, Signal } from '@audit/contracts';
import { makeRecommendation, subjectKey } from '@audit/contracts';
import type { PersonaId, Rubric, ScoreBreakdown } from '@audit/scoring';
import { overrideKey, score } from '@audit/scoring';
import { RECOMMENDATION_COPY } from './catalog';

const EFFORT_COST = { S: 1, M: 3, L: 8 } as const;

export interface RecommendationSet {
  all: Recommendation[];
  quickWins: Recommendation[];
  highestImpact: Recommendation[];
  strategic: Recommendation[];
  /** Contrafactual CONJUNTO das três primeiras. Ganhos não são aditivos. */
  topThreeTogether: { from: number; to: number; delta: number; titles: string[] } | null;
}

function subjectLabel(f: Finding): string {
  return f.subject.kind === 'repo' ? `\`${f.subject.name}\`` : 'seu perfil';
}

export function recommend(
  facts: Facts,
  rubric: Rubric,
  personaId: PersonaId,
  current: ScoreBreakdown,
  signals: ReadonlyMap<string, Signal> = new Map(),
): RecommendationSet {
  const candidates = current.findings
    .filter((f) => f.grade < 0.8 && f.applicable && f.slotId !== null)
    .filter((f) => RECOMMENDATION_COPY[f.ruleCode]);

  /**
   * Um cap só é liberado quando TODOS os achados que o sustentam são corrigidos.
   * Consertar o `.env` de um repositório não destrava nada se outro também tem um.
   */
  const capsReleasedBy = (f: Finding, alsoFixed: Finding[] = []): Set<string> => {
    const released = new Set<string>();
    const fixed = new Set([f.id, ...alsoFixed.map((x) => x.id)]);
    for (const cap of rubric.caps) {
      if (!cap.releasedBy.includes(f.ruleCode)) continue;
      const holdingItUp = current.findings.filter(
        (x) => cap.releasedBy.includes(x.ruleCode) && x.grade < 0.8 && x.applicable,
      );
      if (holdingItUp.length > 0 && holdingItUp.every((x) => fixed.has(x.id))) released.add(cap.id);
    }
    return released;
  };

  const scored = candidates.map((f) => {
    const copy = RECOMMENDATION_COPY[f.ruleCode]!;
    const key = overrideKey(f.slotId!, subjectKey(f.subject));
    // Ganho CALCULADO: reexecuta o motor puro com a nota elevada à próxima faixa.
    const after = score(facts, rubric, personaId, signals, new Map([[key, copy.nextGrade]]), capsReleasedBy(f));
    return {
      finding: f,
      copy,
      key,
      overallDelta: Math.round((after.overall - current.overall) * 10) / 10,
      categoryAfter: after.categories[f.category].score,
    };
  });

  const ranked = scored
    .filter((s) => s.overallDelta > 0)
    .map((s) => ({
      ...s,
      priority:
        (s.overallDelta * (s.finding.confidence === 'high' ? 1 : s.finding.confidence === 'medium' ? 0.75 : 0.5)) /
        EFFORT_COST[s.copy.effort],
    }))
    .sort((a, b) => b.priority - a.priority || a.finding.ruleCode.localeCompare(b.finding.ruleCode));

  const all = ranked.map((s) =>
    makeRecommendation({
      fromFindingIds: [s.finding.id],
      title: s.copy.title,
      action: s.copy.action(subjectLabel(s.finding)),
      category: s.finding.category,
      subject: s.finding.subject,
      estimatedGain: {
        categoryBefore: current.categories[s.finding.category].score,
        categoryAfter: s.categoryAfter,
        overallDelta: s.overallDelta,
      },
      effort: s.copy.effort,
      evidenceIds: s.finding.evidenceIds,
    }),
  );

  const topThree = ranked.slice(0, 3);
  const together =
    topThree.length >= 2
      ? (() => {
          const combined = new Map(topThree.map((s) => [s.key, s.copy.nextGrade]));
          const findings = topThree.map((s) => s.finding);
          const releasedTogether = new Set(findings.flatMap((f) => [...capsReleasedBy(f, findings)]));
          const after = score(facts, rubric, personaId, signals, combined, releasedTogether);
          return {
            from: current.overall,
            to: after.overall,
            delta: Math.round((after.overall - current.overall) * 10) / 10,
            titles: topThree.map((s) => s.copy.title),
          };
        })()
      : null;

  return {
    all,
    quickWins: all.filter((r) => r.effort === 'S').slice(0, 6),
    highestImpact: [...all].sort((a, b) => b.estimatedGain.overallDelta - a.estimatedGain.overallDelta).slice(0, 6),
    strategic: all.filter((r) => r.effort === 'L').slice(0, 5),
    topThreeTogether: together,
  };
}
