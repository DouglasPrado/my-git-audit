# Arquitetura

> Estrutura do sistema, deployables, módulos e pipeline. Regras de cálculo estão em
> [`rubric/rubric-v1.md`](rubric/rubric-v1.md); convenções de camada em
> [`backend.md`](backend.md) e [`frontend.md`](frontend.md).

---

## 1. Pipeline canônico

```
URL ──► Collector ──► RawScan          (verbatim, endereçado por hash, persistido)
                         │
                         ▼
                    Normalizer ──► Facts        (tipado, caso resolvido, ordenado)
                         │
                         ▼
              Evidence Extractor ──► Evidence[] (endereçável, com proveniência)
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
    Produtores determinísticos   Interpretadores LLM
        (funções puras)          (schema validado, enum)
               └─────────┬─────────┘
                         ▼
                     Signal[]        (todo sinal tem ≥1 EvidenceId)
                         │
                         ▼
                   Rule Engine ──► Finding[]
                         │
                         ▼
              Scoring Engine (PURO) ──► ScoreBreakdown
                         │
                         ▼
                   Recommender ──► Recommendation[]
```

**A direção é irreversível.** Nunca `Finding → Evidence`, nunca `Score → Finding`. Um achado sem
evidência não existe; uma recomendação sem achado não existe. Ver
[ADR-0003](adr/0003-avaliacao-evidence-first.md).

### 1.1 Duas invariantes que sustentam o resto

1. **`Signal.evidenceIds.length > 0`** — verificado na construção, lança em caso de violação. Sinal
   sem evidência é defeito, não caso degradado.
2. **`score(facts, rubric, persona, signals)` não faz I/O, não lê relógio e é função total.** Tudo
   a jusante do Normalizer é reexecutável a partir de dados armazenados.

O LLM nunca vê um peso, um valor de ponto ou uma nota. Vê evidência e devolve enum. A tradução
enum → nota é dado da rubrica.

---

## 2. Deployables

**Um.** `apps/web`, Next.js 16 App Router. Ver [ADR-0001](adr/0001-monolito-modular.md).

O orquestrador de scan **não é um serviço**. É `packages/modules/collection`, biblioteca agnóstica
de transporte, chamada em processo a partir de um route handler, com progresso entregue por SSE.

Enquanto a capacidade `ASYNCHRONOUS` estiver desligada:

> **Não existe `apps/worker`. Não existe Redis. Não existe BullMQ.** Não comentado, não vazio, não
> "pronto para o futuro".

Justificativa e gatilho de ativação em [ADR-0010](adr/0010-asynchronous-off-na-v1.md). O ponto que
torna isso barato: o orquestrador é escrito como biblioteca desde o primeiro dia, então trocar a
invocação em processo por um job BullMQ é mudança de borda, não reescrita do núcleo.

---

## 3. Módulos

`packages/modules/` — domínio. Comunicação só por API pública.

| Módulo | Responsabilidade | Não pode |
| --- | --- | --- |
| `collection` | GitHub → `RawScan` → `Facts` → `Evidence`. Seleção e ranking de repositórios | Conhecer rubrica ou nota |
| `scoring` | Rubrica, motor de cálculo, trilha de auditoria | Conhecer GitHub, fazer I/O, ler relógio |
| `insight` | Porta `SemanticAnalyzer`, montagem do `EvidencePack`, interpretadores | Emitir número |
| `audit` | Ciclo de vida da avaliação, estados, versionamento de scan | Calcular nota |
| `reporting` | `Finding` → `Recommendation`, montagem do relatório, diff entre scans | Inventar achado |

`packages/platform/` — `config`, `database`, `observability`.
`packages/shared/kernel` — `Result`, `AppError`, portas `Clock` e `Ids`, tipos de marca, JSON canônico.
`packages/shared/contracts` — o vocabulário comum: `SubjectRef`, `Evidence`, `Signal`, `Finding`,
`Facts`. Sem dependência alguma além do kernel. Existe para que `collection` e `scoring` falem a
mesma língua **sem** um depender do outro — a alternativa seria `scoring` importar `collection` só
para conhecer o formato de entrada, invertendo a direção do pipeline.

**`scoring` é o módulo mais restrito do repositório.** Depende apenas de `shared/kernel`. É o que
torna a nota testável por arquivo golden e verificável por teste de mutação.

---

## 4. Fronteira com o GitHub

O GitHub **não deve contaminar o domínio**.

