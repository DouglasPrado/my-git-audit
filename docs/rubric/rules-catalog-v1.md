# Catálogo de regras — v1.0.0

> Companheiro de [`rubric-v1.md`](rubric-v1.md). Aquele documento define a álgebra; este define
> **o que exatamente é verificado**, com que evidência, e **onde cada regra erra**.
>
> A coluna de falso positivo não é ressalva defensiva. Cada item ali destrói credibilidade com
> exatamente o público que o produto precisa convencer.

---

## 1. Legenda

**Escopo:** `profile` · `portfolio` (o conjunto de repositórios como unidade) · `repo` ·
`repo-agg` (avaliado por repositório e agregado ao perfil).
**Tipo:** `S` slot · `B` bônus · `P` penalidade · `M` meta (não pontua; altera seleção).
**LLM:** ✓ quando há componente interpretativo. Nunca produz número — sempre enum.

---

## 2. As regras

### 2.1 Positioning — `POS`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 1 | `PROFILE_README_PRESENT` | profile | S | Entradas da árvore do repositório `{login}/{login}` | |
| 2 | `PROFILE_README_STRUCTURE` | profile | S | Headings, contagem de palavras, links para projetos próprios | |
| 3 | `PROFILE_README_SUBSTANCE` | profile | S | Texto do README + enum `{ausente, genérico, específico, diferenciado}` | ✓ |
| 4 | `PROFILE_BIO_PRESENT` | profile | S | `user.bio` | |
| 5 | `PROFILE_BIO_SPECIFICITY` | profile | S | `user.bio` + enum `{genérico, papel, especialização}` | ✓ |
| 6 | `PORTFOLIO_COHERENCE` | portfolio | S | Índice de Herfindahl sobre topics e linguagens dos selecionados | |

**Falsos positivos:**

- **(1) A armadilha de maiúsculas — a mais grave do catálogo.** Ver §3.1. Consultar caminho fixo
  `HEAD:README.md` produz `README_MISSING` falso. Medido no perfil de calibração: **2 dos 6
  repositórios fixados usam `README.MD`**, incluindo o repositório de perfil. Resolver sempre a
  partir da árvore, case-insensitive.
- **(1)** Se o repositório especial `{login}/{login}` não existe, a mensagem é *"não há repositório
  de Profile README"*, **nunca** *"README ausente"*. São situações diferentes e a ação também é.
- **(3)(5)** README em português não é README pior. O prompt **DEVE** proibir explicitamente
  penalizar idioma.
- **(5)** Bio curta e excelente existe. Avalia-se especificidade, **jamais** comprimento.
- **(6)** Generalista genuíno existe. O índice determinístico dá a nota; se a narrativa do modelo
  discordar dele, baixa-se a **confiança**, não a nota.

### 2.2 Portfolio Curation — `CUR`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 7 | `PROFILE_PINNED_USED` | profile | S | `pinnedItems`, filtrado a `Repository` | |
| 8 | `PINNED_BEST_WORK` | portfolio | S | Comparação de notas entre fixados e não fixados | |
| 9 | `PORTFOLIO_NOISE_RATIO` | portfolio | S | Razão de repositórios sem descrição, sem README, ≤1 topic e <10 arquivos | |
| 10 | `PORTFOLIO_ARCHIVE_HYGIENE` | portfolio | S | `isArchived` em repositórios parados há >24 meses | |
| 11 | `PORTFOLIO_TYPE_DIVERSITY` | portfolio | S | Contagem de `ProjectType` distintos entre os selecionados | |
| 11a | `PINNED_SELF_EXPLANATORY` | portfolio | S | De cada fixado **público**: tem descrição? tem README? | |

**Falsos positivos:**

- **(7) Gists fixados inflam `pinnedItems.totalCount`.** Filtrar a nós `Repository`.
- **(11a)** Fixado **privado** não é falta de cuidado — é escolha. São filtrados antes da contagem,
  senão quem fixa um repositório privado seria punido por algo invisível ao público.
- **(42b) O e-mail vem do REST, não do GraphQL, e isso é deliberado.** O campo `email` no GraphQL
  exige escopo `read:user`, e a query inteira falha sem ele. Pedir essa permissão só para checar
  "tem canal de contato" é uma troca ruim. O REST `/users/{login}` devolve o e-mail **público**
  sem escopo extra — e `null` para quem não publicou, que é a resposta certa.
