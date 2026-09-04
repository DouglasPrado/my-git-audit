# Rubrica v1.0.0

> **Documento central do produto.** Define como a nota é calculada, por que ela é reproduzível e
> o que impede que seja manipulada. As regras individuais estão em
> [`rules-catalog-v1.md`](rules-catalog-v1.md).
>
> **Versão publicada é imutável.** Mudar peso, teto, ordem de operação ou faixa de conversão exige
> um arquivo de rubrica novo. Ver [ADR-0006](../adr/0006-rubrica-versionada.md).

---

## 1. Definições

| Termo | O que é |
| --- | --- |
| **Evidence** | Fato observado, com proveniência: caminho exato, linha, trecho, permalink fixado no commit escaneado |
| **Signal** | Medida derivada de uma ou mais evidências. Booleano, contagem, razão ou enum |
| **Slot** | Posição de avaliação com **peso fixo** dentro de uma categoria. Contém variantes |
| **Variante** | Regra que ocupa o slot para um determinado tipo de projeto. A primeira que casar vence |
| **Finding** | Resultado da avaliação de uma regra: nota de 0 a 1, polaridade, severidade, evidências |
| **Cap** | Teto que limita a nota de uma categoria quando uma expectativa dura falha |
| **Contribution** | Linha da trilha de auditoria: rótulo, pontos com sinal, evidências |

---

## 2. Modelo de cálculo

A ordem das operações é fixa. **Alterá-la é mudança de versão de rubrica**, porque muda o resultado.

```
base_c      = 100 × Σ(grade_i × weight_i) / max(Σ weight_i, floor_c)
adjusted_c  = base_c + min(Σ bonus_c, bonusCap_c) − min(Σ penalty_c, penaltyCap_c)
capped_c    = min(adjusted_c, menor teto entre os caps ativos em c)
final_c     = clamp(capped_c, 0, 100)

overall     = Σ_c final_c × w_c(persona) / 100
```

`bonusCap_c = 10` e `penaltyCap_c = 25` para todas as categorias na v1.

### 2.1 Por que razão, e não acumulação nem dedução

| Modelo | Por que foi rejeitado |
| --- | --- |
| **Acumulação de pontos** | Sem denominador, precisa de normalização a posteriori — e o normalizador vira uma segunda rubrica escondida. Um repositório com mais critérios aplicáveis vence outro mais simples por mecânica, não por mérito |
| **Dedução a partir de 100** | Todo mundo começa perfeito. Não distingue *adequado* de *excelente*: "tem README" e "tem README exemplar" dividem o teto. Reduz o produto a uma lista de penalidades, que é exatamente o que o posicionamento nega |
| **Razão adquirido/possível** | **Escolhido.** Naturalmente 0–100, comparável entre sujeitos, aditivo na explicação. Tem um risco real — gaming de denominador — e esse risco é solúvel (§3) |

Detalhe em [ADR-0005](../adr/0005-algebra-de-score.md).

---

## 3. Modelo de slots — como "não se aplica" funciona sem virar brecha

O risco da razão é óbvio: se um critério que não se aplica sai do denominador, a estratégia
vencedora passa a ser **ser mínimo**. Menos superfície, menos denominador, nota maior.

A solução é uma inversão pequena e decisiva:

> **Aplicabilidade é substituição, não remoção.**

O peso mora no **slot**. As variantes moram **dentro** do slot. `possible += slot.weight` executa
**incondicionalmente**, para todo tipo de projeto. Não há denominador para encolher.

Uma biblioteca não escapa do slot de demonstração — ela recebe `README_API_EXAMPLE` no lugar de
`README_VISUAL_ASSET`, pelos mesmos 20 pontos.

### 3.1 O slot de demonstração, concretamente

| Slot | Peso | library | application / desktop | cli | docs | service |
| --- | ---: | --- | --- | --- | --- | --- |
| `PRE.readme` | 30 | `REPO_README_PRESENT` | idem | idem | idem | idem |
| `PRE.structure` | 20 | `README_STRUCTURE` | idem | idem | idem | idem |
| `PRE.pitch` | 15 | `README_WHAT_AND_WHY` | idem | idem | idem | idem |
| `PRE.demo` — `README_DEMO_ASSET` | 20 | `README_API_EXAMPLE` | `README_VISUAL_ASSET` | `README_TERMINAL_DEMO` | neutro 0.6 | `ARCHITECTURE_DIAGRAM` |
| `PRE.quickstart` | 15 | `README_QUICKSTART_CORROBORATED` | idem | idem | `DOCS_BUILD_INSTRUCTIONS` | idem |

