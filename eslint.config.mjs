import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * O ESLint aqui fiscaliza ARQUITETURA, não estilo. Estilo é do Prettier.
 *
 * Regra sem fiscal não é regra — e guarda nunca exercitada contra violação real
 * não é guarda. Cada bloco abaixo tem um teste correspondente que a viola de
 * propósito e espera falha.
 */
export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/*.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-param-reassign': 'error',
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },

  {
    // `process.env` só na borda. Domínio não lê configuração.
    files: ['packages/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Leia configuração apenas na borda (apps/web/src/lib).' },
      ],
    },
  },

  {
    /**
     * O motor de pontuação é PURO. Estas proibições são o que torna a nota
     * reproduzível — CLAUDE.md regra 15, ADR-0004, rubrica §11.
     *
     * `Math.log`/`Math.pow` entram na lista porque NÃO são especificados bit a
     * bit pelo IEEE-754 e divergem entre engines. Faixas logarítmicas usam
     * tabela de limiares, que além de determinística é revisável em diff.
     */
    files: ['packages/modules/scoring/**/*.ts'],
    ignores: ['packages/modules/scoring/src/__tests__/**', 'packages/modules/scoring/vitest.config.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'O "agora" entra por facts.scanAt. O motor não lê relógio.' },
        { object: 'Math', property: 'random', message: 'Aleatoriedade quebra a reprodutibilidade da nota.' },
        { object: 'Math', property: 'log', message: 'Não é especificado bit a bit pelo IEEE-754. Use tabela de limiares na rubrica.' },
        { object: 'Math', property: 'pow', message: 'Não é especificado bit a bit pelo IEEE-754. Use tabela de limiares na rubrica.' },
        { object: 'process', property: 'env', message: 'O motor de pontuação não lê ambiente.' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@audit/collection', '@audit/reporting', 'next/*', 'react'], message: 'scoring depende apenas de @audit/kernel e @audit/contracts.' },
            { group: ['node:*'], message: 'O motor de pontuação não faz I/O.' },
          ],
        },
      ],
    },
  },

  {
    // Contratos e kernel não conhecem fornecedor nem framework.
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@octokit/*', 'next/*', 'react', '@prisma/*', '@anthropic-ai/*', 'openai'], message: 'O núcleo compartilhado não conhece fornecedor nem framework.' }] },
      ],
    },
  },

  {
    /**
     * A direção é insight → sinais → scoring. O motor de pontuação não conhece
     * quem produziu o sinal, e o intérprete não conhece peso nem nota — é o que
     * impede um prompt de "saber" quanto vale a resposta que ele devolve.
     */
    files: ['packages/modules/insight/src/**/*.ts'],
    ignores: ['packages/modules/insight/src/__tests__/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@audit/scoring', '@audit/reporting', '@audit/collection'], message: 'insight produz sinais; não conhece peso, nota nem coleta.' }] },
      ],
    },
  },

  {
    // O GitHub não contamina o domínio: cliente só no adaptador (ADR-0002).
    files: ['packages/modules/collection/src/**/*.ts'],
    ignores: ['packages/modules/collection/src/github/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@octokit/*'], message: 'O cliente do GitHub vive apenas em src/github.' }] },
      ],
    },
  },

  {
    files: ['**/*.test.ts', 'tools/**/*.ts'],
    rules: { 'no-restricted-properties': 'off', 'no-console': 'off' },
  },
);
