/**
 * FASE 1 — descoberta. Perfil, fixados e a lista de repositórios com o mínimo
 * necessário para SELECIONAR e para medir ruído do portfólio.
 *
 * Deliberadamente leve: pedir histórico e árvore de 60 repositórios de uma vez
 * faz a API responder 502. Detalhe só para os selecionados (fase 2).
 */
export const PHASE1_DISCOVER = /* GraphQL */ `
  query Discover($login: String!, $after: String) {
    rateLimit { cost remaining resetAt }
    user(login: $login) {
      __typename
      login name bio websiteUrl location company createdAt
      followers { totalCount }
      socialAccounts(first: 10) { totalCount }
      profileRepo: repository(name: $login) {
        name
        defaultBranchRef { target { ... on Commit { oid } } }
        object(expression: "HEAD:") { ... on Tree { entries { name type } } }
      }
      pinnedItems(first: 6, types: REPOSITORY) {
        totalCount
        nodes { ... on Repository { name } }
      }
      contributionsCollection {
        pullRequestContributionsByRepository(maxRepositories: 50) {
          repository { owner { login } }
          contributions { totalCount }
        }
      }
      repositories(
        first: 100
        after: $after
        isFork: false
        # SOMENTE PUBLICOS, e isto nao e redundante.
        #
        # Um token com escopo repo faz esta query devolver repositorios
        # PRIVADOS do dono. Numa instancia sem autenticacao, que roda com token
        # de servidor, isso entregaria nome, descricao, README e arvore de repo
        # privado a qualquer visitante que digitasse o login certo.
        #
        # Repositorio privado e o Epico 10 e exige consentimento por repositorio.
        privacy: PUBLIC
        ownerAffiliations: OWNER
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          name description isFork isArchived isEmpty isPrivate stargazerCount pushedAt
          repositoryTopics(first: 1) { totalCount }
          root: object(expression: "HEAD:") { ... on Tree { entries { name type } } }
        }
      }
    }
    organization(login: $login) { __typename login }
  }
`;

/** FASE 2 — detalhe apenas dos selecionados, por alias. */
export function buildDetail(repos: { alias: string; name: string }[], owner: string): string {
  const fields = repos
    .map(
      (r) => `    ${r.alias}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(r.name)}) { ...RepoDetail }`,
    )
    .join('\n');
  return /* GraphQL */ `
    query Detail($since: GitTimestamp!) {
      rateLimit { cost remaining }
${fields}
    }

    fragment RepoDetail on Repository {
      name description homepageUrl
      isFork isArchived isEmpty
      stargazerCount forkCount pushedAt
      licenseInfo { spdxId }
      repositoryTopics(first: 20) { nodes { topic { name } } }
      primaryLanguage { name }
      languages(first: 8) { edges { size node { name } } }
      releases(first: 1, orderBy: { field: CREATED_AT, direction: DESC }) {
        totalCount
        nodes { tagName publishedAt }
      }
      openIssues: issues(states: OPEN) { totalCount }
      closedIssues: issues(states: CLOSED) { totalCount }
      defaultBranchRef {
        name
        target {
          ... on Commit {
            oid committedDate
            history(first: 100) { nodes { messageHeadline author { user { login } } } }
            recent: history(since: $since) { totalCount }
            checkSuites(first: 5) { nodes { conclusion updatedAt } }
          }
        }
      }
      root: object(expression: "HEAD:") { ... on Tree { entries { name type } } }
      gh: object(expression: "HEAD:.github") { ... on Tree { entries { name type } } }
      ghWorkflows: object(expression: "HEAD:.github/workflows") { ... on Tree { entries { name type } } }
      src: object(expression: "HEAD:src") { ... on Tree { entries { name type } } }
    }
  `;
}

/**
 * FASE 3 — blobs dos caminhos JÁ RESOLVIDOS, ancorados no OID capturado antes.
 * Nunca `HEAD:`: se a pessoa der push entre as fases, `HEAD:` entrega blobs de
 * uma árvore que nunca foi inspecionada e a evidência deixa de bater com os fatos.
 */
export function buildBlobs(
  targets: { alias: string; owner: string; name: string; oid: string; path: string }[],
): string {
  const fields = targets
    .map(
      (t) => `    ${t.alias}: repository(owner: ${JSON.stringify(t.owner)}, name: ${JSON.stringify(t.name)}) {
      object(expression: ${JSON.stringify(`${t.oid}:${t.path}`)}) { ... on Blob { text byteSize isTruncated } }
    }`,
    )
    .join('\n');
  return `query Blobs {\n  rateLimit { cost remaining }\n${fields}\n}`;
}
