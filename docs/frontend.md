# Frontend

> Telas e regras de apresentação. Convenções gerais de componente seguem o padrão dos demais
> repositórios; aqui estão as regras **próprias deste produto**.

---

## 1. Sistema visual

A linguagem visual vem do design system **resend**, empacotado como skill em [`design/`](../design)
(`SKILL.md` + `references/DESIGN.md` + as faces em `design/fonts/`). Tudo o que a marca decide mora
em [`apps/web/src/styles/theme.css`](../apps/web/src/styles/theme.css); nenhum componente carrega
hexadecimal.

**Tema único, escuro.** A skill declara `dark mode toggle: no` e a captura da homepage é chapa
preta — não existe paleta clara da marca para servir, e inventar uma seria decidir por conta
própria algo que a marca já decidiu. Não há bloco `prefers-color-scheme`; `color-scheme: dark` em
`global.css` faz controle nativo, autofill e barra de rolagem acompanharem.

**Os nomes semânticos sobreviveram à repintura.** `paper`, `ink`, `rule`, `credit`, `debit`,
`signal` são vocabulário de DOMÍNIO — crédito e débito de um razão, não decoração. A marca trocou
os valores, não os nomes, e por isso nenhum componente precisou aprender outra língua.

| Papel | Token | Valor | De onde vem |
| --- | --- | --- | --- |
| Fundo / cartão / poço | `paper`, `paper-raised`, `paper-sunken` | `#000000`, `#101010`, `#1b1b1b` | paleta da skill |
| Texto | `ink`, `ink-soft`, `ink-faint` | `#ffffff`, `#a0a0a0`, `#8f8f8f` | paleta da skill (8.0:1 e 6.5:1 sobre preto) |
| Filete / divisor / controle | `rule`, `rule-strong`, `rule-edge` | `#212629`, `#323232`, `#505050` | paleta da skill |
| Acento | `brand` | `#62ffb3` | marca |
| Adquirido | `credit` | `#00c758` | `color-green-500` da paleta |
| Bônus, projeção | `signal` | `#62ffb3` | marca |
| Débito, teto | `debit` | `#ff6369` | **extensão** — Radix, o sistema que a resend usa |
| Alerta | `warn` | `#ffc53d` | **extensão** — idem |
| Manchete | `--font-display` | Domaine Display Narrow | `design/fonts/` |
| Texto | `--font-text` | Inter variável 100–900 | `design/fonts/` |
| Cifra | `--font-mono` | Commit Mono | `design/fonts/` |

O acento é **restrito**: CTA, link, foco, estado ativo, bônus. Adquirido usa o verde fundo
justamente porque preenche metade de um relatório — se ele fosse a menta, o acento deixaria de ser
acento. As duas extensões estão marcadas como tal no `theme.css`, com o motivo: a paleta extraída
não tem papel destrutivo nem de alerta que sobreviva a fundo preto (`#9c6b2e` dá 4.56:1).

As faces são servidas do próprio domínio via `next/font/local` — sem Google Fonts, sem conexão de
terceiro no caminho crítico. Domaine cobre latim acentuado mas **não** cobre `←` e `→`: seta é
coisa de rótulo, e rótulo é Inter ou Commit Mono.

---

## 2. Biblioteca de componentes

Os primitivos vêm de **`@gba/components`** (registry privado `npm.landing`): `Button`,
`Input`, `Label`, `ToggleGroup`, `Card`, `Badge`, `Alert`, `Table`, `Collapsible`, `Tooltip`,
`Spinner`. O que este produto escreve à mão é só o que não existe em biblioteca nenhuma — a
`BalanceBar` e o `Ledger`.

Três decisões de integração que custaram tempo e precisam estar escritas:

**Não importamos `@gba/components/style.css` — mas a folha dela ESTÁ na página assim mesmo.**
Não importar era a decisão; ela não é suficiente. O barrel `dist/index.mjs` carrega a folha
compilada dentro do próprio JavaScript e a injeta num `<style>` em tempo de execução. Importar
qualquer componente traz o tema dela junto, sem passar por bundler, config ou import de CSS.
Confira no navegador:

```js
getComputedStyle(document.documentElement).getPropertyValue('--brand-primary'); // '#293241'
```

Esse valor não existe em lugar nenhum deste repositório. Duas consequências, as duas já mordiram:

