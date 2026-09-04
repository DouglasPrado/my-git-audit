# ADR-0004 — Scoring determinístico: o LLM nunca emite o número

## Status
Aceito

## Contexto
O caminho fácil é mandar o perfil para um modelo e pedir uma nota. Isso produz um número que:

- muda entre execuções, mesmo com `temperature: 0`;
- muda quando o fornecedor atualiza o modelo, sem aviso;
- não pode ser explicado, porque não há decomposição;
- não pode ser auditado quando o usuário discorda;
- não pode ser comparado entre dois scans com honestidade.

O produto vende exatamente o oposto: *"me diga por que recebi esta nota"*.

## Decisão
Um LLM **NUNCA** emite número que entre na nota. Modelos interpretam; o motor determinístico decide.

- Sinal de LLM é sempre `enum` de 3 a 5 níveis.
- A tradução enum → nota é dado da rubrica, revisável em diff.
- `Signal.rationale` — a prosa do modelo — é exibida e **NUNCA** usada em cálculo.
- Teto de 40% do denominador de qualquer categoria vindo de sinal de LLM, validado no boot.
- Sinal de LLM **NÃO DEVE** ser base única de achado negativo de severidade alta; todo negativo alto
  exige corroborador determinístico.

## Alternativas consideradas
- **LLM produz a nota, código valida faixa** — rejeitada: validar que um número está entre 0 e 100
  não o torna reproduzível nem explicável.
- **LLM produz nota por categoria, código soma** — rejeitada: só move o problema um nível abaixo. A
  categoria continua sendo um número não auditável.
- **Sem LLM nenhum** — tentadora, e é o que a fatia vertical do Épico 1 faz. Rejeitada como decisão
  final: clareza de README e coerência de posicionamento são justamente onde regra determinística é
  fraca, e são valor real do produto.

## Consequências
- A nota é reproduzível no sentido definido em [`rubric-v1.md` §10](../rubric/rubric-v1.md).
- Trocar de modelo ou de fornecedor não muda a aritmética — muda, no máximo, uma faixa de enum, e
  isso aparece como diff de golden.
- **Custo aceito:** menos expressividade. O modelo não pode dizer "isto merece 87"; só pode
  classificar em níveis. É exatamente a restrição que se quer.
- Quantização em enum absorve a maior parte da variância entre execuções.

## Verificação
- Lint proíbe qualquer caminho de `SemanticAnalyzer` para campo numérico de `Finding.grade`.
- Validação da rubrica no boot: peso de LLM ≤ 40% por categoria.
- Testes de pontuação usam sinais congelados e **nunca** chamam LLM.
- Teste de contrato: enum fora do domínio degrada para neutro com `confidence: 'low'`, nunca para
  nota inventada.

## Revisão
Não prevista. É a propriedade central do produto.