- **(42b)** Ausência de e-mail **não** é falha grave: muita gente o omite de propósito e o LinkedIn
  resolve o contato. Por isso a nota é parcial quando há outro canal, e zero só quando não há
  nenhum.
- **(8)** Gente fixa por motivo narrativo, não por nota. Só dispara quando um não-fixado supera a
  mediana dos fixados por mais de 15 pontos; severidade `low`, redigido como sugestão.
- **(9)** Repositório de rascunho público é legítimo. Só conta acima de 20% do total, com
  penalidade limitada.
- **(10) Arquivar é a ação correta e DEVE ser recompensado.** Punir arquivamento ensina a esconder
  projeto morto em vez de sinalizá-lo — e recompensá-lo é diferencial frente às ferramentas do
  gênero.

### 2.3 Project Presentation — `PRE`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 12 | `REPO_README_PRESENT` | repo-agg | S | Árvore da raiz, `.github/` e `docs/` | |
| 13 | `README_STRUCTURE` | repo-agg | S | Headings, seções, blocos de código, links + enum de clareza | ✓ |
| 14 | `README_WHAT_AND_WHY` | repo-agg | S | Primeiros 400 caracteres + enum `{ausente, vago, claro}` | ✓ |
| 15 | `README_DEMO_ASSET` | repo-agg | S | Variantes por tipo (§2.3.1) | |
| 16 | `README_QUICKSTART_CORROBORATED` | repo-agg | S | Comandos em bloco de código × manifestos na árvore | |
| 17 | `DOC_CLAIM_UNCORROBORATED` | repo-agg | P | Afirmação do README sem fato correspondente na árvore | |

#### 2.3.1 Variantes de `README_DEMO_ASSET`

| `ProjectType` | Variante | O que conta |
| --- | --- | --- |
| `application`, `desktop`, `mobile`, `web` | `README_VISUAL_ASSET` | Imagem markdown, `<img>`, GIF, link de vídeo |
| `library` | `README_API_EXAMPLE` | Bloco de código na `primaryLanguage` mostrando uso |
| `cli` | `README_TERMINAL_DEMO` | Bloco de sessão de terminal, asciinema, GIF |
| `service`, `infrastructure` | `ARCHITECTURE_DIAGRAM` | Fence mermaid ou imagem de diagrama |
| `docs` | neutro `0.6` | — |

**Falsos positivos:**

- **(12) A armadilha de maiúsculas de novo, e aqui é máxima:** esta regra alimenta `CAP_NO_README`,
  que corta `PRE` a 40. Um falso positivo aqui é o dano máximo que o produto consegue causar.
- **(13)** Parede de badges parece estruturada. Exigir ao menos um parágrafo de prosa com ≥40
  palavras.
- **(15)** Imagem hospedada fora do repositório conta. É preciso parsear `<img>` em HTML, não só a
  sintaxe markdown — READMEs sérios usam HTML para centralizar e dimensionar.
- **(16) Monorepo.** Manifestos vivem sob `packages/`, `apps/`, `crates/`. Varrer um nível aninhado
  antes de acusar `DOC_CLAIM_UNCORROBORATED`; caso contrário todo monorepo vira falso positivo.

### 2.4 Engineering Signals — `ENG`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 18 | `TESTS_SUBSTANTIVE` | repo-agg | S | Diretórios e arquivos de teste, bytes agregados, corroboração no CI | |
| 19 | `CI_WORKFLOW_SUBSTANTIVE` | repo-agg | S | Árvore `.github/workflows` + YAML dos workflows | |
| 20 | `ARCHITECTURE_DOC_SUBSTANTIVE` | repo-agg | S | Blob do doc + headings + mermaid + **nomes de módulo × árvore** | ✓ |
| 21 | `COMMIT_MESSAGE_QUALITY` | repo-agg | S | 100 últimos `messageHeadline`: mediana, razão convencional | ✓ |
| 22 | `LINT_FORMAT_CONFIG` | repo-agg | S | `eslint.config.*`, `biome.json`, `ruff.toml`, `rustfmt.toml`, `.editorconfig` | |
| 23 | `DEP_MANIFEST_LOCKFILE` | repo-agg | S | Par manifesto + lockfile | |
| 24 | `CONTAINERIZED_OR_DEPLOYABLE` | repo-agg | S | `Dockerfile`, compose, `fly.toml`, `vercel.json`, `Procfile` | |

**Falsos positivos:**

