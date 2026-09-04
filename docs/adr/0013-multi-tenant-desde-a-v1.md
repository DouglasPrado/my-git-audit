# ADR-0013 — Multi-tenant desde a v1

## Status
Aceito

## Contexto
O produto nasce hospedado e multiusuário. Não há fase de ferramenta local.

Há um detalhe do domínio que costuma ser modelado errado neste tipo de produto: **o sujeito de um
scan não é o dono do scan.** Qualquer usuário pode auditar qualquer perfil público — é o caso de uso
central, inclusive para recrutador. Confundir as duas coisas leva ou a impedir que se analise perfil
alheio, ou a vazar relatório entre contas.

## Decisão
`MULTI_TENANT` ativa desde o primeiro commit.

- `Evaluation.ownerId` é quem **pediu** o scan. `Evaluation.subjectLogin` é quem foi **analisado**.
  São campos distintos e não relacionados.
- O isolamento é sobre **quem pediu e quem pode ver o relatório**, jamais sobre quem foi analisado.
- Toda assinatura de repositório exige `TenantContext`.
- Todo índice de tabela multi-tenant é composto, começando por `ownerId`.
- Recurso de outro usuário responde **404**, nunca 403 — 403 confirmaria a existência do recurso.
- Visibilidade do relatório é do dono: `private` (padrão), `unlisted`, `public`. O produto **NÃO
  DEVE** tornar nota pública sem ação explícita.

## Alternativas consideradas
- **Single-tenant agora, multi depois** — rejeitada: acrescentar tenant a um schema e a um conjunto
  de queries já escritos é das migrações mais propensas a erro que existem, e a falha é silenciosa —
  vaza dado sem quebrar teste.
- **Isolamento por schema do Postgres por usuário** — rejeitada: o volume não justifica, e complica
  migrations sem benefício aqui.
- **Modelar o sujeito como o tenant** — rejeitada, e seria o erro mais fácil de cometer. Impediria
  o caso de uso principal: auditar o perfil de outra pessoa.

## Consequências
- O caso de uso do recrutador funciona sem exceção arquitetural.
- Compartilhar relatório é mudança de campo, não de modelo.
- **Custo aceito:** `TenantContext` em toda assinatura de repositório, e a disciplina de nunca
  escrever query sem ele.
- Um mesmo perfil público pode ter scans de vários donos, cada um com seu histórico. Isso é
  correto, e é o que permite ao dono do perfil manter o histórico dele independentemente.

## Verificação
- **Teste de vazamento obrigatório:** para cada endpoint, um usuário B tenta acessar recurso de um
  usuário A e recebe 404.
- Lint ou revisão garantindo que nenhum método de repositório omita `TenantContext`.
- Teste que assere que dois scans do mesmo `subjectLogin` por donos diferentes não se enxergam.

## Revisão
Se organizações — contas de time compartilhando relatórios — entrarem no produto. Aí o tenant deixa
de ser o usuário e passa a ser a organização.