Toda coluna soma 100. Isso é garantido por construção — o peso está no slot, não na variante — e
ainda assim é asserido por teste de validação da rubrica.

### 3.2 Variante neutra é racionada

Variante `neutral` concede uma nota fixa quando nenhuma avaliação é honesta. É escape hatch, e
escape hatch sem limite vira meta: *seja estranho, ganhe 0.5*.

- O peso de slots com variante neutra elegível **NÃO DEVE** passar de **25%** do peso da categoria.
- Toda concessão neutra aparece em `slotsNotAssessed`, com motivo legível.

### 3.3 `floor_c` — o denominador nunca é zero

`floor_c = Σ { slot.weight : slot.universal }`.

Serve para o caso em que os slots genuinamente não podem ser avaliados: conta sem repositório
público, repositório vazio, perfil de organização. Sem o piso, `0/0` seria `NaN` ou, pior,
vacuamente 100.

Quando o denominador é zero mesmo com o piso, a categoria vale **0** e é emitido
`NO_SCORABLE_REPOS`. Nunca `NaN`, nunca 100.

---

## 4. Categorias e slots

Oito categorias. Dentro de cada uma, os pesos de slot somam 100. **D** = determinístico,
**L** = com componente interpretativo de LLM.

### 4.1 Positioning — `POS`

| Slot | Peso | Regra | Tipo |
| --- | ---: | --- | --- |
| `POS.profileReadme` | 22 | `PROFILE_README_PRESENT` | D |
| `POS.readmeStructure` | 13 | `PROFILE_README_STRUCTURE` | D |
| `POS.readmeClarity` | 20 | `PROFILE_README_SUBSTANCE` | L |
| `POS.bio` | 8 | `PROFILE_BIO_PRESENT` | D |
| `POS.bioSpecificity` | 15 | `PROFILE_BIO_SPECIFICITY` | L |
| `POS.coherence` | 12 | `PORTFOLIO_COHERENCE` | D |
| `POS.profileRepoDescription` | 10 | `PROFILE_REPO_DESCRIPTION` | D |

Peso de LLM: **35%**. `POS.coherence` é deliberadamente determinístico — índice de concentração
(Herfindahl) sobre topics e linguagens dos repositórios selecionados. O modelo escreve a narrativa;
o índice dá a nota.

### 4.2 Portfolio Curation — `CUR`

| Slot | Peso | Regra | Tipo |
| --- | ---: | --- | --- |
| `CUR.pinnedUsed` | 15 | `PROFILE_PINNED_USED` | D |
| `CUR.pinnedSelfExplanatory` | 25 | `PINNED_SELF_EXPLANATORY` | D |
| `CUR.pinnedQuality` | 20 | `PINNED_BEST_WORK` | D |
| `CUR.noiseRatio` | 15 | `PORTFOLIO_NOISE_RATIO` | D |
| `CUR.archiveHygiene` | 10 | `PORTFOLIO_ARCHIVE_HYGIENE` | D |
| `CUR.diversity` | 15 | `PORTFOLIO_TYPE_DIVERSITY` | D |

`CUR.pinnedSelfExplanatory` é o slot de maior peso da categoria de propósito: os fixados são os
seis que a pessoa **escolheu** mostrar. Um fixado sem descrição custa mais que um repositório
qualquer sem descrição, porque foi selecionado para ser visto. A regra nomeia quais estão
incompletos, e conta apenas os **públicos**.

Peso de LLM: **0%**.

### 4.3 Project Presentation — `PRE`

Slots na tabela §3.1. Peso de LLM: **35%** (`PRE.structure` + `PRE.pitch`).

### 4.4 Engineering Signals — `ENG`

| Slot | Peso | Regra | Tipo |
| --- | ---: | --- | --- |
| `ENG.tests` | 25 | `TESTS_SUBSTANTIVE` | D |
| `ENG.ci` | 22 | `CI_WORKFLOW_SUBSTANTIVE` | D |
| `ENG.architectureDoc` | 15 | `ARCHITECTURE_DOC_SUBSTANTIVE` | L |
| `ENG.commitQuality` | 10 | `COMMIT_MESSAGE_QUALITY` | L |
| `ENG.lintConfig` | 10 | `LINT_FORMAT_CONFIG` | D |
| `ENG.depManifest` | 10 | `DEP_MANIFEST_LOCKFILE` | D |
| `ENG.deployable` | 8 | `CONTAINERIZED_OR_DEPLOYABLE` | D |

