# GitHub Profile Auditor

> **See what your GitHub says about you before a recruiter or engineer does.**

Auditoria técnica de portfólio. O usuário informa um perfil público do GitHub, o sistema coleta
evidências do perfil e dos repositórios relevantes e devolve uma nota de 0–100 **explicável**,
achados com proveniência e recomendações priorizadas por impacto e esforço.

O produto **não** mede quantidade de commits, stars ou seguidores. Ele mede como o trabalho está
apresentado, que sinais de engenharia ele transmite e o que melhorar primeiro.

## Por que isso existe

A API do GitHub responde `health_percentage: 100` para o repositório `vault` do perfil usado
como caso de calibração. No mesmo perfil, medido contra a API real em 2026-09-04, nos 6
repositórios fixados:

> **Sobre o perfil de calibração.** Os números abaixo são medições reais, feitas contra a API do
> GitHub durante a construção. Os identificadores foram trocados por nomes fictícios: publicar a
> auditoria de um perfil real — inclusive quais repositórios têm arquivo de credencial versionado —
> seria justamente o tipo de exposição que este produto existe para evitar. A fixture de teste em
> `packages/modules/scoring/src/__tests__/fixtures/` passou pela mesma transformação, preservando as
> métricas estruturais que os graders leem.

| Medida | Resultado |
| --- | --- |
| READMEs sem nenhuma imagem | **5 de 6** — o sexto usa `<img>` em HTML |
| Sem release publicada | **5 de 6** — o sexto tem 36, e está arquivado |
| Sem nenhuma topic | **3 de 6** |
| Sem licença reconhecível por SPDX | **5 de 6** — 1 MIT, 1 `NOASSERTION`, 4 sem licença |
| Sem nenhuma automação de CI | **3 de 6** |
| `.DS_Store` versionado | **2 de 6** |
| Arquivado, sem dizer por quê | **1 de 6** |

No portfólio público: **27 repositórios**, dos quais uma parte não tem descrição, nem README, nem
topics, nem 10 arquivos.

> Esta medição foi refeita depois de uma correção importante no coletor. A primeira versão pedia
> `ownerAffiliations: OWNER` sem filtro de privacidade — e um token com escopo `repo` faz o GitHub
> devolver os repositórios **privados** junto. Contava 92 onde havia 27 públicos. A query agora pede
> `privacy: PUBLIC`, e o normalizador descarta qualquer repositório marcado como privado por
> segunda barreira. Análise de repositório privado é o Épico 10, e exige consentimento explícito.

A métrica oficial do GitHub diz que está tudo certo. Um engenheiro que abrisse esse perfil por
trinta segundos discordaria. Essa diferença é o produto.

## Estado

A **fatia vertical determinística funciona de ponta a ponta**: cole um perfil, o sistema coleta do
GitHub, normaliza, avalia 47 regras, calcula a nota com trilha auditável e devolve recomendações
priorizadas com ganho **calculado** por contrafactual.

**Ainda não usa LLM.** Os cinco slots interpretativos caem em variante neutra de baixa confiança e a
interface os marca como *parcialmente interpretado*. O analisador semântico é o Épico 5.

O `@gba` resolve no registry privado, então a credencial precisa estar no seu `~/.npmrc`
(o `npm adduser` já escreve lá).

```bash
pnpm install
GITHUB_TOKEN=$(gh auth token) pnpm --filter @audit/web dev     # http://localhost:4310

# ou sem interface, direto no terminal:
GITHUB_TOKEN=$(gh auth token) pnpm scan octo-example senior-engineer

pnpm verify    # lint (fiscaliza arquitetura) + typecheck + testes + build
```

O token precisa apenas de leitura pública. Em produção ele vem da Backend API do Clerk
([ADR-0012](docs/adr/0012-clerk-github-oauth.md)); em desenvolvimento, `gh auth token` basta.

### O que já está construído

| Pacote | O que faz |
| --- | --- |
| `packages/shared/kernel` | `Result`, portas `Clock`/`Ids`, tipos de marca, JSON canônico |
| `packages/shared/contracts` | `Evidence`, `Signal`, `Finding`, `Facts` — o vocabulário comum |
| `packages/modules/collection` | Cliente GitHub em 3 fases, resolução de README, classificação de projeto, seleção de repositórios |
| `packages/modules/scoring` | Rubrica v1.0.0 congelada, 43 slots, 6 caps, 6 personas, motor **puro** |
| `packages/modules/reporting` | Recomendações com contrafactual individual e conjunto |
| `apps/web` | Next 16, landing, progresso por SSE, relatório com trilha clicável. Primitivos de **`@gba/components`**; só a `BalanceBar` e o `Ledger` são próprios |

A parte difícil não era a interface nem a IA — era tornar a nota **explicável, reproduzível e
difícil de manipular**. Fechar a rubrica antes de escrever código evitou que a implementação a
congelasse por acidente, e o teste de mutação *"adicionar arquivo vazio nunca aumenta a nota"* já
reprovou uma escada da própria especificação (ver `LICENSE_RECOGNIZED` no catálogo).

## Documentos

| Documento | O que contém |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Contrato de trabalho no repositório, capacidades ativas, regras invioláveis |
| [`docs/prd.md`](docs/prd.md) | Problema, proposta de valor, personas, modos de análise, critérios de aceite |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Pipeline, módulos, deployables, coleta em duas fases, segurança |
| [`docs/backend.md`](docs/backend.md) | Camadas, portas, `Result`, convenções Prisma, contrato do EvidencePack |
| [`docs/frontend.md`](docs/frontend.md) | Telas, regras de renderização de score e confiança |
| [`docs/data-model.md`](docs/data-model.md) | Entidades, imutabilidade de snapshot, gramática de `EvidenceId` |
| [`docs/api.md`](docs/api.md) | Endpoints HTTP e contrato de eventos SSE |
| [`docs/rubric/rubric-v1.md`](docs/rubric/rubric-v1.md) | **Documento central** — modelo de cálculo, slots, caps, personas, trilha de auditoria |
| [`docs/rubric/rules-catalog-v1.md`](docs/rubric/rules-catalog-v1.md) | As 47 regras da v1, com risco de falso positivo e mitigação |
| [`docs/adr/`](docs/adr/) | 13 decisões arquiteturais registradas |
| [`docs/roadmap.md`](docs/roadmap.md) | Os 10 épicos, sequenciados |

Leia nesta ordem: `prd.md` → `rubric/rubric-v1.md` → `arquitetura.md`. O resto é detalhamento.

## O princípio que organiza tudo

```
Evidence → Signal → Finding → Score effect → Recommendation
```

A direção é irreversível. Nada entra na nota sem evidência rastreável até um arquivo, uma linha ou
um campo da API; e **um LLM nunca produz o número**. Modelos interpretam — classificam tipo de
projeto, avaliam clareza de README, julgam coerência de portfólio — e devolvem enum validado por
schema. Pesos, tetos e penalidades pertencem a um motor determinístico e puro.

O detalhe que torna isso verificável está em [ADR-0004](docs/adr/0004-scoring-deterministico.md) e
[ADR-0005](docs/adr/0005-algebra-de-score.md).
