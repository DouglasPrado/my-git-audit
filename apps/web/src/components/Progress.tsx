import { Spinner } from '@/components/ui';
import { Figure } from './Figure';

export function Progress({ login, lines }: { login: string; lines: string[] }) {
  return (
    <div className="mx-auto max-w-(--container-prose) px-5 py-24">
      <p className="figure flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.1em] text-ink-soft">
        <Spinner className="size-4" />
        Auditando {login}
      </p>
      <div className="mt-6 rule-t">
        {lines.map((l, i) => (
          <p
            key={`${l}-${i}`}
            className="reveal figure rule-b py-2.5 text-[0.8125rem] text-ink-soft"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            {l}
          </p>
        ))}
      </div>
      <p className="mt-6 text-[0.8125rem] text-ink-faint">
        Coletando perfil, repositórios e evidências. Normalmente leva menos de{' '}
        <Figure value={20} /> segundos.
      </p>
    </div>
  );
}
