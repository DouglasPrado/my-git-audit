# Modelo de dados

> Entidades, imutabilidade e a gramática de identificadores. Convenções de ORM em
> [`backend.md`](backend.md).

---

## 1. Princípio

> **Um scan é um fato histórico, não um registro atualizável.**

Nada que descreve o estado observado do GitHub é sobrescrito. Rescan cria linhas novas. É o que
torna possível o diff entre scans, a re-pontuação com rubrica nova e a auditoria de por que a nota
era aquela em determinada data. Ver [ADR-0007](adr/0007-snapshots-imutaveis.md).

**Consequência prática:** persistir `Facts`, `Evidence` e `Signal[]` — não apenas a nota. Sem os
fatos armazenados, `rubricVersion` é decoração: não há como re-pontuar coisa alguma.

---

## 2. Entidades

### 2.1 Identidade e posse

```
User                      # espelho do usuário Clerk
├── id                    # clerkUserId
├── githubLogin
└── createdAt

Evaluation                # a unidade de trabalho
├── id
├── ownerId               # quem PEDIU o scan
├── subjectLogin          # quem foi ANALISADO (não é o mesmo)
├── persona
├── scanMode              # quick | deep
├── status
├── visibility            # private | unlisted | public
├── overallScore
├── confidence
├── rubricVersion, rubricHash
├── interpreterVersion, collectorVersion
├── rawScanHash, factsHash, signalsHash
├── scanAt                # o "agora" congelado; toda regra temporal lê daqui
└── createdAt, startedAt, completedAt
```

`ownerId ≠ subjectLogin` é ponto central do domínio: qualquer pessoa pode auditar qualquer perfil
público. O isolamento multi-tenant é sobre *quem pediu e quem pode ver*, jamais sobre *quem foi
analisado*.

`scanAt` existe para que o motor de pontuação seja puro. Regra de recência **NÃO DEVE** ler o
relógio; lê este campo.

### 2.2 Observação

```
RawScan                   # resposta verbatim da API, endereçada por hash
├── id, evaluationId
├── payload               # JSONB
└── hash                  # sha256(canonicalJson(payload))

ProfileSnapshot           # imutável
├── id, evaluationId
├── login, name, bio, websiteUrl, location, company
├── followers
├── profileReadmePath     # caso EXATO, ex.: "README.MD"
├── profileReadmeText
└── pinned                # JSONB, ordenado

RepositorySnapshot        # imutável
├── id, evaluationId
├── owner, name, description, homepageUrl
├── isFork, isArchived, isEmpty
├── projectType           # classificado, não dado do GitHub
├── prominence            # 3 fixado | 2 topo | 1 demais
├── defaultBranch, commitOid    # o OID escaneado — base de todo permalink
├── topics, languages     # JSONB, ordenados
├── licenseSpdxId
├── stars, forks, openIssues, releasesCount
├── lastCommitAt, commitsLast365
├── rootTree, githubTree  # JSONB, ordenados
└── selected, exclusionReason
```

`commitOid` é o que faz o permalink da evidência continuar correto daqui a um ano. Sem ele, um link
para `README.md:182` aponta para a linha 182 de **hoje**, que pode ser outra coisa.

### 2.3 Cadeia de avaliação

```
Evidence
├── id                    # chave natural — ver §3
├── evaluationId
├── kind, subjectKey
├── locator               # JSONB: url, path (caso exato), lineStart/End, jsonPointer
├── value                 # JSONB
├── snippet               # verbatim, ≤240 chars
├── source                # graphql | blob | derived
└── derivedFrom           # obrigatório quando source = derived

Signal
├── id, evaluationId, code, subjectKey
├── value                 # { type, value } — enum quando vem de LLM
├── confidence            # high | medium | low
├── producer              # JSONB: determinístico(fn,v) ou llm(model,promptId,promptVersion)
├── evidenceIds           # INVARIANTE: não vazio
└── rationale             # prosa do modelo. Exibida. NUNCA usada em cálculo

Finding
├── id, evaluationId, ruleCode, slotId, category, subjectKey
├── grade                 # 0..1, encaixado nas faixas da regra
├── gradeLabel            # absent | stub | partial | good | exemplary
├── polarity, severity
├── applicable, applicabilityReason
├── title, detail         # template determinístico, sem prosa de LLM
├── evidenceIds, signalIds
└── confidence            # mínimo entre os sinais contribuintes

Score / CategoryScore
├── evaluationId, category
├── score
├── math                  # JSONB: earned, possible, floor, base, bonus, penalty, preCap, postCap
├── contributions         # JSONB[]: kind, label, points assinado, evidenceIds
├── caps                  # JSONB[]: capId, ceiling, valueBefore, delta, binding, releasedBy
├── slotsNotAssessed
└── confidenceMix         # { high, medium, low } — fração do denominador

Recommendation
├── id, evaluationId, fromFindingIds     # INVARIANTE: não vazio
├── title, action, category, subjectKey
├── estimatedGain         # JSONB: contrafactual calculado, não estimado
├── effort                # S | M | L
└── evidenceIds
```

