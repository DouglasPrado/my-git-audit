import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Facts } from '@audit/contracts';
import { err, ok } from '@audit/kernel';
import { createAnalyzer } from '../analyzer';
import { createFakeInterpreter } from '../fake';
import { buildProfilePack, buildRepositoryPack, renderPack } from '../pack';
import type { Interpreter } from '../port';

const facts = JSON.parse(
  readFileSync(new URL('../../../scoring/src/__tests__/fixtures/example-profile.json', import.meta.url), 'utf8'),
) as Facts;

const analyzer = (i: Interpreter) => createAnalyzer(i, { model: 'test-model', concurrency: 8 });

describe('pacote de evidências', () => {
  it('nomeia evidências como E1..En, em ordem canônica', () => {
    const pack = buildRepositoryPack(facts.repositories[0]!);
    expect(Object.keys(pack.aliases)).toEqual(Object.keys(pack.aliases).map((_, i) => `E${i + 1}`));
  });

  it('trunca README longo em vez de enviar tudo', () => {
    const grande = { ...facts.repositories[0]!, readme: { path: 'README.md', text: 'x'.repeat(20_000), byteSize: 20_000 } };
    const body = buildRepositoryPack(grande).sections.find((s) => s.title.startsWith('README'))!.body;
    expect(body.length).toBeLessThan(7_000);
    expect(body).toContain('truncado');
  });

  it('envia caminhos da árvore, nunca o conteúdo dos arquivos', () => {
    const pack = buildRepositoryPack(facts.repositories[0]!);
    const arvore = pack.sections.find((s) => s.title === 'Árvore da raiz')!.body;
    expect(arvore.split('\n').every((l) => l.length < 120)).toBe(true);
  });

  it('delimita conteúdo de terceiros como dado', () => {
    // Primeira defesa contra injeção de prompt. A segunda é o enum na saída,
    // que é a que não depende do modelo cooperar.
    const rendered = renderPack(buildProfilePack(facts));
    expect(rendered).toContain('<evidencia id="E1"');
    expect(rendered).toContain('</evidencia>');
  });
});