Peso de LLM: **25%**.

### 4.5 Open Source Maturity — `OSS`

| Slot | Peso | Regra | Tipo |
| --- | ---: | --- | --- |
| `OSS.license` | 35 | `LICENSE_RECOGNIZED` | D |
| `OSS.releases` | 25 | `RELEASES_AND_VERSIONING` | D |
| `OSS.contributing` | 20 | `CONTRIBUTING_AND_TEMPLATES` | D |
| `OSS.codeOfConduct` | 10 | `CODE_OF_CONDUCT_PRESENT` | D |
| `OSS.security` | 10 | `SECURITY_POLICY_PRESENT` | D |

Peso de LLM: **0%**. Bônus da categoria: `PUBLIC_CONTRIBUTIONS` (+6), `TRACTION` (+5).

### 4.6 Maintenance — `MNT`

| Slot | Peso | Regra | Tipo |
| --- | ---: | --- | --- |
| `MNT.recency` | 40 | `COMMIT_RECENCY` | D |
| `MNT.cadence` | 25 | `COMMIT_CADENCE` | D |
| `MNT.releaseRecency` | 15 | `RELEASE_RECENCY` | D |
| `MNT.issueHygiene` | 10 | `ISSUE_HYGIENE` | D |
| `MNT.ciHealth` | 10 | `CI_STATUS` | D |

Peso de LLM: **0%**.

### 4.7 Professional Hygiene — `HYG`

| Slot | Peso | Regra | Tipo |
| --- | ---: | --- | --- |
| `HYG.secrets` | 30 | `SECRETS_SUSPECTED` | D |
| `HYG.artifacts` | 25 | `COMMITTED_ARTIFACTS` | D |
| `HYG.gitignore` | 15 | `GITIGNORE_PRESENT` | D |
| `HYG.identity` | 15 | `PROFILE_IDENTITY_COMPLETE` | D |
| `HYG.authorship` | 15 | `COMMIT_AUTHORSHIP` | D |

Peso de LLM: **0%**.

### 4.8 Discoverability — `DIS`

| Slot | Peso | Regra | Tipo |
| --- | ---: | --- | --- |
| `DIS.repoDescription` | 25 | `REPO_DESCRIPTION` | D |
| `DIS.repoTopics` | 25 | `REPO_TOPICS` | D |
| `DIS.profileWebsite` | 12 | `PROFILE_WEBSITE` | D |
| `DIS.profileSocial` | 13 | `PROFILE_SOCIAL` | D |
| `DIS.profileEmail` | 10 | `PROFILE_EMAIL` | D |
| `DIS.homepage` | 15 | `REPO_HOMEPAGE_URL` | D |

**Cada canal de contato pontua à parte, e isso não é detalhe.** Site e LinkedIn dizem coisas
diferentes a quem lê: um mostra o que a pessoa faz, o outro permite chegar até ela. Somá-los num
único "número de canais" esconde qual está faltando, e a recomendação vira genérica demais para
ser acionável.

Peso de LLM: **0%**. Seis slots — acima da exigência estrutural: **categoria com peso ≤ 5 no vetor de
persona DEVE ter no mínimo 4 slots**, ou sua granularidade interna fica mais grossa que a precisão
que a interface sugere.

### 4.9 Bônus, penalidades e meta

Não ocupam slot e, portanto, não entram no denominador. Precisam ser declarados aqui para satisfazer
a invariante 7 de §4.10.

| Código | Categoria | Tipo | Efeito |
| --- | --- | --- | --- |
| `PUBLIC_CONTRIBUTIONS` | `OSS` | Bônus | Até **+6**. PRs mergeados em repositórios de terceiros |
| `TRACTION` | `OSS` | Bônus | Até **+5**. Stars e forks por tabela de faixas. **Nunca vira penalidade** |
| `DOC_CLAIM_UNCORROBORATED` | `PRE` | Penalidade | Afirmação do README sem fato correspondente na árvore |
| `PORTFOLIO_FORK_RATIO` | `CUR` | Penalidade | **Zero ponto na v1.** Severidade `info` apenas — fork é como se contribui upstream |
| `REPO_MATERIALITY` | — | Meta | Não pontua. Exclui o repositório da avaliação, com motivo |

