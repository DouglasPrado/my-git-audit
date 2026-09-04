# Frontend

> Telas e regras de apresentação. Convenções gerais de componente seguem o padrão dos demais
> repositórios; aqui estão as regras **próprias deste produto**.

---

## 1. Biblioteca de componentes

Os primitivos vêm de **`@gba/components`** (registry privado `npm.landing`): `Button`,
`Input`, `Label`, `ToggleGroup`, `Card`, `Badge`, `Alert`, `Table`, `Collapsible`, `Tooltip`,
`Spinner`. O que este produto escreve à mão é só o que não existe em biblioteca nenhuma — a
`BalanceBar` e o `Ledger`.

Duas decisões de integração que custaram tempo e precisam estar escritas:

**O CSS compilado da biblioteca NÃO é importado.** `@gba/components/style.css` é um Tailwind já
construído, com preflight e declaração própria de camadas; trazê-lo para dentro deste build
reordena a cascata e os utilitários daqui param de valer — o sintoma é título encolhido e fundo
branco, com os utilitários presentes no CSS servido e sem nenhum efeito. O caminho correto para um
consumidor Tailwind v4 é escanear o fonte:

```css
@source '../../node_modules/@gba/components/dist/index.mjs';
```

Assim as classes que a biblioteca usa (`bg-primary`, `border-input`) são geradas por **este** build
e resolvem contra os tokens do razão. Uma folha, uma cascata. Ao mudar esse `@source`, apague
`.next` — o Tailwind guarda a configuração de scan em cache e a mudança não pega sozinha.

**`@theme` NÃO funciona dentro de `@media`.** É construção de tempo de build: aninhado numa media
query ele é achatado e o último bloco vence incondicionalmente, apagando a paleta clara do arquivo
servido. O tema escuro sobrescreve as variáveis em `:root` dentro da media query, como CSS comum.
A ponte para o vocabulário do shadcn usa `@theme inline` justamente para apontar para essas
variáveis em vez de congelar valores.

**Fronteira de cliente.** O pacote é um barrel único que chama `createContext`; importar qualquer
coisa dele num Server Component quebra o render. `components/ui.ts` reexporta os primitivos com
`'use client'`. Utilidade pura como `cn` **não** atravessa essa fronteira — fica em `lib/cn.ts`.

---

## 2. Regras herdadas

- `app/**/page.tsx` (e `layout`, `error`, `loading`) **não contém HTML** — compõe uma tela de
  `features/<f>/screens/`.
- Elemento com primitivo equivalente usa o primitivo de `shared/ui`.
- **Nenhuma cor, espaçamento, raio ou sombra fora dos tokens.**
- Variantes por `cva`, composição por `cn`.
- **TanStack Query é o único cache de servidor.** Dado de servidor nunca vai para o Zustand nem para
  `useEffect` + `fetch`.

---

## 3. Regras próprias

Estas não são preferências de design. Vêm do modelo de pontuação e violá-las torna a interface
mentirosa.

### 3.1 Score nunca aparece sem persona

Um número sozinho não significa nada neste produto: 74 sob `recruiter` e 61 sob `staff-engineer`
são a mesma avaliação. Todo componente que renderiza nota **DEVE** exibir o rótulo da persona junto,
no mesmo bloco visual.

### 3.2 Confiança é visível

Categoria cuja fatia de baixa confiança (`confidenceMix.low`) passar de ~30% do denominador **DEVE**
exibir marcador de *parcialmente interpretado*.

Sinal derivado de LLM **NUNCA DEVE** ter o mesmo peso visual que `licenseInfo.spdxId`. Um é
interpretação; o outro é fato verificado por casamento de conteúdo.

### 3.3 Toda afirmação é clicável até a evidência

Nenhum achado é exibido sem caminho para sua evidência: arquivo, linha, trecho e permalink fixado no
commit escaneado.

```
Unresolved placeholder

README.md:183
  git clone https://github.com/{{org}}/vault.git

Impacto: médio · Esforço: <5 min · Ganho: +2
```

### 3.4 Nota de repositório vem com contexto

Nota por repositório **DEVE** aparecer sempre ao lado do `ProjectType` detectado, e **DEVERIA** usar
faixa qualitativa (`Strong` / `Solid` / `Thin`) em vez de inteiro nu. O perfil pode carregar valor
preciso porque agrega; um repositório pequeno, não.

---

## 4. Telas

### 4.1 Entrada

Campo de URL, seletor de persona, botão. O seletor **DEVE** explicar o que muda: *"altera o peso das
categorias, não os fatos coletados"*.

Erros com ação clara, não código: organização não suportada, conta inexistente, conta sem
repositório público.

### 4.2 Progresso

Consome o SSE de [`api.md`](api.md). Mostra etapa e contagem — *"Analisando 4 de 6 repositórios"* —
nunca uma barra falsa.

Falha em análise semântica **NÃO DEVE** virar tela de erro. Vira aviso de relatório parcial, com o
que ficou por avaliar.

### 4.3 Relatório

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

### 4.4 Trilha de auditoria

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

### 4.5 Recomendações

Três visões: **Quick wins** (<10 min), **Maior impacto**, **Estrutural**.

O ganho conjunto do top 3 **DEVE** ser exibido, e **NÃO DEVE** ser a soma dos individuais — ganhos
não são aditivos por causa dos caps e do denominador.

> Fazendo estas três coisas: **78 → 89**

### 4.6 Explorador de repositórios

Lista com nota, faixa e tipo detectado. Ao abrir: pontos fortes, achados com evidência, sinais de
engenharia, recomendações.

Repositório excluído por materialidade aparece **listado como excluído, com o motivo** — nunca com
nota baixa. É a diferença entre *"não avaliamos, é pequeno demais"* e *"seu projeto é ruim"*.

### 4.7 Comparação

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

## 5. Tom

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
