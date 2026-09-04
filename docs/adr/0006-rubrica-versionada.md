# ADR-0006 — Rubrica versionada como dado declarativo

## Status
Aceito

## Contexto
Pesos vão mudar. É certo: os valores iniciais são hipótese até haver medição contra perfis reais.

Duas consequências precisam ser resolvidas antes da primeira mudança. Primeira: um scan de seis
meses atrás precisa continuar explicável sob a rubrica com que foi calculado. Segunda: mudança de
peso precisa ser **revisável por quem não escreveu o código** — é onde produtos de scoring apodrecem,
quando os pesos vão se escondendo dentro de condicionais.

## Decisão
A rubrica é **dado declarativo em TypeScript**, mais um registry de graders puros referenciados por
`GraderId`.

```
src/rubric/
  types.ts          # Rubric, Slot, SlotVariant, Cap, Persona + validadores Zod
  graders/index.ts  # Record<GraderId, (ctx: SubjectFacts) => GradeResult>
  predicates/index.ts
  v1.0.0.ts         # CONGELADO
  registry.ts
  __tests__/frozen.test.ts
```

- Versão publicada é **imutável**. Comportamento novo é arquivo novo.
- `rubricHash = sha256(canonicalJson(rubric))`, com teste que falha se alguém editar versão
  publicada.
- Toda avaliação grava `rubricVersion` e `rubricHash`.

## Alternativas consideradas
- **JSON puro** — rejeitada: predicados e graders não viram dado sem inventar uma DSL ou embarcar
  `eval`. Referenciá-los por `GraderId` a partir de um literal tipado dá a diffabilidade do JSON
  **mais** verificação em tempo de compilação de que o grader existe.
- **Código imperativo com `if`** — rejeitada: mudar peso deixa de ser diff de uma linha, e "a
  rubrica" deixa de ser uma coisa que se possa hashear, imprimir ou comparar.
- **Pesos em tabela do banco, editáveis por interface** — rejeitada: nota reproduzível exige que a
  rubrica seja versionada junto do código e revisada em PR. Peso editável em produção é peso sem
  histórico.

## Consequências
- Mudança de peso é diff de uma linha (`weight: 8` → `weight: 10`), revisável por qualquer pessoa.
- Re-pontuar um scan antigo com rubrica nova é replay puro, sem nenhuma chamada de API — desde que
  `Facts`, `Evidence` e `Signal[]` estejam persistidos (ver [ADR-0007](0007-snapshots-imutaveis.md)).
- A interface pode oferecer *"este scan usou a rubrica v1.0 — recalcular com a v2.0?"* e mostrar as
  duas.
- **Limite honesto, que precisa estar escrito:** o hash protege o **dado**; os arquivos golden
  protegem o **código dos graders**. Mudar `countTestFiles` não move o hash — move os goldens, e o
  diff do PR torna isso visível. Os dois mecanismos são necessários; nenhum basta sozinho.

## Verificação
- `frozen.test.ts` compara o hash de cada versão publicada com o valor esperado.
- Validação de invariantes no boot: soma de pesos, teto de LLM, teto de neutro, personas.
- **Política de PR:** mudança de rubrica **DEVE** vir com o diff dos goldens e uma linha de
  changelog. Esse portão vale mais que qualquer quantidade de teste unitário.

## Revisão
A cada versão publicada.