### 4.10 Invariantes de validação da rubrica

Verificadas ao carregar a rubrica; falha impede o boot.

1. Para toda categoria, `Σ slot.weight = 100`.
2. Para todo `ProjectType`, `Σ slot.weight` por categoria é idêntico.
3. Peso de slot com componente de LLM **≤ 40%** da categoria.
4. Peso de slot com variante neutra elegível **≤ 25%** da categoria.
5. Toda linha de persona soma 100 e nenhum peso é menor que 4.
6. Todo cap é liberado por ao menos uma regra existente.
7. Toda regra do catálogo pertence a um slot, ou é bônus/penalidade declarado.

---

## 5. Caps

**Seis. Não dezesseis.** Cada cap é uma descontinuidade na superfície da nota, e descontinuidade é
o que faz o usuário dizer *"mudei uma coisa e pulou 20 pontos, isso é aleatório"*.

| Cap | Teto | Condição | Liberado por |
| --- | --- | --- | --- |
| `CAP_NO_README` | `PRE ≤ 40` | Nota de `REPO_README_PRESENT` igual a zero | `REPO_README_PRESENT` |
| `CAP_NO_PROFILE_README` | `POS ≤ 55` | Perfil sem Profile README | `PROFILE_README_PRESENT` |
| `CAP_SECRETS_SUSPECTED` | `HYG ≤ 25` | `SECRETS_SUSPECTED` com confiança alta | `SECRETS_SUSPECTED` |
| `CAP_NO_LICENSE_PUBLIC` | `OSS ≤ 35` | Repositório não-fork, não-trivial, sem licença reconhecível | `LICENSE_RECOGNIZED` |
| `CAP_ALL_STALE` | `MNT ≤ 30` | Todo repositório selecionado sem commit há > 24 meses e não arquivado | `COMMIT_RECENCY`, `PORTFOLIO_ARCHIVE_HYGIENE` |
| `CAP_NO_SCORABLE_REPOS` | `PRE·ENG·OSS·MNT ≤ 20` | Nenhum repositório selecionável | `REPO_MATERIALITY` |

A coluna **Liberado por** é obrigatória e é o que a interface usa para dizer ao usuário exatamente o
que fazer para destravar o teto. Cap sem regra que o libere seria beco sem saída, e a validação da
rubrica recusa a versão.

### 5.1 Regras de interação

- Caps são aplicados **depois** de bônus e penalidades.
- Caps limitam **apenas nota de categoria**. **NUNCA** o overall — é isso que mantém o overall uma
  combinação convexa e as personas comparáveis entre si (§6).
- Vários caps ativos → vale o **menor** teto.
- A trilha lista **todos os caps ativos**, mas só o que está mordendo tem `delta ≠ 0`. Os demais
  aparecem como *"também ativo, não limitante no momento"*. Sem isso, o usuário conserta o item
  errado, não vê a nota mover e para de confiar na ferramenta.
- **Persona NÃO DEVE alterar teto nem condição de cap.** Estruturalmente: não existe campo de
  override. Um cap codifica *"este artefato falha uma expectativa dura, independentemente de quem
  está olhando"*. Repositório sem README é ilegível para o recrutador e para o staff engineer.

---

## 6. Personas

Pesos absolutos, somando 100. Recombinação linear de notas de categoria que são **invariantes**.

| Categoria | general | recruiter | senior-eng | staff-eng | oss-maint | freelancer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Engineering Signals | 20 | 12 | 30 | 26 | 18 | 12 |
| Positioning | 15 | 22 | 8 | 14 | 6 | 24 |
| Portfolio Curation | 15 | 20 | 12 | 14 | 6 | 18 |
| Project Presentation | 15 | 18 | 12 | 12 | 12 | 22 |
| Open Source Maturity | 10 | 6 | 12 | 12 | 28 | 5 |
| Maintenance | 10 | 8 | 14 | 12 | 20 | 8 |
| Professional Hygiene | 10 | 9 | 8 | 6 | 6 | 6 |
| Discoverability | 5 | 5 | 4 | 4 | 4 | 5 |
| **Σ** | **100** | **100** | **100** | **100** | **100** | **100** |

