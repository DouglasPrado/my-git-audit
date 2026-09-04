# ADR-0005 — Álgebra: razão adquirido/possível sobre slots de peso fixo

## Status
Aceito

## Contexto
Três modelos são viáveis para transformar sinais numa nota de 0 a 100, e a escolha determina o que
o produto consegue explicar.

O problema difícil é a aplicabilidade: uma biblioteca não precisa de screenshot; um app desktop
provavelmente precisa. Se o critério que não se aplica simplesmente sai da conta, a estratégia
vencedora passa a ser **ser mínimo** — menos superfície, menor denominador, nota maior.

## Decisão
Razão adquirido/possível sobre **slots de peso fixo**, com bônus e penalidades fora da razão e caps
por último.

```
base_c      = 100 × Σ(grade_i × weight_i) / max(Σ weight_i, floor_c)
adjusted_c  = base_c + min(Σ bonus_c, 10) − min(Σ penalty_c, 25)
final_c     = clamp(min(adjusted_c, menor teto ativo), 0, 100)
overall     = Σ_c final_c × w_c(persona) / 100
```

O movimento decisivo: **aplicabilidade é substituição, não remoção.** O peso mora no slot; as
variantes moram dentro dele. `possible += slot.weight` executa incondicionalmente. Não há
denominador para encolher.

Persona recombina linearmente notas de categoria **invariantes**. Persona **NÃO DEVE** alterar fato,
nota de categoria ou cap — estruturalmente, não existe campo de override.

## Alternativas consideradas
- **Acumulação de pontos sem denominador** — rejeitada: precisa de normalização a posteriori, e o
  normalizador vira uma segunda rubrica escondida. Repositório com mais critérios aplicáveis vence
  por mecânica, não por mérito.
- **Dedução a partir de 100** — rejeitada: todo mundo começa perfeito e nada distingue *adequado* de
  *excelente*. Reduz o produto a uma lista de penalidades, que é o oposto do posicionamento.
- **Remover slot inaplicável do denominador** — rejeitada: é o gaming de denominador descrito acima.
- **Persona altera caps** — rejeitada: cap codifica falha de expectativa dura. Repositório sem README
  é ilegível para o recrutador e para o staff engineer. Se fato e limiar se movessem juntos, as
  notas de duas personas deixariam de ser comparáveis por qualquer critério principiado.

## Consequências
- Nota naturalmente em 0–100, comparável entre sujeitos, e **aditiva na explicação**: como a base é
  razão, vale `Σ forgone = 100 − base`, e a trilha de auditoria fecha exatamente.
- Categorias invariantes entre personas ⇒ `allPersonaOverall` sai de graça, habilitando *"um
  recrutador leria isto como 74; um staff engineer, como 61"*.
- Overall é combinação convexa ⇒ `min(cat) ≤ overall ≤ max(cat)` para toda persona.
- **Custo aceito:** manter a soma de pesos de slot em 100 por categoria e por `ProjectType` exige
  disciplina. É garantido por construção e asserido por teste.
- **Risco reconhecido:** no vetor `general`, `POS + CUR + PRE + DIS = 50` — metade da nota é
  enquadramento, contra 20 de engenharia. Para o público técnico isso lê como astrologia. Mitigado
  em duas frentes: os vetores `senior-eng` e `staff-eng` deslocam peso agressivamente para `ENG`,
  `OSS` e `MNT`; e o produto afirma explicitamente que a nota mede o GitHub como artefato
  profissional, não capacidade de engenharia.

## Verificação
Testes obrigatórios: limites `[0,100]` e nunca `NaN`; trilha fecha com epsilon `1e-9`; invariância
de categoria entre as seis personas; independência de ordem; monotonicidade (elevar um `grade` nunca
baixa a categoria — **não vale de graça**, um predicado de cap mal escrito quebra isso); denominador
idêntico para todo `ProjectType`.

## Revisão
Após o primeiro dry-run contra perfis reais. Enquanto não houver medição, os pesos são hipótese.
