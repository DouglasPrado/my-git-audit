import type { CategoryId } from '@audit/contracts';

export interface RuleCopy {
  /** Ação imperativa e concreta, do lado do usuário da tela. */
  action: (subject: string) => string;
  title: string;
  effort: 'S' | 'M' | 'L';
  /** Nota que o achado atingiria se a ação fosse feita. */
  nextGrade: number;
  category: CategoryId;
}

/**
 * Texto de recomendação por regra. Determinístico — nunca prosa de LLM.
 * Regra sem entrada aqui simplesmente não vira recomendação.
 */
export const RECOMMENDATION_COPY: Record<string, RuleCopy> = {
  REPO_DESCRIPTION: { title: 'Adicionar descrição', action: (s) => `Escreva uma descrição de uma linha para ${s}`, effort: 'S', nextGrade: 1, category: 'DIS' },
  REPO_TOPICS: { title: 'Adicionar topics', action: (s) => `Adicione ao menos 3 topics a ${s}`, effort: 'S', nextGrade: 1, category: 'DIS' },
  REPO_HOMEPAGE_URL: { title: 'Apontar uma homepage', action: (s) => `Preencha o campo de site de ${s} com a demo ou a documentação`, effort: 'S', nextGrade: 1, category: 'DIS' },
  LICENSE_RECOGNIZED: { title: 'Adicionar licença', action: (s) => `Escolha uma licença para ${s} — sem ela ninguém sabe se pode usar o código`, effort: 'S', nextGrade: 1, category: 'OSS' },
  GITIGNORE_PRESENT: { title: 'Adicionar .gitignore', action: (s) => `Crie um \`.gitignore\` em ${s}`, effort: 'S', nextGrade: 1, category: 'HYG' },
  COMMITTED_ARTIFACTS: { title: 'Remover artefatos versionados', action: (s) => `Remova os artefatos de build de ${s} e adicione-os ao \`.gitignore\``, effort: 'S', nextGrade: 1, category: 'HYG' },
  SECRETS_SUSPECTED: { title: 'Verificar arquivo de credencial', action: (s) => `Confira o arquivo de credencial versionado em ${s}; se contiver segredo, rotacione-o e remova do histórico`, effort: 'M', nextGrade: 1, category: 'HYG' },
  README_VISUAL_ASSET: { title: 'Adicionar screenshot', action: (s) => `Coloque uma imagem do produto no topo do README de ${s}`, effort: 'M', nextGrade: 1, category: 'PRE' },
  README_API_EXAMPLE: { title: 'Mostrar o uso em código', action: (s) => `Adicione um exemplo de uso ao README de ${s}`, effort: 'M', nextGrade: 1, category: 'PRE' },
  README_TERMINAL_DEMO: { title: 'Demonstrar a CLI', action: (s) => `Grave uma sessão de terminal ou GIF para o README de ${s}`, effort: 'M', nextGrade: 1, category: 'PRE' },
  ARCHITECTURE_DIAGRAM: { title: 'Adicionar diagrama', action: (s) => `Inclua um diagrama mermaid da arquitetura no README de ${s}`, effort: 'M', nextGrade: 1, category: 'PRE' },
  REPO_README_PRESENT: { title: 'Escrever um README', action: (s) => `Crie o README de ${s} explicando o que o projeto faz e como rodar`, effort: 'M', nextGrade: 1, category: 'PRE' },
  README_QUICKSTART_CORROBORATED: { title: 'Explicar como rodar', action: (s) => `Documente os comandos de instalação e execução de ${s}`, effort: 'S', nextGrade: 1, category: 'PRE' },
  PROFILE_README_PRESENT: { title: 'Criar o Profile README', action: () => 'Crie o repositório com o seu nome de usuário e escreva um README de perfil', effort: 'M', nextGrade: 1, category: 'POS' },
  PROFILE_BIO_PRESENT: { title: 'Preencher a bio', action: () => 'Escreva uma bio que diga que tipo de engenheiro você é', effort: 'S', nextGrade: 1, category: 'POS' },
  PROFILE_IDENTITY_COMPLETE: { title: 'Completar a identidade', action: () => 'Preencha nome, localização e empresa no perfil', effort: 'S', nextGrade: 1, category: 'HYG' },
  PROFILE_WEBSITE: { title: 'Adicionar site ao perfil', action: () => 'Preencha o campo de site do perfil com seu portfólio ou blog', effort: 'S', nextGrade: 1, category: 'DIS' },
  PROFILE_SOCIAL: { title: 'Vincular o LinkedIn', action: () => 'Vincule seu LinkedIn no perfil do GitHub — é por onde recrutador chega até você', effort: 'S', nextGrade: 1, category: 'DIS' },
  PROFILE_EMAIL: { title: 'Publicar um e-mail', action: () => 'Torne um e-mail público no perfil, ou deixe claro no Profile README como te encontrar', effort: 'S', nextGrade: 1, category: 'DIS' },
  PROFILE_REPO_DESCRIPTION: { title: 'Descrever o repositório de perfil', action: (s) => `Adicione uma descrição ao repositório de perfil — é o que aparece antes de alguém abrir o README de ${s}`, effort: 'S', nextGrade: 1, category: 'POS' },
  PINNED_SELF_EXPLANATORY: { title: 'Completar os fixados', action: () => 'Dê descrição e README a todos os repositórios fixados — são os seis que você escolheu mostrar', effort: 'M', nextGrade: 1, category: 'CUR' },
  RELEASES_AND_VERSIONING: { title: 'Publicar a primeira release', action: (s) => `Publique uma release com tag em versionamento semântico para ${s}`, effort: 'M', nextGrade: 1, category: 'OSS' },
  CHANGELOG_PRESENT: { title: 'Criar um CHANGELOG', action: (s) => `Adicione um CHANGELOG a ${s}`, effort: 'M', nextGrade: 1, category: 'OSS' },
  CI_WORKFLOW_SUBSTANTIVE: { title: 'Configurar CI', action: (s) => `Crie um workflow que rode build, lint e testes em ${s}`, effort: 'L', nextGrade: 0.85, category: 'ENG' },
  TESTS_SUBSTANTIVE: { title: 'Adicionar testes', action: (s) => `Escreva testes para ${s} e execute-os no CI`, effort: 'L', nextGrade: 0.85, category: 'ENG' },
  ARCHITECTURE_DOC_SUBSTANTIVE: { title: 'Documentar a arquitetura', action: (s) => `Escreva um \`ARCHITECTURE.md\` em ${s} descrevendo componentes e fronteiras`, effort: 'L', nextGrade: 1, category: 'ENG' },
  LINT_FORMAT_CONFIG: { title: 'Configurar lint', action: (s) => `Adicione configuração de lint e formatação a ${s}`, effort: 'M', nextGrade: 1, category: 'ENG' },
  DEP_MANIFEST_LOCKFILE: { title: 'Versionar o lockfile', action: (s) => `Versione o lockfile de ${s}`, effort: 'S', nextGrade: 1, category: 'ENG' },
  CONTAINERIZED_OR_DEPLOYABLE: { title: 'Declarar como implantar', action: (s) => `Adicione um Dockerfile ou configuração de deploy a ${s}`, effort: 'M', nextGrade: 1, category: 'ENG' },
  SECURITY_POLICY_PRESENT: { title: 'Publicar política de segurança', action: (s) => `Adicione um \`SECURITY.md\` a ${s}`, effort: 'S', nextGrade: 1, category: 'OSS' },
  CONTRIBUTING_AND_TEMPLATES: { title: 'Documentar como contribuir', action: (s) => `Adicione \`CONTRIBUTING.md\` e templates de issue a ${s}`, effort: 'M', nextGrade: 1, category: 'OSS' },
  PORTFOLIO_ARCHIVE_HYGIENE: { title: 'Arquivar projetos parados', action: () => 'Arquive os repositórios que você não pretende retomar — arquivar comunica intenção', effort: 'S', nextGrade: 1, category: 'CUR' },
  PORTFOLIO_NOISE_RATIO: { title: 'Limpar o portfólio', action: () => 'Descreva ou arquive os repositórios que hoje não se explicam', effort: 'M', nextGrade: 1, category: 'CUR' },
  COMMIT_RECENCY: { title: 'Retomar ou arquivar', action: (s) => `${s} está parado — retome ou arquive para sinalizar que está terminado`, effort: 'S', nextGrade: 0.7, category: 'MNT' },
};