Os vetores `senior-eng` e `staff-eng` deslocam peso agressivamente para `ENG`, `OSS` e `MNT`. É
correção deliberada de um problema real do modelo padrão: no vetor `general`,
`POS + CUR + PRE + DIS = 50` — metade da nota é enquadramento, contra 20 de engenharia. Para o
público técnico isso lê como astrologia. Ver [ADR-0005](../adr/0005-algebra-de-score.md) §Consequências.

### 6.1 Garantias, cada uma um teste

1. `categories[c].score` é **idêntico bit a bit** entre as seis personas, para os mesmos fatos.
2. Todo overall é combinação convexa das mesmas oito notas ⇒ `min(cat) ≤ overall ≤ max(cat)`.
   Duas personas diferem, no máximo, por `max(cat) − min(cat)`.
3. Nenhum peso abaixo de 4 ⇒ nenhuma categoria some da explicação.
4. `allPersonaOverall` sai de graça em todo scan, porque as categorias são invariantes.

Persona **PODE** reordenar recomendações via `recommendationBias`. Esse campo **NÃO DEVE** ser lido
por nenhuma função de cálculo — só pelo ordenador.

---

## 7. Trilha de auditoria

A trilha não é log. É **decomposição aritmética exata**, e é a feature que sustenta o produto:
*"me diga exatamente por que recebi esta nota"*.

Como a base é razão, esta identidade vale exatamente:

```
Σ forgone_i = 100 × (denominador − adquirido) / denominador = 100 − base
```

Portanto as duas visões abaixo saem dos mesmos dados, sem reescala e sem arredondamento criativo:

```
visão do adquirido:  Σ earned  + Σ bonus − Σ penalty + Σ capDelta  = final
visão da lacuna:     100 − Σ|forgone| + Σ bonus − Σ penalty + Σ capDelta  = final
identidade:          Σ earned + Σ|forgone| = 100
```

É isso que permite renderizar honestamente, numa lista só:

```
Project Presentation                              62 / 100

  +18  README presente e estruturado          vault, pane, spec-kit
  +12  Quick start corroborado pela árvore     4 de 6 repositórios
   +8  Pitch claro nos primeiros parágrafos
   −4  Sem imagem em projeto visual            5 repositórios, 0 imagens
   −6  Sem quick start                         2 repositórios
```

O `+18` é uma contribuição `earned`; o `−4` é a parcela `forgone` de um slot parcialmente
adquirido. O cabeçalho declara o enquadramento (*"adquiriu 62 de 100 disponíveis"*) e uma barra
segmentada de 100 unidades mostra adquirido, perdido, bônus, penalidade e cap na mesma figura.

A identidade **DEVE** ser asserida em código, com epsilon de `1e-9`, e lançar em desenvolvimento e
em teste. Trilha que não fecha é defeito de cálculo, não de apresentação.

### 7.1 Cap na trilha, honestamente

Cap nunca é silencioso. É item de primeira classe, e mostra o valor que destruiu:

```json
{
  "capId": "CAP_NO_README",
  "ceiling": 40,
  "valueBefore": 63.2,
  "delta": -23.2,
  "binding": true,
  "reason": "Nenhum README encontrado na raiz, em .github/ ou em docs/.",
  "releasedBy": ["REPO_README_PRESENT"],
  "evidenceIds": ["ev:repo:octo-example/exemplo#tree.entry:__root__"]
}
```

A interface diz: *"Presentation seria 63. Está limitada a 40 porque não há README. Adicionar um
libera 23 pontos."* Essa frase é o produto inteiro.

### 7.2 Confiança na trilha

`confidenceMix` reporta que fração do denominador veio de sinal de confiança baixa — na prática,
de LLM. Acima de ~30%, a categoria é renderizada com marcador de *parcialmente interpretado*.

Sinal derivado de modelo **NUNCA DEVE** ser apresentado com o mesmo peso visual que
`licenseInfo.spdxId`.

---

## 8. Recomendações

```
priority = impact × confidence ÷ effort
```

`expectedGain` **NÃO É estimado** — é calculado, reexecutando o motor puro com o `grade` do achado
elevado à próxima faixa. Custa quase nada, porque `score()` não faz I/O.

**Ganhos individuais não são aditivos.** Caps e denominador compartilhado tornam a soma errada. O
recomendador **DEVE** calcular:

- um contrafactual por recomendação do topo; **e**
- um contrafactual **conjunto** para as três primeiras juntas.