- **(18) O pior falso positivo possível do catálogo: Rust e Go.** Rust usa `#[cfg(test)]` inline;
  Go usa `*_test.go` ao lado do fonte. **Nenhum dos dois tem diretório `tests/`.** Emitir
  `NO_TESTS` num projeto Rust bem testado é a maneira mais rápida de perder o público técnico.
  Obrigatório: varrer `src/` um nível a mais, checar `[dev-dependencies]` no `Cargo.toml`, e — na
  dúvida — emitir **`unknown` com confiança baixa, nunca `absent`**.
- **(19) CI que não é GitHub Actions.** Checar também `.circleci/`, `.gitlab-ci.yml`, `Jenkinsfile`,
  `.travis.yml`, `azure-pipelines.yml`. Sem isso, projetos sérios viram falso negativo.
- **(21)** Headline de bot e de squash distorce a medição. Excluir autores-bot conhecidos. Mensagem
  em português não é mensagem pior.
- **(23) Biblioteca corretamente omite lockfile.** Variante para `library`: sem penalidade,
  substituída por *"restrições de versão declaradas"*. Errar isso sinaliza, para qualquer
  desenvolvedor experiente, que a ferramenta não sabe do que está falando.
- **(24)** Só se aplica a `service` e `application`. A variante de `library` é `PUBLISHED_PACKAGE`.

### 2.5 Open Source Maturity — `OSS`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 25 | `LICENSE_RECOGNIZED` | repo-agg | S | `licenseInfo.spdxId` + `byteSize` do arquivo | |
| 26 | `RELEASES_AND_VERSIONING` | repo-agg | S | `releases.totalCount`, semver da tag mais recente | |
| 27 | `CONTRIBUTING_AND_TEMPLATES` | repo-agg | S | `/community/profile`: contributing, issue e PR template | |
| 28 | `CODE_OF_CONDUCT_PRESENT` | repo-agg | S | `/community/profile` | |
| 29 | `SECURITY_POLICY_PRESENT` | repo-agg | S | `SECURITY.md` na árvore ou em `.github/` | |

**Falsos positivos:**

- **(25) Fork herda `licenseInfo` do pai.** Excluir forks.
- **(26)** Aplicativo e dotfiles não fazem release. Variante para `application` e
  `config-dotfiles`: substituir por `CHANGELOG_PRESENT`.
- **(27)(28) Só faz sentido em repositório que convida contribuição.** Condicionar a ≥10 stars ou
  >1 contribuidor; fora disso, neutro `0.5`. Dizer a um desenvolvedor solo que a ferramenta pessoal
  dele precisa de Code of Conduct queima a confiança na hora.

### 2.6 Maintenance — `MNT`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 30 | `COMMIT_RECENCY` | repo-agg | S | `defaultBranchRef.target.committedDate` | |
| 31 | `COMMIT_CADENCE` | repo-agg | S | `history(since: -365d).totalCount` | |
| 32 | `RELEASE_RECENCY` | repo-agg | S | `latestRelease.publishedAt` | |
| 33 | `ISSUE_HYGIENE` | repo-agg | S | Issues abertas, idade mediana, razão de fechamento | |
| 34 | `CI_STATUS` | repo-agg | B/P | `checkSuites` do commit head: conclusão e `updatedAt` | |

Faixas de `COMMIT_RECENCY` — tabela, não fórmula (ver [`rubric-v1.md` §11](rubric-v1.md)):

| Último commit | Nota |
| --- | ---: |
| ≤ 30 d | 1.00 |
| ≤ 90 d | 0.85 |
| ≤ 180 d | 0.70 |
| ≤ 365 d | 0.50 |
| ≤ 730 d | 0.25 |
| > 730 d | 0.05 |

**Falsos positivos:**

- **(30) Terminado não é abandonado.** Se `isArchived`, conceder neutro `0.70` rotulado
  *"arquivado — intencional"*. Uma biblioteca estável e completa não precisa de commit mensal.
- **(31)** Fluxo de squash-merge comprime a contagem. Usar faixas largas.
- **(34)** Workflow instável, abandonado ou quebrado por permissão gera ruído. Só dispara negativo
  quando a suite rodou há menos de 90 dias **e** as **duas** últimas conclusões foram `FAILURE`.

