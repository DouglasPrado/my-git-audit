import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeProfileInput } from '@audit/collection';
import { newId, put } from '@/lib/store';
import { PERSONAS, runScan } from '@/lib/scan';

export const runtime = 'nodejs';

const Body = z
  .object({
    githubUrl: z.string().min(1).max(300),
    persona: z.enum(PERSONAS as [string, ...string[]]).default('general'),
  })
  .strict();

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ kind: 'invalid_url', message: 'Informe um perfil do GitHub.' }, { status: 422 });
  }

  const login = normalizeProfileInput(parsed.data.githubUrl);
  if (!login.ok) {
    return NextResponse.json(
      { kind: 'invalid_url', message: `Não reconheci "${parsed.data.githubUrl}" como um perfil do GitHub.` },
      { status: 422 },
    );
  }

  const id = newId();
  put({
    id,
    subjectLogin: login.value,
    persona: parsed.data.persona as never,
    status: 'queued',
    createdAt: new Date().toISOString(),
    completedAt: null,
    events: [],
    facts: null,
    score: null,
    recommendations: null,
    error: null,
  });

  // Orquestração em processo: a capacidade ASYNCHRONOUS está desligada, então
  // não existe fila. O orquestrador é biblioteca e não sabe quem o chama.
  void runScan(id);

  return NextResponse.json({ evaluationId: id, login: login.value, status: 'queued' }, { status: 202 });
}
