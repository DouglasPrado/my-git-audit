# ADR-0007 — Snapshots imutáveis e re-pontuação por replay

## Status
Aceito

## Contexto
Dois requisitos de produto dependem de como o scan é armazenado: comparar dois scans no tempo, e
re-pontuar um scan antigo quando a rubrica mudar.

Armazenar só a nota final inviabiliza os dois. E há um efeito silencioso: se snapshots forem
atualizáveis, "o scan de setembro" passa a significar coisas diferentes conforme quando se consulta.

## Decisão
Nada que descreva o estado observado do GitHub é sobrescrito. Rescan cria linhas novas.

Persistir, por avaliação: `RawScan` verbatim endereçado por hash, `Facts` normalizados,
`Evidence[]`, `Signal[]`, `Finding[]` e `ScoreBreakdown` — não apenas a nota.

Repositórios de snapshot expõem **apenas** `insert` e `find`. Não existe caminho de `UPDATE` no
código. A única entidade com mutação legítima é `Evaluation`, e só no avanço de `status` e nos
timestamps.

Toda avaliação grava `rubricVersion`, `rubricHash`, `interpreterVersion`, `collectorVersion`,
`rawScanHash`, `factsHash`, `signalsHash`. E `scanAt`, que é o "agora" congelado que toda regra
temporal lê — é o que permite que o motor de pontuação não leia relógio.

## Alternativas consideradas
- **Guardar só a nota e as recomendações** — rejeitada: torna `rubricVersion` decoração, porque não
  há como re-pontuar nada. E o diff entre scans viraria comparação de números, que não explica o que
  mudou.
- **Snapshot atualizável, com histórico em tabela de auditoria** — rejeitada: mais complexo que
  append-only e com pior garantia. Append-only é a versão simples da mesma ideia.
- **Guardar `Facts` mas não `RawScan`** — rejeitada: quando o normalizador tiver um bug, é o
  `RawScan` que permite reprocessar sem pedir ao usuário que rescaneie.

## Consequências
- Re-pontuar qualquer scan histórico é função pura, sem chamada de API.
- O diff entre scans é feito por `EvidenceId`, que é chave natural estável — comparação de fatos,
  não de texto nem de notas.
- **Custo aceito:** o armazenamento cresce por scan. `RawScan` é o maior item; JSONB comprime bem, e
  há política de retenção quando o volume justificar.
- A definição de "reproduzível" em [`rubric-v1.md` §10](../rubric/rubric-v1.md) só é verdadeira por
  causa desta decisão.

## Verificação
- Revisão e teste: repositório de snapshot que exponha `update` é defeito de arquitetura.
- Teste de replay: carregar um scan armazenado, reexecutar `score()` e obter resultado idêntico bit
  a bit ao persistido.

## Revisão
Quando o custo de armazenamento aparecer na fatura. A saída provável é retenção de `RawScan`, não
mutabilidade.
