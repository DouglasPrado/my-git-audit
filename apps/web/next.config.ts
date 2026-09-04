import type { NextConfig } from 'next';

const config: NextConfig = {
  // Os módulos de domínio são consumidos direto do fonte, sem passo de build.
  transpilePackages: ['@audit/kernel', '@audit/contracts', '@audit/scoring', '@audit/collection', '@audit/reporting'],
  typedRoutes: true,
  // Imagem enxuta: o runtime não carrega node_modules inteiro.
  output: 'standalone',
  // O contrato de trabalho deste repositório é o CLAUDE.md da raiz. Stub gerado
  // dentro de apps/web só cria um segundo lugar para procurar a mesma coisa.
  agentRules: false,
};

export default config;
