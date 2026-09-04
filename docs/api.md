# API

> Contrato HTTP e de eventos. Enquanto `ASYNCHRONOUS` estiver desligada, tudo é servido por route
> handlers do Next em `apps/web`.

---

## 1. Autenticação

Sessão do Clerk. Todo endpoint exige usuário autenticado — inclusive o de criar avaliação, porque o
token do GitHub do usuário é a credencial que o coletor usa.

O token **NUNCA** trafega para o cliente. É obtido no servidor, sob demanda, pela Backend API do
Clerk.

---

## 2. Endpoints

### `POST /api/evaluations`

```jsonc
// requisição
{
  "githubUrl": "https://github.com/octo-example",
  "persona": "senior-engineer",
  "mode": "quick"
}

// 202
{ "evaluationId": "eval_01J...", "status": "queued" }
```

`githubUrl` aceita URL completa ou username. A normalização trata `www.`, barra final,
`?tab=repositories` e URL de repositório colada no lugar de perfil.

**Erros de domínio, com 422 e corpo tipado** — não são 500:

| `kind` | Significado |
| --- | --- |
| `user_not_found` | Conta inexistente |
| `is_organization` | Perfil de organização; não suportado |
| `no_public_repos` | Nada público para analisar |
| `token_invalid` | Conexão GitHub do usuário precisa ser refeita |

### `GET /api/evaluations/:id`

Estado e progresso. 404 quando a avaliação não pertence ao usuário e não é `public` — **404, não
403**: responder 403 confirmaria a existência do recurso.

### `GET /api/evaluations/:id/report`

Relatório completo: `ScoreBreakdown` com trilha por categoria, achados com evidência, recomendações,
notas por repositório e `allPersonaOverall`.

Aceita `?persona=` para re-renderizar sob outra persona **sem novo scan** — as categorias são
invariantes, então é recombinação linear sobre dados já armazenados.

### `GET /api/profiles/:login/history`

Avaliações do usuário autenticado sobre aquele perfil, mais recente primeiro.

### `GET /api/evaluations/:id/diff?against=:otherId`

Diff entre dois scans, calculado **por `EvidenceId`**. Ambos precisam ser visíveis ao solicitante.

### `POST /api/evaluations/:id/visibility`

`private` | `unlisted` | `public`. Padrão `private`. O produto **NÃO DEVE** tornar nota pública sem
ação explícita.

### `DELETE /api/evaluations/:id`

Apaga a avaliação e tudo que dela deriva.

### `GET /api/evaluations/:id/events`

Stream SSE. Ver §3.

---

## 3. Eventos SSE

Escolhido em vez de WebSocket porque o fluxo é unidirecional, curto e cabe em HTTP — ver
[ADR-0011](adr/0011-sse-para-progresso.md).

| Evento | Payload |
| --- | --- |
| `scan.started` | `{ evaluationId, mode, persona }` |
| `profile.collected` | `{ login, hasProfileReadme }` |
| `repositories.selected` | `{ total, selected, excluded }` |
| `repository.analyzed` | `{ name, index, total }` |
| `static.completed` | `{ findingsCount }` |
| `semantic.completed` | `{ signalsCount, degraded }` |
| `scoring.completed` | `{ overall, persona }` |
| `report.completed` | `{ evaluationId }` |
| `scan.degraded` | `{ stage, reason }` — **não é erro**; o scan continua |
| `scan.failed` | `{ kind, message }` |

`scan.degraded` existe porque degradação parcial é requisito. Falha de análise semântica emite
`degraded` e o pipeline segue até `report.completed`, com confiança reduzida.

Cada evento também é persistido como `ScanEvent`, o que dá reconexão e depuração de graça.

---

## 4. Regras transversais

- Toda requisição e resposta validada com Zod `.strict()`.
- Erro de domínio → 422 com corpo tipado. Falha inesperada → 500 sem detalhe interno.
- Recurso de outro usuário → **404**, nunca 403.
- Rate limit por usuário no `POST /api/evaluations`: um scan de perfil em andamento por vez,
  rescan do mesmo perfil com intervalo mínimo. Protege a cota do GitHub e o orçamento de LLM.
- Nenhuma resposta inclui token, `rawScanHash` de outro usuário ou caminho interno de arquivo.
