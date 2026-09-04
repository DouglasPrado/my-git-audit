import { Badge } from '@/components/ui';

const CLAREZA: Record<string, { rotulo: string; tom: string }> = {
  confusa: { rotulo: 'Confusa', tom: 'text-debit' },
  razoavel: { rotulo: 'Razoável', tom: 'text-warn' },
  clara: { rotulo: 'Clara', tom: 'text-credit' },
  inconfundivel: { rotulo: 'Inconfundível', tom: 'text-credit' },
};

export interface Narrative {
  primaryArea: string;
  secondaryAreas: string[];
  identityClarity: string;
  rationale: string;
}

/**
 * O "10 Second Test". Narrativa — NÃO entra na nota.
 *
 * Fica visualmente separado do razão de propósito: o que o modelo diz é
 * interpretação, e misturá-lo com as cifras assinadas sugeriria que ele pesou
 * na conta. Não pesou.
 */
export function TenSecondTest({ narrative }: { narrative: Narrative }) {
  const clareza = CLAREZA[narrative.identityClarity] ?? { rotulo: narrative.identityClarity, tom: 'text-ink-soft' };
  return (
    <section className="mt-10 rounded-xl border border-rule bg-paper-raised p-5 shadow-hairline">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">
          O que este perfil comunica em dez segundos
        </h2>
        <Badge variant="outline" className="font-normal text-ink-faint">
          leitura, não nota
        </Badge>
      </div>

      <p className="mt-4 text-lede font-medium">{narrative.primaryArea}</p>
      {narrative.secondaryAreas.length > 0 && (
        <p className="mt-1 text-[0.9375rem] text-ink-soft">{narrative.secondaryAreas.join(' · ')}</p>
      )}

      <p className="mt-4 text-[0.875rem] text-ink-soft">{narrative.rationale}</p>

      <p className="mt-4 text-[0.8125rem]">
        <span className="text-ink-faint">Clareza de identidade: </span>
        <span className={clareza.tom}>{clareza.rotulo}</span>
      </p>
    </section>
  );
}