### 2.7 Professional Hygiene — `HYG`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 35 | `SECRETS_SUSPECTED` | repo-agg | S + cap | Entradas: `.env`, `*.pem`, `id_rsa`, `*.p12`, `serviceAccount*.json`, `.npmrc` | |
| 36 | `COMMITTED_ARTIFACTS` | repo-agg | S | `node_modules/`, `dist/`, `build/`, `target/`, `venv/`, `.DS_Store` | |
| 37 | `GITIGNORE_PRESENT` | repo-agg | S | `.gitignore` com `byteSize > 100` | |
| 38 | `PROFILE_IDENTITY_COMPLETE` | profile | S | `name`, `company`, `location` | |
| 39 | `COMMIT_AUTHORSHIP` | repo-agg | S | `author.user.login` dos 100 últimos commits | |

**Falsos positivos:**

- **(35) A redação importa mais que a detecção.** Sempre *"um arquivo chamado X está versionado —
  verifique se não contém segredo"*. **Nunca** *"você vazou uma credencial"*. A ferramenta viu um
  nome de arquivo na árvore; ela não leu o conteúdo e não sabe. Allowlist obrigatória:
  `.env.example`, `.env.sample`, `.env.template`, `.env.dist`, `config/credentials.yml.enc`
  (Rails, criptografado, legítimo).
- **(36) `vendor/` é legítimo em Go. `dist/` é legítimo em GitHub Pages. `build/` é legítimo em site
  de documentação.** Condicionar por linguagem e tipo de projeto. `.DS_Store` é sempre verdadeiro
  positivo — e é um achado que dá gosto de entregar.
- **(38) Avatar padrão NÃO É detectável** pelo Quick Scan: o GitHub serve identicon pela mesma forma
  de URL. Fora da v1; não tente inferir.
- **(39) O mais perigoso do catálogo, e o melhor anti-gaming sem clone.** `author.user` é `null`
  para e-mail não vinculado, o que é comuníssimo. Repositório de time é normal. Só dispara quando a
  **maioria** resolve para um **login real diferente**, em repositório não-fork. **NUNCA** dispara
  por `null`.

### 2.8 Discoverability — `DIS`

| # | Código | Escopo | Tipo | Evidência | LLM |
| --: | --- | --- | :-: | --- | :-: |
| 40 | `REPO_DESCRIPTION` | repo-agg | S | `repository.description` — 0 / <20 chars 0.4 / 1.0 | |
| 41 | `REPO_TOPICS` | repo-agg | S | `repositoryTopics` — 0 / 1–2 → 0.5 / ≥3 → 1.0 | |
| 42 | `PROFILE_WEBSITE` | profile | S | `user.websiteUrl` | |
| 42a | `PROFILE_SOCIAL` | profile | S | `socialAccounts { provider url }` — LinkedIn vale cheio; outra rede, 0.6 | |
| 42b | `PROFILE_EMAIL` | profile | S | `email` do REST `/users/{login}` | |
| 43 | `REPO_HOMEPAGE_URL` | repo-agg | S | `homepageUrl`, metadados de pacote | |

Sem risco relevante de falso positivo. São os achados mais baratos de corrigir e os de maior razão
impacto/esforço do produto.

### 2.9 Bônus, penalidades e meta

| # | Código | Escopo | Tipo | Evidência |
| --: | --- | --- | :-: | --- |
| 44 | `PUBLIC_CONTRIBUTIONS` | profile | B | PRs mergeados em repositórios de terceiros. Teto +6 |
| 45 | `TRACTION` | repo-agg | B | `stargazerCount`, `forkCount`, por tabela de faixas. Teto +5 |
| 46 | `PORTFOLIO_FORK_RATIO` | portfolio | P | Razão de forks. **v1: severidade `info`, zero ponto** |
| 47 | `REPO_MATERIALITY` | repo | M | `defaultBranchRef = null`, ou <10 entradas e README <500 B |

**Falsos positivos:**

- **(45) NUNCA vira penalidade.** Popularidade não é controlável e stars são compráveis. Dizer a um
  bom engenheiro que o trabalho dele é ruim porque é obscuro é indefensável.
- **(46) Fork é como se contribui upstream.** Na v1 não pontua. Só seria considerado com razão >0.6
  **e** nenhum fork com star ou release — e mesmo assim, provavelmente não vale o risco.
- **(47)** Não zera o repositório: **exclui** da pontuação. Previne a reclamação legítima *"meu
  utilitário de 3 arquivos tirou 22"*.

---

## 3. Algoritmos que o coletor DEVE implementar

### 3.1 Resolução de README

O caso real que motiva isto: no perfil de calibração, `vault` e o repositório de perfil
`octo-example` usam **`README.MD`** em maiúsculas. `object(expression: "HEAD:README.md")` retorna
`null` para os dois.

