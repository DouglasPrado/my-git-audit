# PRD — GitHub Profile Auditor

> Documento de produto. Regras de cálculo estão em [`rubric/rubric-v1.md`](rubric/rubric-v1.md);
> este documento define **o que** o produto entrega e **para quem**, não **como** a nota é somada.

---

## 1. Visão

O produto analisa um perfil público do GitHub e responde três perguntas:

1. **O que este GitHub comunica sobre esta pessoa?**
2. **Quão forte é essa apresentação, e por quê?**
3. **O que melhorar primeiro, e quanto isso vale?**

Posicionamento: **"See what your GitHub says about you before a recruiter or engineer does."**

O que o produto **não** é: um placar de atividade. Contagem de commits, gráfico de contribuição,
streak, stars e seguidores **NÃO DEVEM** compor a nota (ver §9).

---

## 2. Problema

Um desenvolvedor pode ter projetos tecnicamente excelentes e um GitHub que comunica muito pouco
sobre sua capacidade. O código existe; a percepção pública não o representa.

Sintomas recorrentes, todos verificáveis sem clonar nada:

| Sintoma | Efeito na percepção |
| --- | --- |
| Repositório sem `description` | Não aparece em busca, não se explica na listagem |
| Sem topics | Invisível para quem filtra por tecnologia |
| README sem imagem em projeto visual | Exige que o leitor rode o projeto para entender |
| Arquitetura excelente escondida só no código | Quem avalia em 30 s não a encontra |
| Placeholder esquecido (`{{org}}`, `your-username`) | Sinaliza projeto não terminado |
| Repositório arquivado em destaque, sem contexto | Lê-se como abandono |
| Fixados sem coerência entre si | Não forma narrativa profissional |
| Sem `LICENSE` | Ninguém sabe se pode usar |
| Perfil sem README | Não há posicionamento algum |

O caso de calibração está no [`README.md`](../README.md) da raiz: um perfil onde o próprio GitHub
reporta `health_percentage: 100` e que, medido contra a API real, tem 5 de 6 repositórios fixados
sem release, 5 de 6 sem imagem no README e 5 de 6 sem licença reconhecível por SPDX.

Vale registrar como esses números foram obtidos, porque a primeira medição estava **errada**: um
`grep` só pela sintaxe markdown `![](...)` contou zero imagens em `clipview`, que na verdade
tem duas, em `<img>` HTML. É exatamente o falso positivo que a regra 15 do catálogo manda evitar — e
ele apareceu na própria especificação antes de existir código. Toda regra deste produto vai errar
assim se não for testada contra dados reais.

---

## 3. Proposta de valor

### 3.1 Como meu GitHub é percebido — o *10 Second Test*

O sistema lê apenas o que um visitante veria nos primeiros segundos: nome, bio, início do Profile
README, repositórios fixados e suas descrições. E responde:

```
What your profile communicates

Primary:     Developer Tooling
Secondary:   AI Infrastructure · Distributed Systems
Additional:  Desktop Engineering

Identity clarity: 91%
```

Também detecta conflito entre o que a pessoa diz e o que os projetos mostram:

```
Bio says:                  Frontend Engineer
Pinned repos indicate:     Mostly backend infrastructure
Positioning consistency:   48%
```

### 3.2 Qual é minha nota

Nota geral de 0–100, decomposta em oito categorias, **sempre acompanhada do rótulo da persona**
(§5). Cada número é clicável até a evidência que o produziu.

### 3.3 O que fazer agora

Recomendações ordenadas por `impacto × confiança ÷ esforço`, cada uma com o ganho estimado por
contrafactual real — o motor de pontuação é puro, então o ganho é **calculado**, não estimado a
olho. Ver [`rubric/rubric-v1.md` §8](rubric/rubric-v1.md).

```
Highest impact improvements

1. Add CI to clipview                +5
2. Publish first pane release         +4
3. Add a screenshot to vault            +3
4. Add a license to match-engine   +2

Doing all four together: 78 → 89
```

O ganho conjunto **DEVE** ser exibido, e **NÃO DEVE** ser a soma dos ganhos individuais — por causa
dos tetos e do denominador, ganhos não são aditivos.

---

## 4. Público

**Principal:** engenheiros de software que usam o GitHub como portfólio — pleno buscando sênior,
sênior buscando recolocação, candidatos a vagas internacionais, freelancers, mantenedores de OSS.

**Secundário:** tech leads, staff engineers, criadores de developer tools, bootcamps, recrutadores
técnicos, consultorias de carreira.

---

## 5. Personas de avaliação

A mesma conta pode ser avaliada sob óticas diferentes. A persona **altera apenas o peso** de cada
categoria e a ordenação das recomendações. Ela **NÃO DEVE** alterar fato coletado, nota de
categoria nem teto — ver [ADR-0005](adr/0005-algebra-de-score.md).

| Persona | Prioriza |
| --- | --- |
| **General Software Engineer** | Avaliação equilibrada (padrão) |
| **Recruiter** | Clareza, apresentação, curadoria, atividade recente |
| **Senior Engineer** | Testes, CI, arquitetura, documentação técnica |
| **Staff Engineer** | System design, trade-offs, confiabilidade, ADRs |
| **Open Source Maintainer** | Licença, contributing, releases, comunidade |
| **Freelancer** | Projetos usáveis, demos, apresentação, contato |

Como as notas de categoria são invariantes entre personas, todas as seis são calculadas em toda
avaliação sem custo adicional. Isso habilita a afirmação mais útil do relatório:

> *"Um recrutador lê este perfil como 74. Um staff engineer lê como 61 — porque Engineering Signals
> pesa 30 lá e 12 aqui."*

Essa frase é uma feature melhor do que o próprio seletor de persona.

---