1. **Os tokens dela vencem os nossos.** A `<style>` injetada entra depois do nosso `<link>`, com a
   mesma especificidade (`:root`). Sem defesa, `--primary`, `--card`, `--muted-foreground`,
   `--radius-xs` e companhia saem no azul-ardósia da marca dela. A defesa está em
   `styles/theme.css`, num bloco `:root:root` — 0,2,0 contra 0,1,0 ganha por especificidade e
   portanto **independe da ordem de injeção**, que não controlamos. Ao adicionar um token novo ao
   vocabulário shadcn, adicione-o também lá.

2. **Uma variante nossa perde para uma base delas.** Se a folha injetada declara `.grid-cols-2` e
   **não** declara `.lg:grid-cols-6`, a nossa `lg:grid-cols-6` — que está na folha anterior — perde,
   e a grade fica em duas colunas mesmo a 1920px. O mesmo aconteceu com `pt-16 sm:pt-24`. Quando um
   par base+variante precisar de sobreposição, use **valor arbitrário** (`grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]`,
   `pt-[clamp(4rem,8vw,6rem)]`): a biblioteca nunca emite essas classes, e a cascata volta a ser
   nossa. Para conflito no MESMO elemento não há problema — o `cn` dela é `twMerge` e resolve antes
   de renderizar (é assim que a `RepoTable` desliga o `even:bg-muted/30` do primitivo).

Nada disso dispensa o `@source`, que continua necessário para que as classes usadas pela biblioteca
existam resolvidas contra os nossos tokens:

```css
@source '../../node_modules/@gba/components/dist/index.mjs';
```

Ao mudar esse `@source`, apague `.next` — o Tailwind guarda a configuração de scan em cache e a
mudança não pega sozinha.

**`@theme` NÃO funciona dentro de `@media`.** É construção de tempo de build: aninhado numa media
query ele é achatado e o último bloco vence incondicionalmente, apagando do arquivo servido a
paleta que veio antes. Hoje isso não aparece — o tema é único e escuro, e não há media query de
cor — mas a ponte para o vocabulário do shadcn continua usando `@theme inline` justamente para
apontar para as variáveis em vez de congelar valores.

**Fronteira de cliente.** O pacote é um barrel único que chama `createContext`; importar qualquer
coisa dele num Server Component quebra o render. `components/ui.ts` reexporta os primitivos com
`'use client'`. Utilidade pura como `cn` **não** atravessa essa fronteira — fica em `lib/cn.ts`.

---

## 3. Regras herdadas

- `app/**/page.tsx` (e `layout`, `error`, `loading`) **não contém HTML** — compõe uma tela de
  `features/<f>/screens/`.
- Elemento com primitivo equivalente usa o primitivo de `shared/ui`.
- **Nenhuma cor, espaçamento, raio ou sombra fora dos tokens.**
- Variantes por `cva`, composição por `cn`.
- **TanStack Query é o único cache de servidor.** Dado de servidor nunca vai para o Zustand nem para
  `useEffect` + `fetch`.

---

## 4. Regras próprias

Estas não são preferências de design. Vêm do modelo de pontuação e violá-las torna a interface
mentirosa.

### 4.1 Score nunca aparece sem persona

Um número sozinho não significa nada neste produto: 74 sob `recruiter` e 61 sob `staff-engineer`
são a mesma avaliação. Todo componente que renderiza nota **DEVE** exibir o rótulo da persona junto,
no mesmo bloco visual.

### 4.2 Confiança é visível

Categoria cuja fatia de baixa confiança (`confidenceMix.low`) passar de ~30% do denominador **DEVE**
exibir marcador de *parcialmente interpretado*.

Sinal derivado de LLM **NUNCA DEVE** ter o mesmo peso visual que `licenseInfo.spdxId`. Um é
interpretação; o outro é fato verificado por casamento de conteúdo.

### 4.3 Toda afirmação é clicável até a evidência

Nenhum achado é exibido sem caminho para sua evidência: arquivo, linha, trecho e permalink fixado no
commit escaneado.

```
Unresolved placeholder

README.md:183
  git clone https://github.com/{{org}}/vault.git

Impacto: médio · Esforço: <5 min · Ganho: +2
```

### 4.4 Nota de repositório vem com contexto

Nota por repositório **DEVE** aparecer sempre ao lado do `ProjectType` detectado, e **DEVERIA** usar
faixa qualitativa (`Strong` / `Solid` / `Thin`) em vez de inteiro nu. O perfil pode carregar valor
preciso porque agrega; um repositório pequeno, não.

