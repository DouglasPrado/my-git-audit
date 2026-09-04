import { describe, expect, it } from 'vitest';
import type { EvidenceId } from '@audit/kernel';
import { evidenceId, makeRecommendation, makeSignal, subjectKey } from '../index';

const repo = { kind: 'repo' as const, owner: 'Octo', name: 'Vault' };
const evId = evidenceId(subjectKey(repo), 'tree.entry', 'README.MD');

describe('invariantes de domínio', () => {
  it('normaliza subjectKey para minúsculas', () => {
    expect(subjectKey(repo)).toBe('repo:octo/vault');
  });

  it('constrói EvidenceId como chave natural, estável entre scans', () => {
    expect(evId).toBe('ev:repo:octo/vault#tree.entry:README.MD');
  });

  it('RECUSA sinal sem evidência', () => {
    // Sinal sem evidência é defeito, não caso degradado — CLAUDE.md regra 16.
    expect(() =>
      makeSignal({
        code: 'X', subject: repo, value: { type: 'bool', value: true },
        confidence: 'high', producer: { kind: 'deterministic', fn: 'f', v: 1 }, evidenceIds: [],
      }),
    ).toThrow(/não tem evidência/);
  });

  it('RECUSA sinal de LLM que não seja enum', () => {
    // Um modelo nunca emite número que entre na nota — ADR-0004.
    expect(() =>
      makeSignal({
        code: 'X', subject: repo, value: { type: 'ratio', value: 0.8 },
        confidence: 'low',
        producer: { kind: 'llm', model: 'm', promptId: 'p', promptVersion: 1, temperature: 0, samples: 1 },
        evidenceIds: [evId],
      }),
    ).toThrow(/precisa ser enum/);
  });

  it('aceita sinal de LLM quantizado em enum', () => {
    const s = makeSignal({
      code: 'X', subject: repo, value: { type: 'enum', value: 'claro', domain: ['vago', 'claro'] },
      confidence: 'low',
      producer: { kind: 'llm', model: 'm', promptId: 'p', promptVersion: 1, temperature: 0, samples: 3 },
      evidenceIds: [evId],
    });
    expect(s.id).toBe('sig:repo:octo/vault#X');
  });

  it('RECUSA recomendação que não deriva de nenhum achado', () => {
    expect(() =>
      makeRecommendation({
        fromFindingIds: [], title: 't', action: 'a', category: 'OSS', subject: repo,
        estimatedGain: { categoryBefore: 1, categoryAfter: 2, overallDelta: 1 },
        effort: 'S', evidenceIds: [evId as EvidenceId],
      }),
    ).toThrow(/não deriva de nenhum achado/);
  });
});
