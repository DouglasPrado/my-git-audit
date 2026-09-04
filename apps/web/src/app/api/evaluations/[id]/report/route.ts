import { NextResponse } from 'next/server';
import { rubricV1, score, type PersonaId } from '@audit/scoring';
import { recommend } from '@audit/reporting';
import { get } from '@/lib/store';
import { PERSONAS } from '@/lib/scan';

export const runtime = 'nodejs';

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const evaluation = get(id);
  // Recurso de outro usuário responde 404, nunca 403: 403 confirmaria que existe.
  if (!evaluation) return NextResponse.json({ message: 'não encontrado' }, { status: 404 });
  if (evaluation.status === 'failed') return NextResponse.json({ error: evaluation.error }, { status: 422 });
  if (evaluation.status !== 'completed' || !evaluation.score || !evaluation.facts) {
    return NextResponse.json({ status: evaluation.status }, { status: 202 });
  }

  // Trocar de persona NÃO refaz o scan: as categorias são invariantes, então é
  // recombinação linear sobre fatos já coletados.
  const url = new URL(request.url);
  const asked = url.searchParams.get('persona');
  const persona: PersonaId = PERSONAS.includes(asked as PersonaId) ? (asked as PersonaId) : evaluation.persona;

  const breakdown = persona === evaluation.persona ? evaluation.score : score(evaluation.facts, rubricV1, persona);
  const recs =
    persona === evaluation.persona && evaluation.recommendations
      ? evaluation.recommendations
      : recommend(evaluation.facts, rubricV1, persona, breakdown);

  return NextResponse.json({
    id: evaluation.id,
    login: evaluation.subjectLogin,
    profile: {
      name: evaluation.facts.profile.name,
      bio: evaluation.facts.profile.bio,
      followers: evaluation.facts.profile.followers,
      totalRepos: evaluation.facts.portfolio.totalOwnRepos,
    },
    scanAt: evaluation.facts.scanAt,
    score: breakdown,
    recommendations: recs,
  });
}