---

## 5. Telas

### 5.1 Entrada

Campo de URL, seletor de persona, botão. O seletor **DEVE** explicar o que muda: *"altera o peso das
categorias, não os fatos coletados"*.

Erros com ação clara, não código: organização não suportada, conta inexistente, conta sem
repositório público.

### 5.2 Progresso

Consome o SSE de [`api.md`](api.md). Mostra etapa e contagem — *"Analisando 4 de 6 repositórios"* —
nunca uma barra falsa.

Falha em análise semântica **NÃO DEVE** virar tela de erro. Vira aviso de relatório parcial, com o
que ficou por avaliar.

### 5.3 Relatório

```
┌────────────────────────────────────────────────────┐
│ Octo Example                            78 / 100  │
│ como Senior Engineer                               │
│                                                    │
│ Engineering        ███████░░░  71                   │
│ Positioning        ████████░░  82                   │
│ Portfolio          ███████░░░  74                   │
│ Presentation       ██████░░░░  62  ⚠ interpretado   │
│ OSS                ███░░░░░░░  31                   │
│ Maintenance        ████████░░  80                   │
│ Hygiene            █████████░  93                   │
│ Discoverability    ██████░░░░  57                   │
└────────────────────────────────────────────────────┘

Um recrutador leria este perfil como 74.
```

Essa última linha sai de graça — as categorias são invariantes entre personas, então
`allPersonaOverall` já vem calculado. É uma feature melhor que o próprio seletor de persona.

### 5.4 Trilha de auditoria

Clicar numa categoria abre a decomposição. Barra segmentada de 100 unidades — adquirido, perdido,
bônus, penalidade, cap — mais a lista assinada:

```
Project Presentation                              62 / 100
adquiriu 62 de 100 disponíveis

  +18  README presente e estruturado
  +12  Quick start corroborado pela árvore
   +8  Pitch claro nos primeiros parágrafos
   −4  Sem imagem em projeto visual
   −6  Sem quick start
```

Cap é item de primeira classe, com o valor que destruiu:

> **Presentation seria 63. Está limitada a 40 porque não há README. Adicionar um libera 23 pontos.**

Caps ativos mas não limitantes aparecem como *"também ativo, não limitante"*. Escondê-los faz o
usuário consertar o item errado, não ver a nota mover e parar de confiar na ferramenta.

### 5.5 Recomendações

Três visões: **Quick wins** (<10 min), **Maior impacto**, **Estrutural**.

O ganho conjunto do top 3 **DEVE** ser exibido, e **NÃO DEVE** ser a soma dos individuais — ganhos
não são aditivos por causa dos caps e do denominador.

> Fazendo estas três coisas: **78 → 89**

### 5.6 Explorador de repositórios

Lista com nota, faixa e tipo detectado. Ao abrir: pontos fortes, achados com evidência, sinais de
engenharia, recomendações.

Repositório excluído por materialidade aparece **listado como excluído, com o motivo** — nunca com
nota baixa. É a diferença entre *"não avaliamos, é pequeno demais"* e *"seu projeto é ruim"*.

### 5.7 Comparação

```
04 set        11 set
  72     →      86        +14

+ Profile README adicionado
+ 5 repositórios ganharam description
+ CI adicionado a pane
− 1 repositório novo sem licença
```

O diff é feito **por `EvidenceId`**, que é chave natural estável entre scans. Não é comparação de
texto nem de nota — é comparação de fatos.

---

## 6. Tom

O produto acusa problemas no trabalho público de uma pessoa real, que provavelmente está procurando
emprego. Um falso positivo confiante custa mais do que dez achados verdadeiros ganham.

| Nunca | Sempre |
| --- | --- |
| "Você vazou uma credencial" | "Um arquivo chamado `.env` está versionado — verifique se não contém segredo" |
| "Seu projeto não tem testes" | "Não encontramos testes — em Rust eles podem estar inline e não conseguimos verificar" |
| "Repositório abandonado" | "Sem commits há 2 anos. Se está terminado, arquivar comunica isso" |
| "Seu README é ruim" | "Um leitor não descobre o que o projeto faz nos primeiros parágrafos" |

E o enquadramento geral, que **DEVE** estar visível no relatório: esta nota mede **o GitHub como
artefato profissional**, não capacidade de engenharia. São afirmações diferentes, e confundi-las é
o caminho mais curto para perder o público que o produto precisa convencer.
