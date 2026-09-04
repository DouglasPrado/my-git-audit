import type { TreeEntry } from '@audit/contracts';

const DOC_EXTS = ['', '.md', '.markdown', '.mdown', '.mkdn', '.rst', '.txt', '.adoc', '.org'] as const;

const extOf = (name: string): string => {
  const i = name.lastIndexOf('.');
  return i <= 0 ? '' : name.slice(i).toLowerCase();
};

export const isReadmeName = (n: string): boolean =>
  DOC_EXTS.some((ext) => n.toLowerCase() === `readme${ext}`);

/**
 * A armadilha mais grave do catálogo, resolvida.
 *
 * Consultar o caminho fixo `HEAD:README.md` retorna null para `README.MD`, que é
 * comum — no perfil de calibração, 2 dos 6 repositórios fixados usam maiúsculas,
 * incluindo o repositório de perfil. Um coletor ingênuo emitiria README_MISSING
 * no repositório principal.
 *
 * Precedência do próprio GitHub: raiz > .github/ > docs/. Desempate determinístico.
 * O CASO EXATO é preservado, porque é ele que faz o permalink resolver.
 */
export function resolveReadme(
  root: readonly TreeEntry[],
  dotGithub: readonly TreeEntry[] = [],
  docs: readonly TreeEntry[] = [],
): { path: string; dir: '' | '.github/' | 'docs/' } | null {
  const candidates = [
    ...root.map((e) => ({ e, rank: 0, dir: '' as const })),
    ...dotGithub.map((e) => ({ e, rank: 1, dir: '.github/' as const })),
    ...docs.map((e) => ({ e, rank: 2, dir: 'docs/' as const })),
  ].filter(({ e }) => e.type === 'blob' && isReadmeName(e.name));

  candidates.sort(
    (a, b) =>
      a.rank - b.rank ||
      DOC_EXTS.indexOf(extOf(a.e.name) as (typeof DOC_EXTS)[number]) -
        DOC_EXTS.indexOf(extOf(b.e.name) as (typeof DOC_EXTS)[number]) ||
      a.e.name.localeCompare(b.e.name, 'en'),
  );

  const first = candidates[0];
  return first ? { path: `${first.dir}${first.e.name}`, dir: first.dir } : null;
}

/** Mesma regra, para qualquer documento: nunca caminho fixo, sempre a árvore. */
export function resolveDoc(root: readonly TreeEntry[], ...bases: string[]): string | null {
  const wanted = bases.flatMap((b) => DOC_EXTS.map((e) => `${b}${e}`.toLowerCase()));
  const hit = root.find((e) => e.type === 'blob' && wanted.includes(e.name.toLowerCase()));
  return hit ? hit.name : null;
}