```ts
const DOC_EXTS = ['', '.md', '.markdown', '.mdown', '.mkdn', '.rst', '.txt', '.adoc', '.org'];
const isReadmeName = (n: string) =>
  DOC_EXTS.some((ext) => n.toLowerCase() === `readme${ext}`);

/** Precedência do próprio GitHub: raiz > .github/ > docs/. Desempate determinístico. */
function resolveReadme(root: TreeEntry[], dotGithub: TreeEntry[], docs: TreeEntry[]) {
  const cands = [
    ...root.map((e) => ({ e, rank: 0 })),
    ...dotGithub.map((e) => ({ e, rank: 1 })),
    ...docs.map((e) => ({ e, rank: 2 })),
  ].filter(({ e }) => e.type === 'blob' && isReadmeName(e.name));

  cands.sort(
    (a, b) =>
      a.rank - b.rank ||
      DOC_EXTS.indexOf(extOf(a.e.name)) - DOC_EXTS.indexOf(extOf(b.e.name)) ||
      a.e.name.localeCompare(b.e.name, 'en'),
  );

  return cands[0]?.e ?? null; // preserva o caso EXATO, para o permalink
}
```

A regra geral: **nenhuma busca de arquivo DEVE usar caminho fixo.** Sempre resolver a partir da
árvore, comparando em minúsculas e preservando o nome original para a evidência.

### 3.2 Escadas de substância

Existência de arquivo não é nota. Cada escada abaixo usa **apenas dados do Quick Scan**.

**`LICENSE_RECOGNIZED`** — a mais limpa que existe, porque o `licenseInfo` do GitHub vem do
`licensee`, que faz **casamento de conteúdo**, não de nome de arquivo. Licença vazia ou adulterada
resulta em `null` ou `NOASSERTION` sozinha.

| Situação | Nota |
| --- | ---: |
| `spdxId` é identificador SPDX real | 1.00 |
| `licenseInfo` presente, `spdxId = NOASSERTION` | 0.30 |
| Entrada `LICENSE` existe, `licenseInfo = null` | 0.00 |
| Sem entrada `LICENSE` | 0.00 |

> **Por que arquivo ilegível vale zero, e não crédito parcial.** A versão anterior
> desta escada dava 0.15 para "existe um LICENSE que o GitHub não reconheceu". O
> teste de mutação *"adicionar arquivo vazio nunca aumenta a nota"* reprovou: criar
> um `LICENSE` em branco subia a nota geral. Crédito parcial ali recompensa esforço
> que não entrega **nenhuma** clareza jurídica — que é o objetivo inteiro da regra.
> `NOASSERTION` continua valendo 0.30 porque aí o GitHub detectou texto de licença
> e apenas não conseguiu classificá-lo; é situação diferente.

**`ARCHITECTURE_DOC_SUBSTANTIVE`** — um blob, 2 a 8 KB.

| Situação | Nota |
| --- | ---: |
| Ausente | 0.00 |
| Presente, <800 bytes ou <120 palavras | 0.25 |
| ≥120 palavras, ≥3 headings, sem descrição de componente segundo o modelo | 0.50 |
| Modelo indica descrição de componentes e fronteiras | 0.75 |
| Acima + mermaid ou imagem + **≥2 módulos citados que resolvem para entradas reais da árvore** | 1.00 |

A checagem cruzada contra a árvore é o núcleo anti-gaming: encher de texto não passa de 0.75.

**`TESTS_SUBSTANTIVE`** — note que diretório **vazio não existe em git**; o vetor real é diretório
com um arquivo placeholder.

| Situação | Nota |
| --- | ---: |
| Nada encontrado, e linguagem não é Rust nem Go | 0.00 |
| Encontrado, mas <2 arquivos ou <1500 bytes agregados | 0.25 |
| ≥2 arquivos, ≥1500 bytes | 0.60 |
| Acima + workflow invoca comprovadamente um runner de teste | 0.85 |
| Acima + execução em matriz ou ≥2 jobs | 1.00 |
| **Rust ou Go, nada encontrado após varrer `src/`** | **neutro 0.5, confiança baixa** |

**`CI_WORKFLOW_SUBSTANTIVE`** — nome de arquivo não prova nada; buscar o YAML.

| Situação | Nota |
| --- | ---: |
| Nenhum workflow em nenhum provedor | 0.00 |
| Existe, mas só dispara por `workflow_dispatch`, ou nenhum `run:` casa com o léxico de comandos | 0.25 |
| Roda build ou lint | 0.60 |
| Roda comando de teste | 0.85 |
| Acima + matriz ou ≥2 jobs | 1.00 |

