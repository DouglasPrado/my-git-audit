# ADR-0011 — SSE para entrega de progresso

## Status
Aceito

## Contexto
Um Quick Scan leva de 5 a 20 s. Uma tela parada por 20 s é indistinguível de uma tela travada, e o
progresso é informativo: *"Analisando 4 de 6 repositórios"*.

O fluxo tem três características que decidem a escolha: é **unidirecional** (servidor para cliente),
**curto** (dezenas de segundos) e **de baixo volume** (uma dúzia de eventos por scan).

## Decisão
Server-Sent Events, em `GET /api/evaluations/:id/events`.

Cada evento também é persistido como `ScanEvent`, o que dá reconexão e depuração sem trabalho extra:
um cliente que reconecta lê o que perdeu da tabela.

## Alternativas consideradas
- **WebSocket** — rejeitada: canal bidirecional para um fluxo que só vai numa direção. Traz
  gerenciamento de conexão, heartbeat e um caminho de deploy próprio, sem nada em troca aqui.
- **Polling** — rejeitada: para uma operação de 20 s, ou o intervalo é curto e desperdiça requisição,
  ou é longo e a interface fica pior que SSE. Também não transmite bem a granularidade de etapa.
- **Streaming de React Server Components** — tentadora, e alinhada ao App Router. Rejeitada: amarra
  o progresso à renderização de uma página específica, enquanto o SSE serve igualmente a uma
  segunda aba, a um reload e ao Deep Scan, que será mais longo.

## Consequências
- Uma rota HTTP comum, sem infraestrutura adicional.
- Reconexão é natural, porque os eventos estão persistidos.
- `scan.degraded` cabe no mesmo canal, o que importa: degradação parcial é requisito, e o cliente
  precisa distinguir *"seguiu com menos confiança"* de *"falhou"*.
- **Custo aceito:** SSE segura uma conexão HTTP por scan em andamento. Com limite de um scan por
  usuário, é aceitável.
- **Limite conhecido:** SSE não passa por todo proxy corporativo com buffering. Sintoma é progresso
  que chega todo de uma vez no fim — degradação cosmética, não perda de funcionalidade.

## Verificação
- Teste ponta a ponta que consome o stream e assere a sequência de eventos.
- Teste de reconexão: derrubar o stream no meio e verificar que o cliente recupera o estado pela
  tabela de eventos.

## Revisão
Se o Deep Scan passar a durar minutos, ou se o buffering em proxy virar reclamação recorrente.