A chamada para ação usa o número conjunto: *"Fazendo estas três coisas: 78 → 89"*. É honesto, é
barato, e é um gancho melhor do que a própria nota.

---

## 9. Disciplina de LLM

O motor determinístico é inútil se o modelo puder injetar variância por baixo. Quatro mecanismos
estruturais, todos obrigatórios:

1. **Quantização em enum.** Sinal de LLM é sempre `enum` de 3 a 5 níveis, **nunca** número. A
   tradução enum → nota é dado da rubrica, revisável em diff.
2. **`temperature: 0`**, e voto de maioria em 3 amostras nos slots interpretativos de maior peso.
   Divergência ⇒ neutro, `confidence: 'low'`, e *"não avaliado com confiança"* na trilha.
3. **Cache por hash de conteúdo.** O mesmo README produz o mesmo sinal para sempre. É boa parte do
   que faz "reproduzível" ser verdade operacional, e não aspiração.
4. **Teto de 40%** do denominador de qualquer categoria vindo de LLM, validado no boot.

E uma regra de conteúdo: **um sinal de LLM NÃO DEVE ser base única de achado negativo de severidade
alta.** Todo negativo de severidade alta precisa de corroborador determinístico. É a diferença
entre *"seu posicionamento está pouco claro"* — interpretativo, aceitável — e *"você não tem
testes"*, que precisa ser fato.

---

## 10. O que "reproduzível" significa aqui

Sem definição precisa, é promessa falsa: o GitHub muda embaixo do produto o tempo todo.

> **Dado o mesmo `RawScan` armazenado, a mesma `rubricVersion` e a mesma `interpreterVersion`, a
> nota é idêntica bit a bit.**

O produto **NÃO DEVE** insinuar que rescanear amanhã dá o mesmo número. Ele **DEVE** exibir o
timestamp do scan e permitir re-pontuar um scan antigo com uma rubrica nova, mostrando as duas.

Para isso funcionar, é obrigatório persistir `Facts`, `Evidence` e `Signal[]` — não apenas a nota.
Sem os fatos armazenados, `rubricVersion` é decoração. Ver
[ADR-0007](../adr/0007-snapshots-imutaveis.md).

Toda avaliação grava: `rubricVersion`, `rubricHash`, `interpreterVersion`, `collectorVersion`,
`rawScanHash`, `factsHash`, `signalsHash`.

---

## 11. Determinismo numérico

Regras de implementação que existem porque já quebraram produtos parecidos:

- **Proibido `Date.now()`, `new Date()`, `Math.random()` e `process.env`** sob `modules/scoring` e
  `rubric/`. O "agora" entra como `facts.scanAt`. É a fonte de não-determinismo mais comum, via
  lógica de "há quanto tempo foi o último commit".
- **Proibido `Math.log` e `Math.pow`** no cálculo. Não são especificados bit a bit pelo IEEE-754 e
  divergem entre engines. Faixas logarítmicas — stars, cadência de commits — usam **tabela de
  limiares** na rubrica, que além de determinística é mais legível e mais revisável que fórmula.
- Iteração apenas sobre arrays pré-ordenados. Nada depende de ordem de `Object.keys`.
- Arredondamento só nas bordas: `round(x×100)/100` para os campos de `math`, `round(x×10)/10` para
  exibição. Com apenas `+ − × ÷` sobre doubles, isso é determinístico entre plataformas.

---

## 12. Anti-gaming

Três camadas, em ordem crescente de força.

| Camada | Como funciona | Quão difícil é burlar |
| --- | --- | --- |
| **Limiar de substância** | `byteSize`, contagens, métricas estruturais | Fácil — basta encher linguiça |
| **Corroboração cruzada** | Afirmação num lugar precisa de fato em outro | Difícil — exige construir a coisa |
| **Evidência de execução** | O CI rodou? Passou? | Impossível sem pipeline real |

A camada 2 é a mais subutilizada em ferramentas do gênero, e a mais valiosa aqui:

- `ARCHITECTURE.md` cita módulos → esses nomes existem como diretórios na árvore?
- README manda rodar `npm install` → existe `package.json`?
- README mostra `docker compose up` → existe arquivo de compose?
- Badge afirma cobertura → o CI tem passo de cobertura?
- `tests/` existe → algum workflow invoca um runner de teste?

Divergência gera `DOC_CLAIM_UNCORROBORATED`, que é simultaneamente sinal de nota e um achado
genuinamente útil: *"seu README manda rodar `make dev`, mas não há Makefile"*.

