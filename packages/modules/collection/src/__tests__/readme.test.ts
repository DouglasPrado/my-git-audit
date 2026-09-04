import { describe, expect, it } from 'vitest';
import type { TreeEntry } from '@audit/contracts';
import { isReadmeName, resolveReadme } from '../readme';

const blob = (name: string): TreeEntry => ({ name, type: 'blob' });
const dir = (name: string): TreeEntry => ({ name, type: 'tree' });

describe('resolução de README — a armadilha de maiúsculas', () => {
  it('encontra README.MD em maiúsculas', () => {
    // Caso REAL, medido durante a construção: 2 dos 6 repositórios fixados de um
    // perfil usavam README.MD em maiúsculas, incluindo o repositório de perfil.
    // Consultar `HEAD:README.md` retorna null para os dois.
    expect(resolveReadme([blob('README.MD'), blob('LICENSE')])?.path).toBe('README.MD');
  });

  it('preserva o caso exato, porque é ele que faz o permalink resolver', () => {
    expect(resolveReadme([blob('ReadMe.Markdown')])?.path).toBe('ReadMe.Markdown');
  });

  it('respeita a precedência do GitHub: raiz > .github > docs', () => {
    expect(resolveReadme([blob('README.md')], [blob('README.md')], [blob('README.md')])?.path).toBe('README.md');
    expect(resolveReadme([], [blob('README.md')], [blob('README.md')])?.path).toBe('.github/README.md');
    expect(resolveReadme([], [], [blob('README.rst')])?.path).toBe('docs/README.rst');
  });

  it('prefere .md quando há mais de uma extensão, de forma determinística', () => {
    const r = resolveReadme([blob('README.txt'), blob('README.md'), blob('README.rst')]);
    expect(r?.path).toBe('README.md');
  });

  it('não confunde diretório chamado readme com arquivo', () => {
    expect(resolveReadme([dir('readme')])).toBeNull();
  });

  it('devolve null quando realmente não há README', () => {
    expect(resolveReadme([blob('index.ts'), blob('LICENSE')])).toBeNull();
  });

  it('reconhece as extensões documentais aceitas', () => {
    for (const n of ['README', 'readme.md', 'README.RST', 'Readme.adoc', 'README.org']) {
      expect(isReadmeName(n), n).toBe(true);
    }
    expect(isReadmeName('README_OLD.md')).toBe(false);
  });
});