```
Resposta do Octokit  →  RawScan  →  Facts  →  (daqui para frente, o domínio)
```

O motor de pontuação trabalha com `RepositorySnapshot`, nunca com `OctokitRepositoryResponse`. É o
que permite acrescentar GitLab, Bitbucket ou Codeberg como fonte sem reescrever o produto — e, mais
imediatamente, é o que torna possível testar tudo com fixtures. Ver
[ADR-0002](adr/0002-dominio-independente-do-github.md).

---

## 5. Coleta em duas fases

| Fase | Custo | O que traz |
| --- | --- | --- |
| 1 — descoberta | 1 ponto | Perfil, fixados, contribuições, e a lista paginada de repositórios com o mínimo para **selecionar** e medir ruído: nome, descrição, `isFork`/`isArchived`, `pushedAt`, stars, contagem de topics e árvore raiz |
| 2 — detalhe | 1 ponto | Apenas os **selecionados**, por alias: linguagens, licença, releases, issues, `defaultBranchRef.target { oid, committedDate, history(first:100), checkSuites }`, árvores raiz/`.github`/`workflows`/`src` |
| 3 — blobs | 1 ponto | Conteúdo dos caminhos **já resolvidos**: README, ARCHITECTURE, `package.json`, YAML de cada workflow |

**Por que três e não duas.** A divisão descoberta/detalhe não é elegância: pedir histórico e árvore
de 60 repositórios numa query só faz a API responder **502**. Medido. Cada fase isolada custa 1
ponto e responde em torno de 1 s; o scan inteiro fica em ~13 s para 8 repositórios, dominado pelas
chamadas REST de `community/profile`. Com 5000 pontos por hora, **o rate limit não é restrição** —
o gargalo é latência e, quando `AI_ENABLED` entrar, custo de modelo.

> **A fase 2 monta as expressões a partir do `oid` da fase 1**, nunca de `HEAD:`. Detalhe e
> justificativa em [`rubric/rules-catalog-v1.md` §3.3](rubric/rules-catalog-v1.md).

Complementarmente, `GET /repos/{owner}/{repo}/community/profile` (REST) entrega em uma chamada a
presença de licença, contributing, code of conduct e templates — a maior parte da categoria `OSS`.

---

## 6. Estados do scan

```
REQUESTED → COLLECTING_PROFILE → COLLECTING_REPOSITORIES → NORMALIZING
          → STATIC_ANALYSIS → SEMANTIC_ANALYSIS → SCORING
          → GENERATING_RECOMMENDATIONS → COMPLETED
```

### 6.1 Degradação parcial é requisito, não cortesia

Falha em análise semântica **NÃO DEVE** perder o scan. O resultado é relatório parcial com confiança
reduzida:

```
GitHub coletado           ✓
Análise estática          ✓
Análise semântica         timeout

Relatório parcial · confiança reduzida
Positioning não avaliado com confiança
```

Como a categoria carrega `confidenceMix` e as regras de LLM têm variante neutra, um relatório sem
análise semântica ainda é correto — só é menos informativo. Perder o scan inteiro por causa de uma
chamada de modelo seria desperdiçar coleta que já custou latência ao usuário.

---

## 7. Segurança

### 7.1 Análise estática apenas

Deep Scan roda contra código de terceiros. **NÃO DEVE** executar `npm install`, `pnpm build`,
`cargo build`, `make`, nem qualquer script do repositório analisado. Nenhum hook, nenhum
`postinstall`.

Se algum dia isso mudar, é pré-condição arquitetural — não detalhe de implementação: sandbox
efêmero, sem credencial, sem rede, limite de CPU e memória, timeout, sistema de arquivos somente
leitura. Ver [ADR-0008](adr/0008-analise-estatica-apenas.md).

### 7.2 Tratamento do token

O token de acesso do GitHub:

- **NUNCA** é enviado a um LLM;
- **NUNCA** aparece em log, telemetria, mensagem de erro ou trilha de auditoria;
- é lido apenas pelo adaptador de coleta, obtido sob demanda da Backend API do Clerk;
- é redigido por um serializador de log que falha o build se um campo de token for logável.

### 7.3 Conteúdo de terceiros é dado, não instrução

README, descrição e nome de repositório são texto escrito por terceiros e podem conter tentativa de
injeção de prompt. O `EvidencePack` **DEVE** delimitar conteúdo coletado como dado e o prompt
**DEVE** instruir explicitamente que instruções contidas nele não devem ser seguidas. A validação
por schema na saída é a segunda linha de defesa: o modelo só consegue devolver enum do domínio.