**`byteSize` de README NUNCA DEVE ser pontuado diretamente.** É o número mais trivialmente inflável
do payload. Serve só como portão (`< 500 bytes ⇒ stub`), com corroboração estrutural por cima.

As escadas de avaliação por substância — licença, `ARCHITECTURE.md`, testes, CI — estão em
[`rules-catalog-v1.md` §3](rules-catalog-v1.md).

---

## 13. Nota por repositório

Mesma álgebra, sujeito diferente. Categorias de escopo `repo`: `PRE`, `ENG`, `OSS`, `MNT`, `HYG`,
`DIS`.

Agregação para o perfil, por slot, ponderada por proeminência:

```
prominence(r) = fixado ? 3 : (entre os 3 primeiros por relevância ? 2 : 1)
gradeAgregado(slot) = Σ prominence(r) × grade(slot, r) / Σ prominence(r)
```

**NÃO DEVE** usar `min` — um repositório ruim não derruba o perfil inteiro. **NÃO DEVE** usar `max`
— seria burlável com um único repositório-vitrine. O caso "um fixado fraco" é tratado onde pode ser
explicado: `PINNED_BEST_WORK`, em `CUR`.

### 13.1 Salvaguardas obrigatórias

Nota por repositório é mais arriscada que a do perfil. Um utilitário minúsculo e excelente tiraria
35, e o usuário estaria certo. Portanto:

- Repositório abaixo do limiar de materialidade (`REPO_MATERIALITY`) **NÃO DEVE** ser
  pontuado. É excluído, não zerado.
- O tipo de projeto detectado **DEVE** aparecer ao lado da nota.
- A interface **DEVERIA** exibir faixa qualitativa — `Strong` / `Solid` / `Thin` — em vez de inteiro
  nu. O perfil pode carregar valor preciso porque agrega; um repositório pequeno, não.

---

## 14. Seleção de repositórios

Precisa ser determinística e **não pode depender da nota**, sob pena de circularidade.

```
selecionados = fixados (apenas Repository; gists filtrados)
             ∪ top-K por (stars DESC, pushedAt DESC, name ASC), K = 8
             − forks
             − vazios
             − triviais (< 10 entradas na árvore E README < 500 B)
```

Desempate por `name ASC` é **obrigatório**, ou os arquivos golden oscilam entre execuções.

---

## 15. Formato da rubrica

Dado declarativo em TypeScript, mais um registry de graders puros referenciados por `GraderId`.
Não JSON, não código imperativo. Justificativa em [ADR-0006](../adr/0006-rubrica-versionada.md).

```
src/rubric/
  types.ts          # Rubric, Slot, SlotVariant, Cap, Persona + validadores Zod
  graders/index.ts  # Record<GraderId, (ctx: SubjectFacts) => GradeResult>
  predicates/index.ts
  v1.0.0.ts         # CONGELADO
  registry.ts
  __tests__/frozen.test.ts
```

`rubricHash = sha256(canonicalJson(rubric))`, com teste que falha se alguém editar versão publicada.

**Limite honesto:** o hash protege o **dado**; os arquivos golden protegem o **código dos graders**.
Mudar `countTestFiles` não move o hash — move os goldens, e o diff do PR torna isso visível. Os dois
mecanismos são necessários; nenhum basta sozinho.

---

## 16. Estratégia de teste

| Tipo | O que garante |
| --- | --- |
| **Golden files** | Fixtures verbatim da API + sinais de LLM congelados → `ScoreBreakdown` esperado, para as 6 personas. Toda mudança de peso vira diff revisável |
| **Limites** | Toda categoria em `[0,100]`, overall em `[0,100]`, nunca `NaN` |
| **Trilha fecha** | A identidade de §7, com epsilon `1e-9`, em toda categoria de toda fixture |
| **Invariância de persona** | Notas de categoria idênticas entre as seis personas |
| **Independência de ordem** | Embaralhar repos, evidências e sinais não muda a saída |
| **Monotonicidade** | Elevar um `grade` nunca baixa a categoria. **Não vale de graça** — um predicado de cap mal escrito quebra isso, e é justamente o que o teste pega |
| **Denominador invariante** | Para todo `ProjectType`, `Σ slot.weight` por categoria é idêntico |
| **Anti-gaming** | Licença vazia ≤ 0.15; `ARCHITECTURE.md` de 3 linhas ≤ 0.25; workflow só com `workflow_dispatch` ≤ 0.25; `tests/` com um placeholder ≤ 0.25 |
| **Mutação** | *Adicionar arquivo vazio nunca aumenta a nota* — propriedade sobre um conjunto de mutações |

