# Backend

> Camadas, portas e convenções de implementação. Estrutura geral em
> [`arquitetura.md`](arquitetura.md); entidades em [`data-model.md`](data-model.md).

---

## 1. Camadas

```
presentation   route handlers do Next, serializadores, SSE
    ↓
application    casos de uso, portas, orquestração
    ↓
domain         entidades, invariantes, rubrica, motor de pontuação
    ↑
infrastructure implementa as portas: Octokit, Prisma, Clerk, provedor de LLM
```

`domain` não importa nada de framework. `application` conhece portas, nunca adaptadores.

---

## 2. Portas

Todas declaradas em `application/ports`, implementadas em `infrastructure`.

```ts
interface GitHubSource {
  collectProfile(login: string, token: AccessToken): Promise<Result<RawProfile, CollectError>>;
  collectRepositories(login: string, token: AccessToken): Promise<Result<RawRepos, CollectError>>;
  collectBlobs(refs: BlobRef[], token: AccessToken): Promise<Result<RawBlobs, CollectError>>;
  communityProfile(owner: string, repo: string, token: AccessToken): Promise<Result<Community, CollectError>>;
}

interface SemanticAnalyzer {
  interpret(pack: EvidencePack): Promise<Result<InterpretedSignals, InterpretError>>;
}

interface ScanStore {
  insertEvaluation(e: NewEvaluation, tenant: TenantContext): Promise<Result<Evaluation, StoreError>>;
  insertSnapshots(s: Snapshots, tenant: TenantContext): Promise<Result<void, StoreError>>;
  findReport(id: EvaluationId, tenant: TenantContext): Promise<Result<Report | null, StoreError>>;
  findHistory(login: string, tenant: TenantContext): Promise<Result<Evaluation[], StoreError>>;
}

interface Clock { now(): Instant }
interface Ids   { next(): string }
```

`Clock` e `Ids` existem porque `new Date()` e `crypto.randomUUID()` são proibidos em domínio e
aplicação. Não é purismo: é o que torna o motor de pontuação testável por arquivo golden.

---

## 3. Erros

Falha esperada retorna `Result<T, E>`. Exceção é para o inesperado e vira `AppError` na borda.

```ts
type CollectError =
  | { kind: 'user_not_found'; login: string }
  | { kind: 'is_organization'; login: string }
  | { kind: 'no_public_repos'; login: string }
  | { kind: 'rate_limited'; resetAt: Instant }
  | { kind: 'token_invalid' }
  | { kind: 'upstream_unavailable'; status: number };
```

`is_organization` e `no_public_repos` são **resultados legítimos do domínio**, não falhas. Perfil de
organização não tem `bio` e a categoria `Positioning` inteira perde sentido; pontuar uma casca
vazia seria pior do que recusar com mensagem clara.

Erros de coleta são classificados em `retryable` e `terminal`. Só `rate_limited` e
`upstream_unavailable` são retentáveis, e mesmo assim com teto — o produto prefere relatório parcial
a espera longa.

---

## 4. Validação

Toda entrada externa é validada com Zod 4, `.strict()`. Isso inclui, sem exceção:

1. **Toda resposta do GitHub.** A API muda, campos ficam `null` em situações não óbvias
   (`defaultBranchRef` em repositório vazio, `primaryLanguage` em repositório docs-only), e um
   `undefined` propagado até o motor de pontuação vira `NaN` na nota.
2. **Toda saída de LLM.** Schema com `enum` fechado. Saída fora do domínio **NÃO DEVE** ser
   reparada nem reinterpretada — é erro, e degrada para neutro com `confidence: 'low'`.
3. Todo corpo de requisição HTTP e todo parâmetro de rota.

Tipos TypeScript não validam dado externo. Eles descrevem o que se espera; o Zod verifica o que
chegou.

---

## 5. O `EvidencePack`

A entrada do analisador semântico **NUNCA** é o repositório inteiro, nem o README bruto de dez
repositórios. É um pacote montado por `modules/insight`:

