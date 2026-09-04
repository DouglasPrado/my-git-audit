import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CATEGORIES } from '@audit/contracts';
import type { Facts } from '@audit/contracts';
import { assertTrailBalances, score } from '../engine';
import { rubricV1 } from '../rubric';
import type { PersonaId } from '../rubric/types';

const facts = JSON.parse(
  readFileSync(new URL('./fixtures/example-profile.json', import.meta.url), 'utf8'),
) as Facts;

const ALL: PersonaId[] = ['general', 'recruiter', 'senior-engineer', 'staff-engineer', 'oss-maintainer', 'freelancer'];
const run = (p: PersonaId = 'general') => score(facts, rubricV1, p);

describe('motor de pontuação', () => {
  it('mantém toda categoria e o overall dentro de [0,100], nunca NaN', () => {
    for (const p of ALL) {
      const out = run(p);
      expect(Number.isFinite(out.overall), p).toBe(true);
      expect(out.overall).toBeGreaterThanOrEqual(0);
      expect(out.overall).toBeLessThanOrEqual(100);
      for (const c of CATEGORIES) {
        const v = out.categories[c].score;
        expect(Number.isFinite(v), `${p}/${c}`).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it('fecha a trilha: Σ adquirido + Σ |perdido| = 100', () => {
    const out = run();
    for (const c of CATEGORIES) expect(() => assertTrailBalances(out.categories[c]), c).not.toThrow();
  });

  it('mantém as notas de categoria IDÊNTICAS entre as seis personas', () => {
    // É a garantia que torna `allPersonaOverall` honesto e as personas comparáveis.
    const base = run('general');
    for (const p of ALL.slice(1)) {
      const other = run(p);
      for (const c of CATEGORIES) {
        expect(other.categories[c].score, `${p}/${c}`).toBe(base.categories[c].score);
      }
    }
  });

  it('mantém o overall como combinação convexa das categorias', () => {
    for (const p of ALL) {
      const out = run(p);
      const values = CATEGORIES.map((c) => out.categories[c].score);
      expect(out.overall, p).toBeGreaterThanOrEqual(Math.min(...values) - 0.05);
      expect(out.overall, p).toBeLessThanOrEqual(Math.max(...values) + 0.05);
    }
  });

  it('não depende da ordem dos repositórios', () => {
    const shuffled: Facts = { ...facts, repositories: [...facts.repositories].reverse() };
    expect(score(shuffled, rubricV1, 'general').overall).toBe(run().overall);
  });

  it('é determinístico: mesma entrada, mesma saída, bit a bit', () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('não deixa nenhum sinal sem evidência e nenhum achado órfão', () => {
    const out = run();
    expect(out.findings.length).toBeGreaterThan(20);
    for (const f of out.findings) {
      expect(f.evidenceIds.length, f.ruleCode).toBeGreaterThan(0);
      expect(f.slotId, f.ruleCode).not.toBeNull();
    }
  });

  it('reproduz o golden do perfil de calibração', () => {
    // Qualquer mudança de peso, faixa ou grader aparece aqui como diff revisável.
    const out = run('senior-engineer');
    expect({
      rubricVersion: out.rubricVersion,
      overall: out.overall,
      categories: Object.fromEntries(CATEGORIES.map((c) => [c, out.categories[c].score])),
      personas: out.allPersonaOverall,
      repos: out.repoScores.map((r) => `${r.name}:${r.band}`).sort(),
    }).toMatchSnapshot();
  });
});

describe('anti-gaming: existência de arquivo não é nota', () => {
  const withRepo = (patch: Partial<Facts['repositories'][number]>): Facts => ({
    ...facts,
    repositories: [{ ...facts.repositories[0]!, ...patch }],
  });

  it('não dá nota cheia a LICENSE que o GitHub não reconhece', () => {
    const noassertion = score(withRepo({ licenseSpdxId: 'NOASSERTION' }), rubricV1, 'oss-maintainer');
    const mit = score(withRepo({ licenseSpdxId: 'MIT' }), rubricV1, 'oss-maintainer');
    expect(noassertion.categories.OSS.score).toBeLessThan(mit.categories.OSS.score);
  });

  it('não dá nota cheia a workflow que só dispara manualmente', () => {
    const dispatch = score(
      withRepo({ workflows: [{ name: 'ci.yml', text: 'on:\n  workflow_dispatch:\njobs:\n  a:\n    steps: []' }] }),
      rubricV1, 'senior-engineer',
    );
    const real = score(
      withRepo({ workflows: [{ name: 'ci.yml', text: 'on: push\njobs:\n  a:\n    steps:\n      - run: pnpm test' }] }),
      rubricV1, 'senior-engineer',
    );
    expect(dispatch.categories.ENG.score).toBeLessThan(real.categories.ENG.score);
  });

  it('não dá nota cheia a documento de arquitetura de três linhas', () => {
    const stub = score(
      withRepo({ architectureDoc: { path: 'ARCHITECTURE.md', text: '# Arquitetura\n\nÉ modular.', byteSize: 30 } }),
      rubricV1, 'staff-engineer',
    );
    const absent = score(withRepo({ architectureDoc: null }), rubricV1, 'staff-engineer');
    expect(stub.categories.ENG.score - absent.categories.ENG.score).toBeLessThan(6);
  });

  it('adicionar arquivo vazio nunca aumenta a nota', () => {
    const base = run().overall;
    for (const name of ['LICENSE', 'ARCHITECTURE.md', 'CONTRIBUTING.md']) {
      const padded = score(
        { ...facts, repositories: facts.repositories.map((r) => ({ ...r, rootTree: [...r.rootTree, { name, type: 'blob' as const }] })) },
        rubricV1, 'general',
      );
      expect(padded.overall, name).toBeLessThanOrEqual(base + 1e-9);
    }
  });
});

describe('falsos positivos que destruiriam a credibilidade', () => {
  const repo = (patch: Partial<Facts['repositories'][number]>) => ({
    ...facts,
    repositories: [{ ...facts.repositories[0]!, ...patch }],
  });

  it('não acusa ausência de testes em projeto Rust', () => {
    // Rust usa #[cfg(test)] inline. Emitir NO_TESTS aqui seria o pior falso
    // positivo do catálogo, com exatamente o público que precisamos convencer.
    const out = score(repo({ primaryLanguage: 'Rust', rootTree: [{ name: 'Cargo.toml', type: 'blob' }], srcTree: [] }), rubricV1, 'senior-engineer');
    const f = out.findings.find((x) => x.ruleCode === 'TESTS_SUBSTANTIVE');
    expect(f?.grade).toBeGreaterThan(0.3);
    expect(f?.confidence).toBe('low');
  });

  it('não penaliza biblioteca que corretamente não versiona lockfile', () => {
    const out = score(repo({ projectType: 'library', rootTree: [{ name: 'package.json', type: 'blob' }] }), rubricV1, 'senior-engineer');
    expect(out.findings.find((x) => x.ruleCode === 'DEP_MANIFEST_LOCKFILE')?.grade).toBe(1);
  });

  it('trata repositório arquivado como decisão, não abandono', () => {
    const out = score(repo({ isArchived: true, lastCommitAt: null }), rubricV1, 'oss-maintainer');
    expect(out.findings.find((x) => x.ruleCode === 'COMMIT_RECENCY')?.grade).toBeGreaterThan(0.5);
  });

  it('não cobra código de conduta de ferramenta pessoal solo', () => {
    const out = score(repo({ stars: 2 }), rubricV1, 'oss-maintainer');
    const f = out.findings.find((x) => x.ruleCode === 'CODE_OF_CONDUCT_PRESENT');
    expect(f?.grade).toBe(0.5);
    expect(f?.applicabilityReason).toBeTruthy();
  });

  it('não acusa `.env.example` como credencial vazada', () => {
    const out = score(repo({ rootTree: [{ name: '.env.example', type: 'blob' }] }), rubricV1, 'general');
    expect(out.findings.find((x) => x.ruleCode === 'SECRETS_SUSPECTED')?.grade).toBe(1);
  });

  it('não penaliza `vendor/` em projeto Go', () => {
    const go = score(repo({ primaryLanguage: 'Go', rootTree: [{ name: 'vendor', type: 'tree' }] }), rubricV1, 'general');
    const ts = score(repo({ primaryLanguage: 'TypeScript', projectType: 'service', rootTree: [{ name: 'vendor', type: 'tree' }] }), rubricV1, 'general');
    expect(go.findings.find((x) => x.ruleCode === 'COMMITTED_ARTIFACTS')?.grade).toBe(1);
    expect(ts.findings.find((x) => x.ruleCode === 'COMMITTED_ARTIFACTS')?.grade).toBeLessThan(1);
  });

  it('nunca acusa apropriação de autoria quando os autores não resolvem', () => {
    const out = score(repo({ commitAuthors: [null, null, null] }), rubricV1, 'general');
    const f = out.findings.find((x) => x.ruleCode === 'COMMIT_AUTHORSHIP');
    expect(f?.grade).toBe(1);
    expect(f?.confidence).toBe('low');
  });
});
