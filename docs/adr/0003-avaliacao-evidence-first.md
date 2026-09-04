# ADR-0003 — Avaliação evidence-first

## Status
Aceito

## Contexto
Ferramentas que avaliam trabalho alheio vivem ou morrem de credibilidade. Um achado que o usuário
não consegue verificar é indistinguível de um achado inventado — e, se ele encontrar um falso
positivo confiante, passa a duvidar de todos os outros.

Modelos de linguagem alucinam detalhes específicos com fluência: número de linha, nome de arquivo,
trecho de código.

## Decisão
Nenhum achado existe sem evidência rastreável.

```
Evidence → Signal → Finding → Score effect → Recommendation
```

A direção é irreversível. Concretamente:

1. `Signal.evidenceIds.length > 0`, **verificado na construção**, lança se violado.
2. `Recommendation.fromFindingIds.length > 0`.
3. Toda `Evidence` carrega `Locator`: caminho no **caso exato**, linha, trecho de até 240 caracteres
   e permalink fixado no `commitOid` escaneado.
4. LLM não recebe id canônico; recebe tabela de apelidos `E1..En` e o schema restringe o campo a um
   `enum` desses apelidos. Alias fora do enum falha a validação.

## Alternativas consideradas
- **Evidência só para achados negativos** — rejeitada: a trilha de auditoria precisa explicar os
  positivos também, senão "por que recebi esta nota" fica pela metade.
- **Deixar o modelo citar arquivo e linha em texto livre** — rejeitada: é exatamente a superfície em
  que modelos alucinam com mais confiança, e não há validação barata.
- **Evidência como texto livre em vez de estruturada** — rejeitada: impede o diff por id entre
  scans, que é o que faz a comparação histórica ser factual.

## Consequências
- Toda afirmação da interface é clicável até um arquivo e uma linha.
- O permalink fixado no OID continua correto daqui a um ano, mesmo com o arquivo já alterado.
- Como o id é chave natural derivada de coordenadas de conteúdo, o diff entre scans é comparação de
  fatos, não de texto nem de notas.
- **Custo aceito:** mais dado persistido por scan e mais disciplina em cada regra nova.

## Verificação
- Invariante testada na construção de `Signal` e `Recommendation`.
- Teste de contrato do LLM com alias alucinado, que **DEVE** falhar a validação.
- Teste que percorre um relatório completo e assere que todo `Finding` resolve suas evidências.

## Revisão
Não prevista. É premissa do produto.
