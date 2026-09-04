import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { cn } from '@/lib/cn';
import { Figure } from './Figure';

interface RepoScore {
  name: string;
  projectType: string;
  score: number;
  band: 'Strong' | 'Solid' | 'Thin';
}

/**
 * Faixa é conceito do domínio, não variante genérica de UI: um utilitário
 * pequeno e excelente vale `Thin` sem que isso signifique "ruim". Por isso a cor
 * vem dos tokens do razão, e não da paleta de status da biblioteca.
 */
const BAND_TONE = {
  Strong: 'border-credit/40 text-credit',
  Solid: 'border-rule-strong text-ink-soft',
  Thin: 'border-rule text-ink-faint',
} as const;

export function RepoTable({
  repos,
  excluded,
}: {
  repos: RepoScore[];
  excluded: { name: string; reason: string }[];
}) {
  return (
    <section className="mt-16">
      <h2 className="text-[0.75rem] uppercase tracking-[0.1em] text-ink-faint">Repositórios</h2>
      <Table className="mt-3">
        <TableHeader>
          <TableRow>
            <TableHead>Repositório</TableHead>
            <TableHead>Tipo detectado</TableHead>
            <TableHead className="text-right">Leitura</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...repos]
            .sort((a, b) => b.score - a.score)
            .map((r) => (
              <TableRow key={r.name}>
                <TableCell className="figure">{r.name}</TableCell>
                {/* O tipo detectado anda SEMPRE junto da nota: sem ele, um utilitário
                    pequeno e excelente parece um projeto ruim. */}
                <TableCell className="text-ink-faint">{r.projectType}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={cn('font-normal', BAND_TONE[r.band])}>
                    {r.band}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {excluded.length > 0 && (
        <p className="mt-3 text-[0.75rem] text-ink-faint">
          <Figure value={excluded.length} /> repositórios ficaram de fora por serem vazios ou pequenos
          demais para avaliar. Não foram pontuados — foram excluídos.
        </p>
      )}
    </section>
  );
}