```ts
interface EvidencePack {
  subject: SubjectRef;
  purpose: 'project-type' | 'readme-clarity' | 'positioning' | 'architecture-depth';
  metadata: { description, topics, languages, projectTypeHint };
  readmeExcerpt: string;      // truncado, com marcação explícita de truncamento
  treeSummary: string[];      // caminhos, não conteúdo
  packageMetadata?: Record<string, unknown>;
  docExcerpts?: { path: string; text: string }[];
  aliases: Record<`E${number}`, EvidenceId>;
}
```

Três razões, nesta ordem: custo, latência e alucinação. Um pacote pequeno e nomeado reduz as três.

**Conteúdo coletado é dado, não instrução.** README e descrição são texto de terceiros e podem
conter tentativa de injeção. O prompt **DEVE** delimitá-los explicitamente e instruir que
instruções ali dentro não devem ser seguidas. A validação por enum na saída é a segunda linha de
defesa.

---

## 6. Provedor de LLM

Porta própria, sem SDK de fornecedor — ver [ADR-0009](adr/0009-llm-atras-de-porta.md).

Todo `AIRequest` carrega `promptId`, `promptVersion`, `outputSchema`, `maxOutputTokens`,
`temperature: 0`, `timeoutMs` e `budgetCents`. Toda chamada registra provedor, modelo, `promptId`,
`promptVersion`, `inputHash`, tokens, custo e latência.

**Prompts são versionados em arquivo.** Mudar um prompt sem incrementar `promptVersion` invalida a
comparação entre scans e envenena o cache — o `interpreterVersion` gravado na avaliação deixa de
significar alguma coisa.

**Cache por `inputHash`.** É a diferença entre um rescan barato e um rescan que custa o mesmo do
primeiro.

---

## 7. Motor de pontuação

Assinatura única, pura:

```ts
function score(
  facts: Facts,
  rubric: Rubric,
  persona: Persona,
  signals: Signal[],
): ScoreBreakdown;
```

Restrições, fiscalizadas por lint e por teste:

- Não faz I/O, não lê relógio, não lê `process.env`, não usa `Math.random`.
- Não usa `Math.log` nem `Math.pow` — não são especificados bit a bit pelo IEEE-754. Faixas
  logarítmicas usam tabela de limiares na rubrica.
- Itera apenas sobre arrays pré-ordenados.
- Arredonda só nas bordas.
- Assere que a trilha de auditoria fecha, com epsilon `1e-9`, e lança em desenvolvimento e teste.

O "agora" entra por `facts.scanAt`. É a fonte de não-determinismo mais comum em produtos deste tipo,
via lógica de recência.

---

## 8. Persistência

Convenções em [`data-model.md` §4](data-model.md). O que é regra de backend:

- Repositórios de snapshot expõem **apenas** `insert` e `find`. Não existe caminho de `UPDATE`.
- Toda assinatura de repositório exige `TenantContext`. Sem isso o teste de vazamento não tem o que
  verificar.
- Transação **nunca** fica aberta durante chamada à API do GitHub ou ao LLM. Coleta primeiro,
  persistência depois.
- Migrations aplicadas por executor único — job dedicado ou advisory lock —, nunca no `CMD` de cada
  réplica.

---

## 9. Testes

| Camada | Como |
| --- | --- |
| `modules/scoring` | Arquivos golden + testes de propriedade + **Stryker**. Nunca chama LLM |
| `modules/collection` | Fixtures verbatim da API, incluindo os casos-armadilha do catálogo |
| Porta de LLM | Fake determinístico; contrato testado à parte com respostas gravadas |
| Persistência | Testcontainers com Postgres real |
| Ponta a ponta | Playwright |

Fixtures obrigatórias, porque cada uma representa um caso real que quebra uma implementação
ingênua: `README.MD` maiúsculo · conta sem repositório · só forks · repositório docs-only ·
Rust/Tauri com teste inline · monorepo · perfil de organização · perfil dominado por arquivados.