Testes de pontuação **NUNCA** chamam LLM. Sinais congelados são entrada. O contrato com o modelo é
testado à parte: recusa, JSON truncado, campo faltando, alias de evidência alucinado e enum fora do
domínio **DEVEM** degradar para neutro com `confidence: 'low'` — e **nunca** para nota inventada.

**Política de PR:** mudança de rubrica **DEVE** vir acompanhada do diff dos goldens e de uma linha
de changelog no arquivo da rubrica. Esse portão de revisão vale mais que qualquer quantidade de
teste unitário.

---

## 17. Dry-run de calibração

Executado em 2026-09-04 contra o perfil `octo-example`, com dados reais da API e os 6 repositórios
fixados como conjunto selecionado. Os slots interpretativos (`readmeClarity`, `bioSpecificity`,
`structure`, `pitch`, `commitQuality`) foram estimados à mão — ainda não há analisador semântico.

| Categoria | Nota | Leitura |
| --- | ---: | --- |
| `CUR` | 97 | 6 fixados coerentes, arquivamento em dia, 9% de ruído em 92 repositórios |
| `POS` | 90 | Profile README substantivo, bio específica, portfólio concentrado |
| `PRE` | 85 | READMEs de 13–25 KB e bem estruturados; perde no slot de demonstração |
| `HYG` | 85 | Sem segredo aparente; `.DS_Store` versionado em 2 repositórios |
| `MNT` | 76 | Tudo com commit recente; quase nenhuma release |
| `DIS` | 53 | 3 de 6 sem topic, 5 de 6 sem homepage |
| `ENG` | 45 | Testes em 1 de 6, CI em 3 de 6, nenhum `ARCHITECTURE.md` |
| `OSS` | 31 | 5 de 6 sem licença reconhecível, 5 de 6 sem release |

| Persona | Overall |
| --- | ---: |
| freelancer | 79 |
| recruiter | 78 |
| general | **72** |
| staff-engineer | 68 |
| senior-engineer | 66 |
| oss-maintainer | 61 |

### 17.1 O que o dry-run validou

- **A trilha fecha.** `Σ earned + Σ forgone = 100` em todas as 8 categorias, com epsilon `1e-9`.
- **Convexidade vale.** `min(cat) ≤ overall ≤ max(cat)` para as seis personas.
- **O espalhamento entre personas é informativo, não ruído.** 61 para mantenedor de OSS, 79 para
  freelancer — 18 pontos, e a razão é legível: `OSS` pesa 28 numa e 5 na outra.
- **O resultado é defensável.** Um perfil com projetos fortes, bem apresentados, sem testes, sem
  licença e sem release deve mesmo pontuar alto em `POS`/`CUR` e baixo em `ENG`/`OSS`. A rubrica não
  produziu absurdo em nenhuma das pontas.

### 17.2 O que o dry-run revelou

- **`CAP_NO_LICENSE_PUBLIC` não mordeu.** Teto de 35 com `OSS` em 30.9: o cap ficou ativo e não
  limitante. É exatamente o caso previsto em §5.1 — a interface **DEVE** mostrá-lo como *"também
  ativo, não limitante"*, ou o usuário adiciona licença, não vê a nota mover e conclui que a
  ferramenta é aleatória. Sob razão, um repositório sem licença já pontua baixo em `OSS` sozinho; o
  cap ganha o pão principalmente no roll-up e em repositórios que têm tudo **exceto** licença.
- **`CUR` em 97 é suspeito de generosidade.** Cinco slots, quatro deles em 1.00. Merece verificação
  contra um perfil deliberadamente mal curado antes de congelar a v1.
- **A medição corrigiu a própria especificação.** Cinco números citados como motivação no
  `README.md` estavam errados, incluindo uma contagem de imagens que caiu no falso positivo descrito
  na regra 15 do catálogo. Nenhuma linha de código foi escrita ainda.

## 18. Changelog

### v1.0.0 — não publicada

Versão inicial. 8 categorias, 51 regras, 6 caps, 6 personas. Ainda não congelada: enquanto não
houver implementação e um dry-run contra perfis reais, os pesos são hipótese, não medição.
