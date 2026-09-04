import { ok, type Result } from '@audit/kernel';
import type { EvidencePack } from './pack';
import type { InterpretError, Interpreter } from './port';

/**
 * Interpretador falso e DETERMINÍSTICO.
 *
 * Todo teste de pontuação usa este — nenhum teste chama modelo. É o que permite
 * arquivo golden do relatório completo, incluindo os slots interpretativos.
 * As classificações derivam de contagens do próprio pacote, então mudam quando
 * a evidência muda, como as de verdade.
 */
export function createFakeInterpreter(): Interpreter {
  const body = (pack: EvidencePack, title: string) =>
    pack.sections.find((s) => s.title.startsWith(title))?.body ?? '';

  return {
    async interpretRepository(pack): Promise<Result<unknown, InterpretError>> {
      const readme = body(pack, 'README');
      const arch = body(pack, 'Documento de arquitetura');
      const commits = body(pack, 'Mensagens de commit');
      const headings = (readme.match(/^#{1,4}\s/gm) ?? []).length;
      const conventional = (commits.match(/^(feat|fix|docs|chore|refactor|test|build|ci)(\(.+?\))?!?:/gim) ?? []).length;
      const linhas = commits.split('\n').filter(Boolean).length || 1;
      return ok({
        structure: headings >= 8 ? 'exemplar' : headings >= 4 ? 'claro' : headings >= 1 ? 'aceitavel' : 'confuso',
        whatAndWhy: readme.length > 400 ? 'claro' : readme.length > 0 ? 'vago' : 'ausente',
        architecture: arch.length > 1200 ? 'fronteiras' : arch.length > 0 ? 'componentes' : 'superficial',
        commitQuality:
          conventional / linhas > 0.8 ? 'exemplar' : conventional / linhas > 0.4 ? 'bom' : conventional > 0 ? 'aceitavel' : 'ruim',
        rationale: 'Classificação determinística de teste, derivada da estrutura do pacote de evidências.',
        evidenceRefs: Object.keys(pack.aliases).slice(0, 2),
      });
    },

    async interpretProfile(pack): Promise<Result<unknown, InterpretError>> {
      const bio = body(pack, 'Bio');
      const readme = body(pack, 'Profile README');
      return ok({
        readmeSubstance: readme.length > 800 ? 'diferenciado' : readme.length > 200 ? 'especifico' : readme.length > 0 ? 'generico' : 'ausente',
        bioSpecificity: bio.length > 60 ? 'especializacao' : bio.length > 0 ? 'papel' : 'generico',
        primaryArea: 'Developer Tooling',
        secondaryAreas: ['AI Infrastructure'],
        identityClarity: readme.length > 400 && bio.length > 40 ? 'clara' : 'razoavel',
        rationale: 'Classificação determinística de teste.',
        evidenceRefs: Object.keys(pack.aliases).slice(0, 1),
      });
    },
  };
}
