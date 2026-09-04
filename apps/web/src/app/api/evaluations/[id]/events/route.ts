import { get, subscribe } from '@/lib/store';

export const runtime = 'nodejs';

/** SSE: fluxo unidirecional, curto e de baixo volume. Ver ADR-0011. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const evaluation = get(id);
  if (!evaluation) return new Response('não encontrado', { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (e: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* cliente já desconectou */
        }
      };
      // Reconexão sai de graça: os eventos ficam persistidos na avaliação.
      for (const past of evaluation.events) send(past);
      if (evaluation.status === 'completed') { send({ type: 'report.completed' }); controller.close(); return; }
      if (evaluation.status === 'failed') { send({ type: 'scan.failed', ...evaluation.error }); controller.close(); return; }

      const unsubscribe = subscribe(id, (e) => {
        send(e);
        const t = (e as { type?: string }).type;
        if (t === 'report.completed' || t === 'scan.failed') {
          unsubscribe();
          try { controller.close(); } catch { /* já fechado */ }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    },
  });
}
