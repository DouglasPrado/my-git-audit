# ADR-0008 — Análise estática apenas; nenhuma execução de código de terceiros

## Status
Aceito

## Contexto
O Deep Scan clona repositórios arbitrários da internet. Vários sinais valiosos são tentadores de
obter por execução: rodar a suíte de testes para medir cobertura real, rodar o build para provar que
compila, instalar dependências para resolver a árvore.

Executar código de terceiro não confiável em infraestrutura própria é uma das superfícies de ataque
mais bem compreendidas que existem. `npm install` roda `postinstall`. `make` roda o que o Makefile
mandar.

## Decisão
Nenhum código do repositório analisado é executado. Nunca. Nem `npm install`, nem `pnpm build`, nem
`cargo build`, nem `make`, nem script de `package.json`, nem hook de git.

O Deep Scan lê arquivos. Ponto.

Se algum dia isso mudar, é **pré-condição arquitetural**, não detalhe de implementação: sandbox
efêmero, sem credencial, sem rede, limite de CPU e de memória, timeout, sistema de arquivos somente
leitura. Enquanto essas condições não existirem, a resposta é não.

## Alternativas consideradas
- **Rodar testes em container para medir cobertura real** — o sinal é genuinamente valioso e
  dificílimo de falsificar. Rejeitada por ora: container não é fronteira de segurança suficiente
  para código hostil arbitrário, e o custo de fazer certo é alto.
- **Executar só para repositórios acima de N stars** — rejeitada: popularidade não é sinal de
  benignidade, e é justamente o que um atacante otimizaria.
- **Instalar dependências com `--ignore-scripts`** — mitiga o vetor mais óbvio, não todos. E a
  árvore resolvida acrescenta pouco frente ao lockfile, que pode ser lido estaticamente.

## Consequências
- Cobertura real de testes, tempo de build e resolução de dependências ficam fora do produto. É
  perda aceita.
- O que sobra ainda é muito: densidade de asserções, razão teste/fonte, distribuição de tamanho de
  arquivo, densidade de `TODO`, detecção de segredo por entropia, atomicidade de commit.
- Frescor de dependências continua possível: blob do lockfile mais consulta à OSV. Uma chamada
  externa, nenhuma execução.
- **O Épico 10 (repositórios privados) pode reabrir esta decisão**, porque muda a classe dos dados
  em trânsito. Reavaliar antes de começá-lo.

## Verificação
- Nenhuma dependência de execução de processo em `modules/collection`; fiscalizado por lint sobre
  `node:child_process`.
- O clone do Deep Scan usa `--depth 1` e desativa hooks explicitamente.
- Revisão de segurança obrigatória em qualquer PR que toque no caminho de clone.

## Revisão
Antes do Épico 9, e obrigatoriamente antes do Épico 10.