E então a checagem que torna tudo real: `checkSuites` no commit head dá a conclusão de verdade. Um
workflow que nunca rodou, ou vermelho há meses, é pego.

### 3.3 Coleta em duas fases

**Fase 1** (1 ponto de rate limit): perfil, fixados, N repositórios com metadados,
`defaultBranchRef.target { oid, committedDate, history(first:100), checkSuites }`, árvore raiz e
árvore `.github`.

**Fase 2** (1 ponto): blobs dos caminhos **já resolvidos** — README, ARCHITECTURE, CONTRIBUTING,
cada YAML de workflow. Cerca de 10 repositórios × 4 blobs = 40 aliases numa query.

> **A fase 2 DEVE montar as expressões a partir do `oid` capturado na fase 1** — `${oid}:${caminho}`
> —, **nunca** a partir de `HEAD:`. Se a pessoa der push entre as duas fases, `HEAD:` entrega blobs
> de uma árvore que nunca foi inspecionada, e a evidência deixa de corresponder aos fatos. É um bug
> de reprodutibilidade que custa uma linha para evitar.

### 3.4 Demais armadilhas do coletor

| Armadilha | Tratamento |
| --- | --- |
| Branch default não é `main` nem `master` | Usar `defaultBranchRef.name`, depois o `oid` |
| Repositório vazio | `defaultBranchRef` é `null` e toda query de árvore retorna `null`. Não pode quebrar |
| Fork | Herda README, LICENSE e detecção de licença. Excluído da pontuação por repositório; conta apenas em `CUR` |
| Repositório docs-only | `primaryLanguage` é `null` e `languages` vem vazio. Toda regra condicionada a linguagem precisa tolerar isso |
| Perfil de `Organization` | Tem `pinnedItems`, não tem `bio`. `POS` inteira perde sentido. Recusar com mensagem clara em vez de pontuar uma casca vazia |
| Normalização de URL | `github.com/user/`, `?tab=repositories`, `www.`, barra final, URL de repositório colada no lugar de perfil. Função pura, arquivo de teste próprio |

---

## 4. Casos-armadilha obrigatórios de teste

Nenhum destes pode gerar achado negativo. São critério de aceite, não sugestão.

| Caso | O que não pode acontecer |
| --- | --- |
| Projeto Rust com `#[cfg(test)]` inline | `TESTS_SUBSTANTIVE` acusar ausência de testes |
| Biblioteca publicada sem lockfile | `DEP_MANIFEST_LOCKFILE` penalizar |
| Repositório arquivado, parado há 3 anos | `COMMIT_RECENCY` tratar como abandono |
| Repositório docs-only, sem linguagem | Qualquer regra de `ENG` emitir negativo |
| Monorepo com manifestos em `packages/` | `DOC_CLAIM_UNCORROBORATED` disparar |
| Repositório com `README.MD` maiúsculo | `REPO_README_PRESENT` acusar ausência |
| Repositório de time, commits de colegas | `COMMIT_AUTHORSHIP` acusar apropriação |
| Ferramenta pessoal solo, 2 stars | `CONTRIBUTING_AND_TEMPLATES` cobrar Code of Conduct |
| Go com `vendor/` versionado | `COMMITTED_ARTIFACTS` penalizar |
| `.env.example` na raiz | `SECRETS_SUSPECTED` disparar |

---

## 5. Adiado para v1.1

Projetados agora no schema de `Facts` para não exigir migração depois, mas **não** pontuados na v1:

| Código | Por que não entra ainda |
| --- | --- |
| `PORTFOLIO_TUTORIAL_DRAG` | Propenso demais a falso positivo. `learn-rust` pode ser material didático real. Exigiria corroboração do modelo **e** ausência de descrição **e** ausência de README **e** <5 stars |
| `TYPE_SAFETY_CONFIG` | Precisa da rigorosidade do `tsconfig`, que exige um blob a mais |
| `DEPENDENCY_FRESHNESS` | Blob do lockfile + consulta à OSV. Uma chamada externa; é "Quick Scan+" |
| `GAMING_SUSPECTED` | Correlacionar concentração de `pushedAt` entre repositórios com o surgimento simultâneo de `LICENSE`/CI/`ARCHITECTURE.md` minúsculos e nenhum commit posterior. Poderoso, mas precisa de base histórica que ainda não existe |
