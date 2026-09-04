'use client';

import { cn } from '@/lib/cn';
import { Figure } from './Figure';

const LABEL: Record<string, string> = {
  general: 'Engenheiro',
  recruiter: 'Recrutador',
  'senior-engineer': 'Sênior',
  'staff-engineer': 'Staff',
  'oss-maintainer': 'Mantenedor OSS',
  freelancer: 'Freelancer',
};

/**
 * O risco deliberado desta interface: mostrar as SEIS leituras ao mesmo tempo,
 * em vez de esconder atrás de um seletor. Sai de graça — as notas de categoria
 * são invariantes entre personas — e é o insight mais útil do relatório:
 * a mesma pessoa vale 63 para um recrutador e 53 para um mantenedor de OSS,
 * e dá para ver por quê.
 */
export function PersonaReadings({
  readings,
  current,
  onSelect,
}: {
  readings: Record<string, number>;
  current: string;
  onSelect: (id: string) => void;
}) {
  const entries = Object.entries(readings).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, v]) => v));
  const min = Math.min(...entries.map(([, v]) => v));

  return (
    <section className="mt-10">
      <h2 className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
        A mesma auditoria, lida por seis públicos
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] bg-rule sm:grid-cols-3 lg:grid-cols-6">
        {entries.map(([id, value]) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-pressed={id === current}
            className={cn(
              'flex flex-col items-start gap-1 px-3 py-3 text-left transition-colors',
              id === current ? 'bg-ink text-ink-inverse' : 'bg-paper-raised hover:bg-paper-sunken',
            )}
          >
            <span
              className={cn(
                'text-[0.6875rem] uppercase tracking-[0.06em]',
                id === current ? 'text-ink-inverse/70' : 'text-ink-faint',
              )}
            >
              {LABEL[id] ?? id}
            </span>
            <Figure value={value} decimals={0} className="text-2xl font-medium" />
          </button>
        ))}
      </div>
      <p className="mt-3 text-[0.8125rem] text-ink-soft">
        A diferença entre <Figure value={max} /> e <Figure value={min} /> não é ruído: são os mesmos
        oito números, com pesos diferentes. Trocar de público não refaz a auditoria.
      </p>
    </section>
  );
}