`Signal.rationale` é a prosa do modelo. Ela **DEVE** ser exibida e **NÃO DEVE** entrar em nenhuma
conta. É a fronteira concreta entre "o modelo explica" e "o modelo decide".

### 2.4 Operação

```
ScanEvent                 # append-only, alimenta o SSE e o debug
├── id, evaluationId, type, payload, at

RubricVersion             # catálogo das rubricas publicadas
├── version, hash, publishedAt, changelog
```

---

## 3. Gramática de `EvidenceId`

Identificadores são **chaves naturais construídas a partir de coordenadas de conteúdo**. Nunca
índice de array, nunca timestamp, nunca UUID.

```
ev:{subjectKey}#{kind}:{selector}

ev:profile:octo-example#profile.field:bio
ev:repo:octo-example/vault#tree.entry:README.MD
ev:repo:octo-example/vault#file.span:README.MD@L180-L192
ev:repo:octo-example/vault#derived.metric:readme.headingCount
ev:repo:octo-example/pane#check.suite:build.yml@latest
```

Três consequências, todas desejadas:

1. **A mesma evidência tem o mesmo id entre scans** — então o diff entre o scan N e o N−1 é feito
   por id: *"você adicionou LICENSE, você removeu o workflow de CI"*.
2. Arquivos golden ficam estáveis.
3. Não há geração de id não-determinística para caçar depois.

`subjectKey` é canônico e minúsculo: `profile:{login}` · `portfolio:{login}` ·
`repo:{owner}/{name}`.

### 3.1 Como um LLM referencia evidência

**Não** se coloca id canônico no prompt. São strings longas e opacas, convidam a erro de
transcrição e não há como validar barato. Em vez disso, cada chamada recebe uma **tabela de apelidos**
e o schema de saída restringe o campo por `enum`:

```ts
interface InterpreterCall {
  promptId: string;
  promptVersion: number;
  model: string;
  temperature: 0;
  aliases: Record<`E${number}`, EvidenceId>; // E1..En, em ordem canônica
  schema: JSONSchema;                        // evidenceRefs: { enum: ['E1', ..., 'En'] }
  inputHash: string;                         // sha256(canonicalJson(payloads))
}
```

O modelo **não consegue** emitir id fora do enum sem falhar a validação. Depois de validado, os
apelidos são expandidos e a tabela é persistida junto da chamada, para auditoria.

`inputHash` é a chave de cache do sinal: **README idêntico produz sinal idêntico para sempre.** É
boa parte do que faz "reproduzível" ser verdade operacional.

---

## 4. Convenções de schema

Herdadas do padrão dos demais repositórios:

- Prisma 7, generator `prisma-client`, `output` explícito dentro do pacote, driver adapter
  `@prisma/adapter-pg`. `datasource db` **sem `url`** — a CLI lê de `prisma.config.ts`.
- camelCase no Prisma, `@map("snake_case")` no banco, `@@map("table_name")`.
- `DateTime @db.Timestamptz(3)`, sempre UTC.
- **Id `String @id` sem `@default`**, gerado pela aplicação via porta `ids` injetada.
- JSON como `JSONB`. Enum como `TEXT` + `CHECK`.
- Migrations em `<pacote>/prisma/migrations/<YYYYMMDDHHMMSS>_snake_case/`, aplicadas por um
  executor único.

### 4.1 Imutabilidade, na prática

Tabelas de snapshot e da cadeia de avaliação **NÃO DEVEM** ter caminho de `UPDATE` no código.
Repositórios expõem apenas `insert` e `find`. A única entidade com mutação legítima é `Evaluation`,
e só no avanço de `status` e nos timestamps.

Isso **DEVE** ser fiscalizado por revisão e por teste: um repositório de snapshot que expõe `update`
é defeito de arquitetura, não conveniência.

### 4.2 Índices que o produto exige

| Índice | Para quê |
| --- | --- |
| `(ownerId, createdAt DESC)` | Listagem de scans do usuário |
| `(subjectLogin, createdAt DESC)` | Histórico e diff de um perfil |
| `(evaluationId)` em toda tabela filha | Montagem do relatório |
| `(evaluationId, category)` em `CategoryScore` | Trilha por categoria |
| `hash` em `RawScan` | Deduplicação e replay |

Todo índice de tabela multi-tenant **DEVE** ser composto começando por `ownerId`, e todo repositório
**DEVE** exigir o contexto de tenant na assinatura — sem isso, o teste de vazamento não tem o que
verificar.
