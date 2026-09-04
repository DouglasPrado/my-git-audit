import { Spinner } from '@/components/ui';
import { Figure } from './Figure';
import { Wordmark } from './Wordmark';

export function Progress({ login, lines }: { login: string; lines: string[] }) {
  return (
    <div className="min-h-dvh">
      <header className="rule-b">
        <div className="mx-auto flex max-w-(--container-sheet) items-center justify-between gap-4 px-5 py-4">
          <Wordmark />
          <p className="figure text-[0.75rem] text-ink-faint">rubrica v1.0.0</p>
        </div>
      </header>

      <main className="relative mx-auto max-w-(--container-prose) px-5 py-24">
        <span aria-hidden className="halo -z-10" />
        <p className="figure flex items-center gap-2 text-[0.8125rem] uppercase tracking-[0.1em] text-ink-soft">
          {/* O acento marca o que está VIVO — e nesta tela a única coisa viva é o scan. */}
          <Spinner className="size-4 text-brand" />
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
      </main>
    </div>
  );
}
