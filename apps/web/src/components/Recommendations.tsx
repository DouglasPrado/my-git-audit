import { cn } from '@/lib/cn';
import { Figure } from './Figure';

interface Rec {
  id: string;
  title: string;
  action: string;
  effort: 'S' | 'M' | 'L';
  estimatedGain: { overallDelta: number };
}

const EFFORT_LABEL = { S: 'minutos', M: 'uma hora', L: 'mais longo' } as const;

export function Recommendations({
  highestImpact,
  quickWins,
  together,
}: {
  highestImpact: Rec[];
  quickWins: Rec[];
  together: { from: number; to: number; delta: number; titles: string[] } | null;
}) {
  const list = (items: Rec[]) => (
    <ol className="rule-t">
      {items.map((r) => (
        <li key={r.id} className="rule-b grid grid-cols-[3.25rem_1fr] items-baseline gap-4 py-3">
          <span className="figure text-right text-[0.9375rem] text-credit">
            <Figure value={r.estimatedGain.overallDelta} decimals={1} sign />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[0.9375rem]">{r.action}</span>
            <span className="text-[0.75rem] text-ink-faint">{EFFORT_LABEL[r.effort]}</span>
          </span>
        </li>
      ))}
    </ol>
  );

  return (
    <section className="mt-16">
      <h2 className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">O que corrigir primeiro</h2>

      {together && (
        <p
          className={cn(
            'mt-4 rounded-[3px] border border-signal/30 bg-signal-soft px-4 py-3 text-[0.9375rem]',
          )}
        >
          Fazendo estas três coisas juntas:{' '}
          <strong className="font-medium">
            <Figure value={together.from} decimals={0} /> → <Figure value={together.to} decimals={0} />
          </strong>
          . <span className="text-ink-soft">Ganhos não somam — tetos e denominador compartilhado
          fazem a conta conjunta ser menor que a soma das partes.</span>
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-[0.8125rem] font-medium">Maior impacto</h3>
          {highestImpact.length > 0 ? list(highestImpact) : <p className="text-[0.875rem] text-ink-faint">Nada relevante a corrigir.</p>}
        </div>
        <div>
          <h3 className="mb-3 text-[0.8125rem] font-medium">Rápido de fazer</h3>
          {quickWins.length > 0 ? list(quickWins) : <p className="text-[0.875rem] text-ink-faint">Nenhuma correção rápida pendente.</p>}
        </div>
      </div>
    </section>
  );
}
