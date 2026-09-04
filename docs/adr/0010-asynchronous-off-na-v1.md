# ADR-0010 — Capacidade `ASYNCHRONOUS` desligada na v1

## Status
Aceito

## Contexto
A especificação original previa BullMQ, Redis e `apps/worker` desde o primeiro commit, com o
pipeline de scan em fila.

O critério objetivo de ativação de `ASYNCHRONOUS` é: *operação excede o orçamento de latência,
depende de sistema externo lento, precisa desacoplar disponibilidade, ou há picos a absorver.*

Medido contra a API real: um Quick Scan são 2 queries GraphQL a 1 ponto cada, algumas chamadas REST,
e alvo de p95 de 20 s. Rate limit de 5000 pontos/hora significa mais de 1500 scans por hora — não é
restrição. **Nenhuma das quatro condições está satisfeita.**

O princípio vigente é explícito: capacidade desativada significa que o código não existe.

## Decisão
`ASYNCHRONOUS` **desligada**. Não existe `apps/worker`, não existe Redis, não existe BullMQ — nem
comentado, nem vazio, nem "pronto para o futuro".

O orquestrador de scan é `packages/modules/collection`, biblioteca agnóstica de transporte, chamada
em processo a partir de um route handler. Progresso por SSE.

### Gatilhos de ativação

Qualquer um dos dois:

1. **Épico 9 — Deep Scan.** Shallow clone e análise estática de código não cabem no ciclo de uma
   requisição. Este é o gatilho esperado.
2. **Operacional.** `scan_duration` p95 acima de 25 s de forma sustentada.

### Entrega mínima na ativação

Ativar não é "adicionar BullMQ". Obriga, junto: `JobEnvelope` versionado com `correlationId` e
`idempotencyKey`; idempotência de job; retry só para erro classificado como `retryable`, com backoff
exponencial e jitter; DLQ com retenção e replay controlado; payload inválido direto para DLQ via
`UnrecoverableError`; cancelamento cooperativo; graceful shutdown que drena; e métricas de
profundidade, latência, taxa de falha e tamanho de DLQ.

## Alternativas consideradas
- **Ativar desde o dia 1** — rejeitada: paga toda a lista acima antes do primeiro scan rodar de
  ponta a ponta, para resolver um problema de latência que a medição diz não existir.
- **Fila em memória como meio-termo** — rejeitada, e é a pior das três: tem a complexidade de uma
  fila sem a durabilidade, e cria a ilusão de que a capacidade está ativa.
- **Deixar o código de fila escrito e desligado por flag** — rejeitada: viola diretamente o princípio
  de capacidade. Código que não roda não é testado, e apodrece.

## Consequências
- Uma dependência de infraestrutura a menos para rodar, implantar e observar.
- Como o orquestrador já é biblioteca, ativar depois é mudança de borda: um job passa a chamar o que
  hoje o route handler chama. O núcleo não sabe quem o invoca.
- **Custo aceito:** um Quick Scan lento segura uma conexão HTTP. Mitigado por limite de scan
  simultâneo por usuário.
- Deep Scan **não cabe** neste modelo, e isso é intencional — é o gatilho, não uma surpresa.

## Verificação
- Teste que invoca o orquestrador diretamente, sem HTTP.
- Alerta em `scan_duration` p95 > 25 s.
- knip acusa qualquer pacote de fila que entre sem uso.

## Revisão
No início do Épico 9, ou quando o alerta de latência disparar de forma sustentada.

## Plano de remoção
Esta é uma decisão de adiamento, não permanente. Ao ativar: criar `apps/worker`, mover a invocação
do orquestrador para um job, manter a biblioteca intacta, e entregar a lista mínima acima **na mesma
fatia** — não depois.