## 6. Modos de análise

### 6.1 Quick Scan

Sem clonar nada. Duas queries GraphQL e algumas chamadas REST.

Coleta: perfil, Profile README, fixados, metadados de repositório, README, topics, linguagens,
licença, releases, workflows, árvore raiz e `.github`, histórico dos últimos 100 commits do branch
default e o resultado das check suites.

**Tempo alvo:** p50 ≤ 8 s, p95 ≤ 20 s.
**Custo de rate limit:** ~2–4 pontos de 5000/hora. O limite não é restrição; latência e custo de
LLM são.

### 6.2 Deep Scan

Shallow clone dos principais repositórios, análise **estática apenas**. Nenhum código de terceiro é
executado — ver [ADR-0008](adr/0008-analise-estatica-apenas.md).

Acrescenta o que só existe com o código na mão: densidade de asserções em teste, razão teste/fonte,
distribuição de tamanho de arquivo, densidade de `TODO`/`FIXME`, detecção de segredo por entropia,
detecção de código gerado ou vendorizado, atomicidade de commit no histórico completo.

**Correção a uma premissa comum:** autoria de commit, headline de commit e contagem de commits dos
últimos 12 meses **já estão no Quick Scan** via `defaultBranchRef.target.history` — incluindo a
melhor checagem anti-gaming disponível sem clone (esta pessoa escreveu este código?). Não espere o
Deep Scan para isso.

---

## 7. Fluxo

```
Cole a URL  →  Escolha a persona  →  Quick Scan  →  Relatório
                                                        │
                                     Compare  ←  Rescan ←  Corrija o GitHub
```

O laço `Analyze → Improve → Rescan → Compare` é o motor de retenção. Cada scan é imutável, então o
diff entre dois scans é factual:

```
Scan #1 (04 set)   72
Scan #2 (11 set)   86        +14

+ Profile README adicionado
+ 5 repositórios ganharam description
+ 3 repositórios ganharam topics
+ CI adicionado a pane
− 1 repositório novo sem licença
```

---

## 8. Autenticação e escopo de dados

Login com **GitHub via Clerk** — ver [ADR-0012](adr/0012-clerk-github-oauth.md). O token de acesso
do GitHub obtido no login é a credencial que o coletor usa, o que resolve identidade e acesso à API
numa integração só.

**Repositórios privados** são feature posterior (Épico 10) e exigem:

- consentimento **por repositório**, nunca "analisar todos os privados";
- o token **NUNCA** enviado a um LLM;
- trechos de código minimizados no `EvidencePack`;
- exclusão de scan sob demanda.

O relatório distingue `Public Portfolio Score` de `Private Engineering Score`. Eles não se somam.

**Visibilidade do relatório** é escolha do usuário: `private` (padrão), `unlisted`, `public`. O
produto **NÃO DEVE** publicar a nota de ninguém automaticamente.

---

## 9. Restrições de produto

Não são preferências. São limites que protegem a credibilidade da nota.

1. **Não pontuar gráfico de contribuição nem streak.** Pune quem trabalha em repositório privado de
   empregador — a maioria dos sêniores. A versão defensável do mesmo sinal é PR mergeado em
   repositório de terceiro.
2. **Nunca penalizar ausência de stars.** Popularidade não é controlável e é comprável. Só bônus,
   com teto.
3. **Nunca penalizar idioma.** README em português não é README pior.
4. **A nota geral mede o GitHub como artefato profissional, não capacidade de engenharia.** São
   afirmações diferentes, e o produto **DEVE** dizer isso na interface. Confundi-las é o caminho
   mais curto para perder o público cujo endosso o produto precisa.
5. **Existência de arquivo não é nota.** `LICENSE` vazio, `ARCHITECTURE.md` de três linhas, `tests/`
   com um placeholder e workflow que nunca rodou **NÃO DEVEM** pontuar como os equivalentes reais.
6. **Nota por repositório é mais arriscada que a do perfil.** Um utilitário minúsculo e excelente
   tiraria 35, e o usuário estaria certo. Mitigação obrigatória: limiar de materialidade, tipo de
   projeto sempre visível ao lado da nota, e faixa qualitativa (`Strong` / `Solid` / `Thin`) em vez
   de inteiro nu.

---

## 10. Critérios de aceite da primeira versão executável

O produto está funcional quando consegue, de ponta a ponta:

- [ ] Receber uma URL ou username e normalizá-los, incluindo `?tab=repositories`, `www.`, barra
      final e URL de repositório colada no lugar de perfil.
- [ ] Recusar com mensagem clara o que não suporta — perfil de `Organization`, conta inexistente,
      conta sem repositório público.
- [ ] Coletar perfil e selecionar repositórios de forma determinística.
- [ ] Resolver o README **case-insensitive** a partir da árvore, jamais por caminho fixo.
- [ ] Produzir evidência com proveniência (`path`, linha, snippet, permalink no commit escaneado).
- [ ] Avaliar as 51 regras da v1 do catálogo.
- [ ] Calcular a nota deterministicamente e exibir a trilha de auditoria de cada categoria.
- [ ] Gerar recomendações ordenadas, com ganho por contrafactual e ganho conjunto do top 3.
- [ ] Persistir o scan de forma imutável e reexecutar um scan antigo por replay puro.
- [ ] Comparar dois scans e listar o que mudou.
- [ ] Nunca renderizar um score sem rótulo de persona.

**Critério de qualidade, não de funcionalidade:** rodar o catálogo contra os quatro casos-armadilha
(projeto Rust com teste inline, biblioteca sem lockfile, repositório arquivado, repositório
docs-only) sem gerar nenhum achado negativo falso. Ver
[`rubric/rules-catalog-v1.md` §4](rubric/rules-catalog-v1.md).
