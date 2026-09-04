# ADR-0001 — Monólito modular com um único deployable

## Status
Aceito

## Contexto
O produto tem cinco preocupações distintas: coletar do GitHub, normalizar, interpretar com LLM,
pontuar e reportar. A especificação original desenhava Next.js + Fastify + workers BullMQ +
Postgres + Redis desde o primeiro commit.

Fato medido: um Quick Scan custa 2 queries GraphQL, algumas chamadas REST e tem alvo de p95 de 20 s.
Isso cabe no ciclo de uma requisição HTTP com folga. O critério objetivo de ativação de
`ASYNCHRONOUS` — operação que excede o orçamento de latência — **não está satisfeito**.

O custo de começar com quatro processos é real: docker-compose, Redis, contrato de job, DLQ,
graceful shutdown e observabilidade de fila antes do primeiro scan rodar de ponta a ponta.

## Decisão
Um único deployable: `apps/web`, Next.js 16 App Router. Route handlers servem a API; SSE entrega
progresso.

O orquestrador de scan **não é um serviço**. É `packages/modules/collection`, biblioteca agnóstica
de transporte, chamada em processo.

Fora do escopo: proibir workers para sempre. Ver [ADR-0010](0010-asynchronous-off-na-v1.md), que
define o gatilho de ativação.

## Alternativas consideradas
- **Topologia completa desde o dia 1** — mais fiel à especificação e sem migração depois. Rejeitada:
  paga o custo de infraestrutura assíncrona antes de existir requisito que a justifique, e viola o
  princípio de que capacidade desligada significa que o código não existe.
- **Microserviços por preocupação** — rejeitada sem hesitação. Nenhuma das cinco preocupações escala
  independentemente, e todas compartilham o mesmo modelo de dados.
- **Serverless por função** — rejeitada: o pipeline compartilha muito estado intermediário
  (`RawScan`, `Facts`, `Evidence`) e o cold start machucaria justamente a latência que é o
  diferencial do Quick Scan.

## Consequências
- Um processo para rodar, depurar e implantar. Um scan é uma stack trace só.
- Escrever o orquestrador como biblioteca desde o início torna a migração para BullMQ uma mudança de
  borda, não uma reescrita: o núcleo não sabe quem o chama.
- **Custo aceito:** um Quick Scan lento segura uma conexão HTTP. Mitigado por limite de scan
  simultâneo por usuário e monitorado por `scan_duration`.
- Deep Scan (Épico 9) **não cabe** neste modelo, e é justamente por isso que ele é o gatilho.

## Verificação
- dependency-cruiser garante que `modules/collection` não importa nada de `next/`.
- Teste que invoca o orquestrador diretamente, sem HTTP, provando que a biblioteca é autônoma.
- Alerta em `scan_duration` p95 > 25 s.

## Revisão
Quando o Épico 9 começar, ou se `scan_duration` p95 passar de 25 s de forma sustentada.
