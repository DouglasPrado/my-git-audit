# ADR-0012 — Clerk com GitHub como única social connection

## Status
Aceito

## Contexto
Este produto tem uma necessidade de autenticação incomum: **precisa do access token do GitHub como
credencial de API, não apenas de identidade.** A API GraphQL do GitHub exige token — não existe modo
anônimo. Sem token, não há produto.

Então o login não é só "quem é você"; é "com que credencial eu consulto o GitHub em seu nome".

Restrições do contexto: o produto é hospedado e multiusuário desde a v1, e há precedente direto —
`@clerk/nextjs` + `@clerk/backend` já em uso em três repositórios.

## Decisão
Clerk, com **GitHub como única social connection**. Sem senha, sem outro provedor.

O Clerk armazena o OAuth access token do GitHub e o devolve pela Backend API. Uma integração resolve
identidade **e** a credencial que o coletor consome.

Regras de tratamento do token:

- Obtido no servidor, sob demanda, a cada scan. **Nunca** persistido em tabela própria.
- **Nunca** trafega para o cliente.
- **Nunca** é enviado a um LLM.
- **Nunca** aparece em log, telemetria, mensagem de erro ou trilha de auditoria.
- Lido apenas pelo adaptador de coleta.

Escopos na v1: só leitura de dados públicos. Escopo de repositório privado é do Épico 10, com
consentimento explícito.

## Alternativas consideradas
- **OAuth GitHub próprio** — tecnicamente viável e com precedente (há um Authorization Server OAuth
  2.1 escrito à mão em outro repositório). Dá controle total sobre armazenamento, rotação e
  criptografia. Rejeitada para a v1: torna o produto dono de sessão, refresh, revogação e
  criptografia em repouso — trabalho real de segurança que não é o diferencial do produto.
- **Auth.js (NextAuth)** — provider GitHub nativo, expõe o token na sessão. Meio-termo razoável.
  Rejeitada por dois motivos: o token na sessão exige cuidado extra para não vazar ao cliente, e o
  precedente interno de NextAuth é v4 em Pages Router, tratado como legado.
- **Login sem GitHub, token colado pelo usuário** — rejeitada: pedir que alguém cole um PAT é atrito
  alto e péssima prática de segurança para ensinar.

## Consequências
- Uma integração cobre identidade, sessão, multi-tenancy e credencial de API.
- Nenhum segredo de usuário em banco próprio. O produto não guarda token, o que reduz
  materialmente a superfície de incidente.
- Login com GitHub é o gesto natural para o público — e alinha permissão com propósito de forma
  óbvia para quem autoriza.
- **Custo aceito:** dependência de fornecedor no caminho crítico. Clerk fora do ar é produto fora do
  ar.
- **Risco operacional:** token do usuário pode ser revogado no GitHub sem aviso. `token_invalid` é
  erro de domínio de primeira classe, com mensagem que instrui a refazer a conexão — não um 500.

## Verificação
- Serializador de log que falha o build se um campo de token for logável.
- Teste que assere que o token não aparece em nenhuma resposta de API nem em nenhum `EvidencePack`.
- Teste do caminho `token_invalid` ponta a ponta.

## Revisão
Se a dependência de fornecedor se tornar restrição de custo ou de conformidade, ou no Épico 10, se
os escopos exigidos para repositório privado não forem bem suportados.
