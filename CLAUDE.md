# CLAUDE.md

> Contrato de trabalho para agentes de código neste repositório. Leia antes de qualquer alteração.
> Detalhamento: [`docs/arquitetura.md`](docs/arquitetura.md) · [`docs/backend.md`](docs/backend.md) ·
> [`docs/frontend.md`](docs/frontend.md) · [`docs/rubric/rubric-v1.md`](docs/rubric/rubric-v1.md)

---

## 1. Papel

Você é o **arquiteto de software e desenvolvedor principal**. Analise o repositório, compreenda o
domínio, proponha decisões coerentes, implemente de forma incremental e mantenha o sistema
confiável, testável, seguro, observável e adequado para produção.

**NÃO DEVE:**

- Construir somente uma prova de conceito.
- Reduzir o domínio a um MVP simplificado quando o planejamento solicitado for completo.
- Criar infraestrutura, pacotes ou abstrações sem responsabilidade concreta.
- Alterar regras de negócio para acomodar limitações da arquitetura escolhida.
- Declarar análise de partes do repositório que não foram efetivamente inspecionadas.

**DEVE:** preservar o repositório em estado executável e verificável ao final de cada fase.

---

## 2. Estado atual do repositório

A **fatia vertical determinística está implementada e roda**: coleta do GitHub, normalização,
51 regras, motor de pontuação, recomendações com contrafactual e relatório. **Sem LLM** — os slots
interpretativos caem em variante neutra de baixa confiança, por projeto.

Antes de mexer na nota, leia [`docs/rubric/rubric-v1.md`](docs/rubric/rubric-v1.md) inteiro. É o
documento que define o produto; arquitetura e stack existem para servi-lo.

```
pnpm install
GITHUB_TOKEN=$(gh auth token) pnpm --filter @audit/web dev     # http://localhost:4310
GITHUB_TOKEN=$(gh auth token) pnpm scan octo-example senior-engineer
pnpm verify                                                     # lint + typecheck + testes + build
```

---

## 3. Hierarquia de fontes de verdade

| # | Fonte |
| --- | --- |
| 1 | Regras e invariantes do domínio |
| 2 | `docs/rubric/rubric-v1.md` e `docs/rubric/rules-catalog-v1.md` — a rubrica **é** regra de domínio |
| 3 | Requisitos e critérios de aceite aprovados (`docs/prd.md`) |
| 4 | ADRs vigentes (`docs/adr/`) |
| 5 | `docs/arquitetura.md`, `docs/backend.md`, `docs/frontend.md` |
| 6 | Código existente — evidência do estado atual, **não** prevalece sobre regras aprovadas |

**Linguagem normativa:** **DEVE/NÃO DEVE** = obrigatório (violação exige ADR de exceção) ·
**DEVERIA** = recomendação forte · **PODE** = opcional.

---

## 4. Princípio central

> **Complexidade de domínio não deve ser reduzida artificialmente.**
> **Complexidade de infraestrutura só deve existir quando houver necessidade concreta.**

E, específico deste produto:

> **A nota é um produto de engenharia, não de opinião.** Toda unidade de pontuação DEVE ser
> rastreável até uma evidência, e o caminho evidência → nota DEVE ser reproduzível por replay puro.

### 4.1 Registro de capacidades

Capacidade desativada significa que **o código não existe** — não fica comentado, nem vazio, nem
"pronto para o futuro".

| Capacidade | Estado | Gatilho de ativação |
| --- | --- | --- |
| `CORE` | **ON** | Sempre |
| `PERSISTENCE` | **ON** | Snapshots imutáveis e histórico são requisito de produto |
| `MULTI_TENANT` | **ON** | Produto hospedado multiusuário desde a v1 |
| `AI_ENABLED` | **ON** a partir do Épico 5 | Semantic Analyzer entra em produção |
| `ASYNCHRONOUS` | **OFF** | Deep Scan (Épico 9), **ou** Quick Scan com p95 > 25 s |
| `DURABLE_WORKFLOW` | OFF | — |
| `EVENT_DRIVEN` | OFF | — |
| `DISTRIBUTED` | OFF | — |
| `REGULATED` | OFF | Análise de repositório privado pode disparar reavaliação |

Enquanto `ASYNCHRONOUS` estiver OFF: **não existe `apps/worker`, não existe Redis, não existe
BullMQ**. O orquestrador de scan é uma biblioteca chamada em processo. Ver
[ADR-0010](docs/adr/0010-asynchronous-off-na-v1.md).

---

## 5. Regras invioláveis

Fiscalizadas no CI. Violá-las quebra o build.

### 5.1 Herdadas do padrão de arquitetura

1. **Direção de dependências:** `domain` → nada; `application` → `domain`; `presentation` →
   `application`; `infrastructure` → implementa ports.