---

## 8. Multi-tenancy

`MULTI_TENANT` está ativo desde a v1. Toda linha derivada de scan carrega o dono, todo repositório
exige o contexto de tenant na assinatura, e há teste de vazamento entre contas.

Um detalhe do domínio que merece atenção: **o sujeito de um scan não é o dono do scan.** Qualquer
usuário pode auditar qualquer perfil público. O isolamento é sobre *quem pediu e quem pode ver o
relatório*, não sobre *quem foi analisado*. Ver [ADR-0013](adr/0013-multi-tenant-desde-a-v1.md).

---

## 9. Observabilidade

O risco econômico do produto é o custo por scan, e ele é dominado pelo analisador semântico.

**Métricas obrigatórias:** `scan_duration`, `github_api_points`, `repos_analyzed`, `blobs_fetched`,
`llm_tokens_in`, `llm_tokens_out`, `llm_cost_cents`, `llm_cache_hit_ratio`, `findings_count`,
`scan_failure_rate`, `semantic_failure_rate`, `partial_report_rate`.

**Correlação:** `evaluationId` em todo log e span.

`llm_cache_hit_ratio` é a métrica de saúde econômica: como o cache é por hash de conteúdo, um
rescan de perfil pouco alterado deveria acertar quase tudo. Taxa baixa indica chave de cache errada
ou prompt instável, e vai aparecer na fatura antes de aparecer em qualquer outro lugar.

---

## 10. Stack

| Camada | Escolha |
| --- | --- |
| Monorepo | pnpm + Turborepo · `apps/*`, `packages/{modules,platform,shared}`, `tooling` |
| Node | ≥ 22, ESM |
| Web | Next.js 16 App Router · React 19 · Tailwind v4 · shadcn/ui · TanStack Query · Zustand |
| Validação | Zod 4, `.strict()` em toda entrada |
| Banco | PostgreSQL 17 · Prisma 7 (generator `prisma-client`, `output` explícito, adapter `@prisma/adapter-pg`) |
| Auth | Clerk (`@clerk/nextjs` + `@clerk/backend`), GitHub como única social connection |
| GitHub | Octokit, GraphQL + REST |
| LLM | Porta `Provider` própria, sem SDK de fornecedor |
| Testes | Vitest · Playwright · **Stryker em `modules/scoring`** |
| Fiscalização | ESLint flat com fronteiras de arquitetura · dependency-cruiser · knip |
| Deploy | Dockerfile multi-stage Alpine → Easypanel |

**Consulte o context7 antes de instalar ou usar qualquer biblioteca.**

Duas escolhas merecem justificativa explícita:

- **Stryker em `modules/scoring`.** Teste de mutação é caro e raramente vale a pena — mas o motor de
  pontuação é puro, pequeno e é o artefato cuja corretude o produto vende. É exatamente o lugar
  onde cobertura de linha engana e mutação não.
- **LLM sem SDK de fornecedor.** Porta própria no molde de `@gba/ai-gateway`. O núcleo não deve
  depender de OpenAI nem de Anthropic; trocar de provedor não pode tocar em `modules/scoring`. Ver
  [ADR-0009](adr/0009-llm-atras-de-porta.md).

---

## 11. Fiscalização automatizada

Regra sem fiscal não é regra. O que o CI **DEVE** verificar:

| Regra | Como |
| --- | --- |
| `modules/scoring` não importa nada além de `shared/kernel` | ESLint `no-restricted-imports` + dependency-cruiser |
| Sem `Date.now`, `new Date`, `Math.random`, `Math.log`, `Math.pow` em `scoring/` e `rubric/` | ESLint `no-restricted-syntax` / `no-restricted-properties` |
| `process.env` só em `platform/config` | ESLint `no-restricted-properties` |
| Direção de dependências entre camadas | dependency-cruiser |
| Invariantes da rubrica (§4.10 da rubrica) | Teste que roda no boot e no CI |
| Rubrica publicada não mudou | `frozen.test.ts` comparando `rubricHash` |
| Trilha de auditoria fecha | Teste de propriedade sobre todas as fixtures |
| Nenhum código morto | knip |

**Cuidado herdado:** guarda de fronteira que nunca foi exercitada contra violação real não é guarda.
Lint verde não distingue *"nada violou"* de *"nada foi verificado"*. Cada regra acima **DEVE** ter
um teste que a viola de propósito e espera falha.
