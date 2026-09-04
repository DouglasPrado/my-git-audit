'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface Segment {
  kind: 'earned' | 'forgone' | 'bonus' | 'penalty' | 'capped';
  points: number;
  label: string;
}

/**
 * O elemento-assinatura, e a única coisa aqui que nenhuma biblioteca tem: cem
 * unidades que FECHAM. Adquirido preenchido, perdido vazado em hachura, e o que
 * o cap destruiu riscado. Não é barra de progresso — é o balanço, desenhado.
 * `adquirido + perdido = 100` é identidade contábil, e a barra existe para mostrá-la.
 */
export function BalanceBar({
  segments,
  height = 'h-7',
  animate = true,
}: {
  segments: Segment[];
  height?: string;
  animate?: boolean;
}) {
  const total = segments.reduce((a, s) => a + Math.abs(s.points), 0) || 100;
  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn('flex w-full overflow-hidden rounded-xs bg-muted', height)}>
        {segments.map((s, i) => (
          <Tooltip key={`${s.kind}-${i}`}>
            <TooltipTrigger asChild>
              <div
                style={{ width: `${(Math.abs(s.points) / total) * 100}%`, animationDelay: animate ? `${i * 45}ms` : undefined }}
                className={cn(
                  'relative',
                  animate && 'bar-grow',
                  s.kind === 'earned' && 'bg-credit',
                  s.kind === 'forgone' && 'hatch',
                  // Branco, não âmbar: o bônus precisa MESMO se separar do
                  // adquirido, mas âmbar é a cor de cuidado desta tela — é o
                  // marcador de "parcialmente interpretado", a dois centímetros
                  // daqui. Bônus não é cuidado. Branco é mais claro que a menta,
                  // separa igual, e não empresta significado de outra coisa.
                  s.kind === 'bonus' && 'bg-bonus',
                  s.kind === 'penalty' && 'bg-debit',
                  s.kind === 'capped' && 'bg-debit-soft',
                )}
              >
                {s.kind === 'capped' && (
                  <span aria-hidden className="absolute inset-0 flex items-center">
                    <span className="h-px w-full bg-debit" />
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <span className="figure">
                {s.points > 0 ? '+' : '−'}
                {Math.abs(s.points).toFixed(1)}
              </span>{' '}
              {s.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