2. **Domínio isolado:** não importa Next.js, Prisma, SDKs, `process.env`, `node:fs` ou logger.
3. **Sem imports internos entre módulos** — só a API pública (`index.ts` + `package.json#exports`).
4. **Sem dependências circulares.**
5. **`process.env` só em `platform/config`.** Prisma só em `infrastructure/persistence`.
6. **Sem regra de negócio** em route handler, middleware, serializer ou componente visual.
7. **Toda entrada externa é validada em runtime com Zod** (`.strict()` em schemas de entrada).
   Isso inclui **toda resposta da API do GitHub e toda saída de LLM**.
8. **Falhas esperadas retornam `Result<T, E>`**; exceções viram `AppError` na borda.
9. **Cada tabela tem exatamente um módulo proprietário.**
10. **Transação nunca fica aberta durante chamada externa.**
11. **Capacidades ambientais são injetadas:** `clock.now()`, `ids.next()` — nunca `new Date()` ou
    `crypto.randomUUID()` em domínio/aplicação.
12. **Nunca** logar tokens, secrets ou dados pessoais desnecessários. O token do GitHub **NÃO DEVE**
    aparecer em log, em telemetria ou em prompt de LLM.
13. **Arquivos de implementação:** alvo ≤ 300 linhas; > 400 proibido salvo schema declarativo ou ADR.
14. **Consulte o context7 antes de instalar ou usar qualquer biblioteca.**

### 5.2 Específicas deste produto

Estas quatro definem o produto. Violá-las não é dívida técnica — é defeito de domínio.

15. **`packages/modules/scoring` NÃO DEVE importar nada além de `packages/shared/kernel` e `packages/shared/contracts`.** Sem I/O,
    sem relógio, sem `process.env`, sem rede, sem banco. `score()` é função total e pura: dadas as
    mesmas entradas, o mesmo resultado, para sempre. Fiscalizado por lint de import e por regra que
    proíbe `Date.now`, `new Date`, `Math.random`, `Math.log` e `Math.pow` sob esse diretório.
16. **Nenhum `Signal` DEVE existir sem ao menos um `EvidenceId`.** A invariante é verificada na
    construção e lança em caso de violação. Sinal sem evidência é defeito, não caso degradado.
17. **Nenhuma `Recommendation` DEVE existir sem ao menos um `Finding` de origem.** O gerador de
    recomendações **NÃO DEVE** inventar ação a partir de texto livre de LLM.
18. **Um LLM NUNCA DEVE emitir um número que entre na nota.** Sinal produzido por modelo é sempre
    `enum` de 3 a 5 níveis. A tradução enum → nota é dado da rubrica, revisável em diff.

**Adicionalmente, no frontend:**

- `app/**/page.tsx` **não contém HTML** — compõe uma tela de `features/<f>/screens/`.
- **TanStack Query é o único cache de servidor.** Dado de servidor nunca vai para o Zustand.
- **Nenhuma cor, espaçamento, raio ou sombra fora dos tokens.**
- **Um score NUNCA DEVE ser renderizado sem o rótulo da persona que o produziu.**
- **Categoria com mais de 30% do denominador vindo de sinal de baixa confiança DEVE exibir marcador
  de "parcialmente interpretado".** Sinal de LLM não pode ter o mesmo peso visual que
  `licenseInfo.spdxId`.

---

## 6. Regras de escrita de achado

O produto acusa problemas no trabalho público de uma pessoa real. O tom não é detalhe de copy — é
requisito. Um falso positivo confiante custa mais credibilidade do que dez achados verdadeiros
ganham.

- **DEVE** afirmar apenas o que a evidência sustenta. *"Um arquivo chamado `.env` está versionado —
  verifique se não contém segredo"*, **nunca** *"você vazou uma credencial"*.
- **DEVE** dizer "não avaliado" quando a evidência for ambígua. Ausência de sinal **NÃO DEVE** virar
  sinal negativo. O caso canônico está no catálogo: Rust e Go não têm diretório `tests/`.
- **NÃO DEVE** penalizar o que a pessoa não controla — popularidade, idioma, ou trabalho que vive em
  repositório privado de empregador.
- **NÃO DEVE** cobrar prática de projeto colaborativo em ferramenta pessoal solo.
- **DEVE** recompensar arquivar repositório morto. É a ação correta.

---

## 7. Onde procurar cada coisa

| Pergunta | Documento |
| --- | --- |
| Por que este produto existe, para quem | `docs/prd.md` |
| Como a nota é calculada, o que é slot, cap, persona | `docs/rubric/rubric-v1.md` |
| O que exatamente é verificado, e onde erra | `docs/rubric/rules-catalog-v1.md` |
| Quais são os deployables, módulos e o pipeline | `docs/arquitetura.md` |
| Como escrever um caso de uso, uma porta, uma migration | `docs/backend.md` |
| Como montar uma tela, um gráfico de score | `docs/frontend.md` |
| Que tabelas existem e o que é imutável | `docs/data-model.md` |
| Por que uma decisão foi tomada | `docs/adr/` |
| O que vem depois | `docs/roadmap.md` |
