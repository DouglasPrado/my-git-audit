# ADR-0002 — Modelo de domínio independente do GitHub

## Status
Aceito

## Contexto
A tentação óbvia é passar respostas do Octokit adiante no pipeline. Isso acopla o motor de
pontuação ao formato de uma API de terceiro que muda sem aviso, tem `null` em situações não óbvias
e não pode ser construída em teste sem mock pesado.

Há também um objetivo de produto: GitLab, Bitbucket e Codeberg como fontes futuras.

## Decisão
Fronteira explícita:

```
Resposta do Octokit → RawScan → Facts → (domínio)
```

`modules/scoring` trabalha com `RepositorySnapshot`, nunca com `OctokitRepositoryResponse`. Nenhum
tipo de biblioteca de cliente HTTP atravessa a fronteira de `Facts`.

`RawScan` é persistido verbatim e endereçado por hash — é a entrada do replay.

## Alternativas consideradas
- **Usar os tipos do Octokit no domínio** — mais rápido de escrever. Rejeitada: torna o motor de
  pontuação impossível de testar sem fixtures acopladas ao formato do fornecedor, e uma mudança na
  API do GitHub viraria mudança no domínio.
- **Camada de anticorrupção só quando a segunda fonte chegar** — rejeitada: refatorar um domínio já
  acoplado é caro, e a fronteira também paga por si mesma em testabilidade desde o dia 1.

## Consequências
- Testar o produto inteiro com fixtures fica trivial: `Facts` é dado simples.
- Suportar outra fonte é escrever outro coletor, não outro produto.
- **Custo aceito:** uma camada de mapeamento a mais, com seu próprio conjunto de testes.
- O mapeamento é onde as armadilhas do coletor moram — caso de README, branch default, repositório
  vazio, fork. Concentrá-las num lugar só é benefício, não custo.

## Verificação
- ESLint proíbe importar `@octokit/*` fora de `infrastructure/github`.
- Toda fixture de teste do motor de pontuação é `Facts`, nunca resposta de API.

## Revisão
Ao adicionar a segunda fonte de dados.