describe('analisador semântico', () => {
  it('produz os seis sinais que os slots interpretativos esperam', async () => {
    const out = await analyzer(createFakeInterpreter()).interpret(facts);
    const codes = new Set(out.signals.map((s) => s.code.split(':')[0]));
    expect(codes).toEqual(
      new Set([
        'README_STRUCTURE', 'README_WHAT_AND_WHY', 'ARCHITECTURE_DOC_SUBSTANTIVE',
        'COMMIT_MESSAGE_QUALITY', 'PROFILE_README_SUBSTANCE', 'PROFILE_BIO_SPECIFICITY',
      ]),
    );
    expect(out.degraded).toBe(0);
  });

  it('marca todo sinal de modelo como enum e de baixa confiança', async () => {
    // ADR-0004: um modelo nunca emite valor numérico que entre na conta.
    const out = await analyzer(createFakeInterpreter()).interpret(facts);
    for (const s of out.signals) {
      expect(s.value.type, s.code).toBe('enum');
      expect(s.confidence, s.code).toBe('low');
      expect(s.producer.kind).toBe('llm');
      expect(s.evidenceIds.length, s.code).toBeGreaterThan(0);
    }
  });

  it('produz o 10 Second Test como narrativa, fora da nota', async () => {
    const out = await analyzer(createFakeInterpreter()).interpret(facts);
    expect(out.profileNarrative?.primaryArea).toBeTruthy();
    expect(out.profileNarrative?.identityClarity).toBeTruthy();
  });

  it('DEGRADA quando o modelo devolve valor fora do domínio', async () => {
    const fora: Interpreter = {
      interpretRepository: async () => ok({ structure: 'maravilhoso', whatAndWhy: 'claro', architecture: 'fronteiras', commitQuality: 'bom', rationale: 'x', evidenceRefs: [] }),
      interpretProfile: async () => ok({ readmeSubstance: 'especifico', bioSpecificity: 'papel', primaryArea: 'x', secondaryAreas: [], identityClarity: 'clara', rationale: 'y', evidenceRefs: [] }),
    };
    const out = await analyzer(fora).interpret(facts);
    // Saída fora do domínio é ERRO, não algo a reparar.
    expect(out.degraded).toBe(facts.repositories.length);
    expect(out.signals.every((s) => s.code.startsWith('PROFILE_'))).toBe(true);
  });

  it('DEGRADA sem lançar quando o provedor falha', async () => {
    const quebrado: Interpreter = {
      interpretRepository: async () => err({ kind: 'provider_error', detail: 'boom' }),
      interpretProfile: async () => err({ kind: 'timeout' }),
    };
    const out = await analyzer(quebrado).interpret(facts);
    expect(out.signals).toHaveLength(0);
    expect(out.degraded).toBe(facts.repositories.length + 1);
    expect(out.profileNarrative).toBeNull();
  });

  it('não inventa referência de evidência fora das que enviou', async () => {
    const mentiroso: Interpreter = {
      interpretRepository: async () => ok({ structure: 'claro', whatAndWhy: 'claro', architecture: 'componentes', commitQuality: 'bom', rationale: 'x', evidenceRefs: ['E99'] }),
      interpretProfile: async () => ok({ readmeSubstance: 'especifico', bioSpecificity: 'papel', primaryArea: 'x', secondaryAreas: [], identityClarity: 'clara', rationale: 'y', evidenceRefs: [] }),
    };
    // O schema restringe evidenceRefs ao conjunto enviado: E99 reprova a validação.
    const out = await analyzer(mentiroso).interpret(facts);
    expect(out.degraded).toBe(facts.repositories.length);
  });

  it('reaproveita o cache: mesma evidência não paga duas vezes', async () => {
    const espiao = vi.fn(createFakeInterpreter().interpretRepository);
    const base = createFakeInterpreter();
    const i: Interpreter = { interpretRepository: espiao, interpretProfile: base.interpretProfile };
    const a = createAnalyzer(i, { model: 'test-model' });
    const primeiro = await a.interpret(facts);
    const segundo = await a.interpret(facts);
    expect(primeiro.usage.calls).toBeGreaterThan(0);
    expect(segundo.usage.calls).toBe(0);
    expect(segundo.usage.cacheHits).toBeGreaterThan(0);
    expect(segundo.signals.length).toBe(primeiro.signals.length);
  });
});

describe('integração com o motor de pontuação', () => {
  it('os sinais mudam a nota, e só nas categorias interpretativas', async () => {
    const { rubricV1, score } = await import('@audit/scoring');
    const out = await analyzer(createFakeInterpreter()).interpret(facts);
    const sem = score(facts, rubricV1, 'general');
    const com = score(facts, rubricV1, 'general', new Map(out.signals.map((s) => [s.code, s])));

    // Categorias sem slot interpretativo NÃO podem se mover.
    for (const c of ['CUR', 'OSS', 'MNT', 'HYG', 'DIS'] as const) {
      expect(com.categories[c].score, c).toBe(sem.categories[c].score);
    }
    // As três que têm, sim.
    expect(com.categories.POS.score).not.toBe(sem.categories.POS.score);
  });

  it('marca as categorias interpretativas como de baixa confiança', async () => {
    const { rubricV1, score } = await import('@audit/scoring');
    const out = await analyzer(createFakeInterpreter()).interpret(facts);
    const com = score(facts, rubricV1, 'general', new Map(out.signals.map((s) => [s.code, s])));
    // É o que dispara o marcador "parcialmente interpretado" na interface.
    expect(com.categories.POS.confidenceMix.low).toBeGreaterThan(0.3);
    expect(com.categories.CUR.confidenceMix.low).toBe(0);
  });
});
