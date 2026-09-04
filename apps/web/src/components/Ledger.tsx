'use client';

import { Alert, AlertDescription, Badge, Collapsible, CollapsibleContent } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useState } from 'react';
import { BalanceBar, type Segment } from './BalanceBar';
import { Figure } from './Figure';

interface Contribution {
  kind: string;
  label: string;
  points: number;
  confidence: string;
}
interface Cap {
  capId: string;
  ceiling: number;
  valueBefore: number;
  delta: number;
  binding: boolean;
  reason: string;
  releasedBy: string[];
}
export interface CategoryRow {
  category: string;
  label: string;
  score: number;
  weight: number;
  contributions: Contribution[];
  caps: Cap[];
  confidenceMix: { high: number; medium: number; low: number };
  slotsNotAssessed: { slotId: string; reason: string }[];
}

function segmentsFor(row: CategoryRow): Segment[] {
  const earned = row.contributions.filter((c) => c.kind === 'earned');
  const forgone = row.contributions.filter((c) => c.kind === 'forgone');
  const bonus = row.contributions.filter((c) => c.kind === 'bonus');
  const penalty = row.contributions.filter((c) => c.kind === 'penalty');
  const binding = row.caps.find((c) => c.binding);
  const segs: Segment[] = [
    ...earned.map((c) => ({ kind: 'earned' as const, points: c.points, label: c.label })),
    ...bonus.map((c) => ({ kind: 'bonus' as const, points: c.points, label: c.label })),
  ];
  if (binding) segs.push({ kind: 'capped', points: Math.abs(binding.delta), label: binding.reason });
  segs.push(
    ...penalty.map((c) => ({ kind: 'penalty' as const, points: Math.abs(c.points), label: c.label })),
    ...forgone.map((c) => ({ kind: 'forgone' as const, points: Math.abs(c.points), label: c.label })),
  );
  return segs;
}

export function Ledger({ rows, animate = true }: { rows: CategoryRow[]; animate?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="rule-t">
      {rows.map((row) => {
        const isOpen = open === row.category;
        const interpreted = row.confidenceMix.low > 0.3;
        return (
          <div key={row.category} className="rule-b">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : row.category)}
              aria-expanded={isOpen}
              className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 py-4 text-left sm:grid-cols-[18rem_1fr_auto]"
            >
              <span className="flex items-baseline gap-2">
                <span className="text-[0.9375rem] font-medium">{row.label}</span>
                <span className="figure text-[0.6875rem] text-ink-faint">peso {row.weight}</span>
                {interpreted && (
                  <Badge variant="outline" className="text-[0.625rem] uppercase tracking-wide text-warn">
                    interpretado
                  </Badge>
                )}
              </span>
              <span className="order-3 col-span-2 sm:order-none sm:col-span-1">
                <BalanceBar segments={segmentsFor(row)} height="h-6" animate={animate} />
              </span>
              <span className="text-right">
                <Figure value={row.score} className="text-2xl font-medium tabular-nums" />
              </span>
            </button>

            <Collapsible open={isOpen}>
              <CollapsibleContent className="pb-6 pl-0 sm:pl-1">
                <p className="mb-3 text-[0.8125rem] text-ink-soft">
                  Adquiriu <Figure value={row.contributions.filter((c) => c.kind === 'earned').reduce((a, c) => a + c.points, 0)} decimals={1} />{' '}
                  de 100 disponíveis.
                </p>
                <dl className="figure space-y-0 text-[0.8125rem]">
                  {row.contributions.map((c, i) => (
                    <div
                      key={`${c.label}-${i}`}
                      className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 border-b border-rule py-1.5 last:border-0"
                    >
                      <dt
                        className={cn(
                          'text-right',
                          c.points >= 0 ? 'text-credit' : 'text-debit',
                          c.kind === 'bonus' && 'text-warn',
                        )}
                      >
                        <Figure value={c.points} decimals={1} sign />
                      </dt>
                      <dd className="font-sans text-ink-soft">{c.label}</dd>
                    </div>
                  ))}
                </dl>

                {row.caps.map((cap) => (
                  <Alert key={cap.capId} variant={cap.binding ? 'destructive' : 'default'} className="mt-4">
                    <AlertDescription className="text-[0.8125rem]">
                      {cap.binding ? (
                        <span>
                          <strong className="font-medium">
                            Seria <Figure value={cap.valueBefore} decimals={0} />. Está limitada a{' '}
                            <Figure value={cap.ceiling} />.
                          </strong>{' '}
                          {cap.reason} Corrigir isso libera <Figure value={Math.abs(cap.delta)} decimals={0} /> pontos.
                        </span>
                      ) : (
                        <span className="text-ink-soft">
                          <span className="text-ink-faint">Teto também ativo, não limitante no momento —</span>{' '}
                          {cap.reason}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}

                {row.slotsNotAssessed.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[0.75rem] text-ink-faint">
                    {row.slotsNotAssessed.slice(0, 4).map((s, i) => (
                      <li key={`${s.slotId}-${i}`}>Não avaliado — {s.reason}</li>
                    ))}
                  </ul>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}
