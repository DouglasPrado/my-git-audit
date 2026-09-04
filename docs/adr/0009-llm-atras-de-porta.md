# ADR-0009 — LLM atrás da porta `SemanticAnalyzer`, sem SDK de fornecedor

## Status
Aceito

## Contexto
O produto usa modelos para o que regra determinística faz mal: classificar tipo de projeto, julgar
clareza de README, avaliar profundidade arquitetural, escrever a narrativa de posicionamento.

O caminho fácil é instalar o SDK do fornecedor e chamá-lo de dentro do caso de uso. Isso acopla o
domínio a um fornecedor, torna teste dependente de rede ou de mock pesado, e espalha decisão de
modelo pelo código.

Há precedente direto nos demais repositórios: `@gba/ai-gateway` é um gateway sem dependência alguma
(`"dependencies": {}`), com interface `Provider` própria e protocolos de fio isolados por
fornecedor.

## Decisão
Duas camadas.

**`SemanticAnalyzer`** — porta de domínio em `application/ports`. Fala em `EvidencePack` e
`InterpretedSignals`. Não conhece modelo, fornecedor nem prompt.

**`Provider`** — porta de infraestrutura, implementada sobre HTTP direto. Sem `@anthropic-ai/sdk`,
sem `openai`.

Todo `AIRequest` carrega `promptId`, `promptVersion`, `outputSchema`, `maxOutputTokens`,
`temperature: 0`, `timeoutMs` e `budgetCents`. Toda chamada registra provedor, modelo, `promptId`,
`promptVersion`, `inputHash`, tokens, custo e latência.

Prompts são versionados em arquivo. Cache por `inputHash`.

## Alternativas consideradas
- **SDK do fornecedor direto no caso de uso** — rejeitada: acopla o domínio e torna troca de
  fornecedor uma refatoração.
- **SDK confinado a um adaptador** — razoável, e é o padrão comum. Rejeitada em favor de HTTP direto
  por consistência com `@gba/ai-gateway` e porque a superfície usada é pequena: uma chamada de
  completions com saída estruturada não justifica a árvore de dependências de um SDK.
- **Framework de orquestração de LLM** — rejeitada: o pipeline aqui é uma chamada por pacote de
  evidência, sem cadeia, sem agente, sem ferramentas. O framework seria complexidade sem finalidade.

## Consequências
- Trocar de fornecedor não toca em `modules/scoring` nem em `modules/audit`.
- Testar o pipeline inteiro com um `SemanticAnalyzer` falso e determinístico é trivial — e é o que
  todos os testes de pontuação fazem.
- Custo por scan fica mensurável por chamada, o que importa: o analisador semântico é o risco
  econômico do produto.
- **Custo aceito:** escrever e manter o protocolo de fio à mão, incluindo parsing de streaming se
  vier a ser necessário.
- **Regra operacional:** mudar prompt sem incrementar `promptVersion` invalida a comparação entre
  scans e envenena o cache. `interpreterVersion` deixa de significar algo.

## Verificação
- ESLint proíbe `@anthropic-ai/*` e `openai` em qualquer lugar do repositório.
- dependency-cruiser garante que `modules/insight` não importa `infrastructure/llm`.
- Testes de pontuação usam o fake; teste de contrato do provedor roda contra respostas gravadas.

## Revisão
Se a saída estruturada exigir capacidade de protocolo que reimplementar deixe de compensar.
