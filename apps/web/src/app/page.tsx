import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ScanForm } from '@/components/ScanForm';
import { BalanceBar } from '@/components/BalanceBar';
import { Figure } from '@/components/Figure';

/** Medições reais do perfil de calibração, 2026-09-04. Nada aqui é ilustrativo. */
const EXCERPT = [
  { points: 28.8, label: 'Sem credenciais versionadas — em 7 de 8 repositórios' },
  { points: -1.2, label: 'Sem credenciais versionadas — falta em landing' },
  { points: 19.0, label: 'Sem artefatos de build versionados — em 5 de 8' },
  { points: -6.0, label: 'Sem artefatos de build versionados — falta em 3' },
  { points: 12.8, label: '`.gitignore` presente — em 7 de 8 repositórios' },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-(--container-sheet) px-5 py-14 sm:py-20">
      <header className="mb-14 flex items-baseline justify-between gap-4">
        <p className="figure text-[0.8125rem] uppercase tracking-[0.1em] text-ink-soft">
          Profile Auditor
        </p>
        <p className="figure text-[0.75rem] text-ink-faint">rubrica v1.0.0</p>
      </header>

      <section className="grid gap-14 lg:grid-cols-[1fr_26rem] lg:gap-16">
        <div>
          <h1 className="max-w-[18ch] text-display font-semibold tracking-[-0.02em]">
            Veja o que seu GitHub diz sobre você antes que um engenheiro veja.
          </h1>

          <p className="mt-6 max-w-(--container-prose) text-lede text-ink-soft">
            Uma auditoria técnica de portfólio. Não conta commits nem stars — mede como seu
            trabalho está apresentado, que sinais de engenharia ele transmite e o que corrigir
            primeiro. Cada ponto tem evidência com arquivo e linha.
          </p>

          <div className="mt-9 max-w-(--container-prose)">
            <ScanForm />
          </div>

          <p className="mt-4 text-[0.8125rem] text-ink-faint">
            Perfil público. A auditoria leva de 5 a 20 segundos.
          </p>
        </div>

        {/* O herói não é um slogan sobre gradiente: é um pedaço do próprio artefato. */}
        <aside>
          <Card>
          <CardHeader>
            <p className="text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
              Trecho de uma auditoria real
            </p>
            <CardTitle className="mt-3 flex items-baseline justify-between">
              <span className="text-[0.9375rem] font-medium">Professional Hygiene</span>
              <Figure value={25} className="text-3xl font-medium" />
            </CardTitle>
          </CardHeader>
          <CardContent>
          <div>
            <BalanceBar
              segments={[
                { kind: 'earned', points: 28.8, label: 'adquirido' },
                { kind: 'capped', points: 60.6, label: 'destravável' },
                { kind: 'forgone', points: 10.6, label: 'perdido' },
              ]}
              height="h-6"
              animate={false}
            />
          </div>
          <dl className="figure mt-4 space-y-0 text-[0.75rem]">
            {EXCERPT.map((l) => (
              <div key={l.label} className="grid grid-cols-[3.5rem_1fr] gap-3 border-b border-rule/50 py-1.5 last:border-0">
                <dt className={l.points >= 0 ? 'text-right text-credit' : 'text-right text-debit'}>
                  <Figure value={l.points} decimals={1} sign />
                </dt>
                <dd className="font-sans text-ink-soft">{l.label}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 rounded-xs bg-debit-soft px-3 py-2 text-[0.75rem]">
            <strong className="font-medium">Seria 86. Está limitada a 25</strong> porque um arquivo
            com nome de credencial está versionado. Corrigir libera 61 pontos.
          </p>
          </CardContent>
          </Card>
        </aside>
      </section>

      <section className="mt-24 rule-t pt-10">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <p className="figure text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
              O que motiva
            </p>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              A API do GitHub responde <span className="figure">health_percentage: 100</span> para um
              repositório cujos 5 READMEs fixados não têm nenhuma imagem, que não publicou release e
              que não tem licença reconhecível. A métrica oficial diz que está tudo certo.
            </p>
          </div>
          <div>
            <p className="figure text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
              Como a nota funciona
            </p>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              Um modelo de linguagem nunca produz o número. Ele interpreta — clareza de README,
              coerência de portfólio — e devolve uma classificação. Pesos, tetos e penalidades
              pertencem a um motor determinístico que você pode auditar linha a linha.
            </p>
          </div>
          <div>
            <p className="figure text-[0.75rem] uppercase tracking-[0.08em] text-ink-faint">
              O que não medimos
            </p>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              Gráfico de contribuição, streak e ausência de stars não entram na conta. Punir quem
              trabalha em repositório privado de empregador — a maioria dos sêniores — seria medir a
              coisa errada.
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-20 rule-t pt-6 text-[0.75rem] text-ink-faint">
        <p>
          Esta nota mede o GitHub como artefato profissional, não capacidade de engenharia. São
          afirmações diferentes.
        </p>
      </footer>
    </main>
  );
}
