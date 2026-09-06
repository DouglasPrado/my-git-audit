/**
 * Marca do produto. Não é logotipo desenhado — é o mínimo que uma barra de
 * navegação precisa para não parecer uma página sem dono: um sinal de acento e
 * o nome, no peso de interface.
 *
 * O quadrado é o único lugar da chapa onde a menta aparece em bloco fora de um
 * CTA. É deliberado: identidade e ação são as duas coisas que a skill autoriza
 * a usar o acento, e a barra tem só a primeira.
 */
export function Wordmark() {
  return (
    <a
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-sm text-[0.9375rem] font-medium tracking-[-0.01em] text-ink"
    >
      <span
        aria-hidden
        className="grid size-5 place-items-center rounded-xs bg-brand shadow-hairline transition-transform duration-(--duration-fast) ease-(--ease-out-soft) group-hover:scale-105"
      >
        <span className="size-1.5 rounded-full bg-brand-ink" />
      </span>
      Profile Auditor
    </a>
  );
}
