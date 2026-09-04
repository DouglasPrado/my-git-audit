# Roadmap

> Ordem de construção. A regra que a organiza: **a parte difícil deste produto é a nota, não a
> interface nem a IA.** O que torna a nota confiável vem primeiro; o que a enfeita vem depois.

---

## Sequência

| # | Épico | Entrega | Estado |
| --: | --- | --- | --- |
| 1 | **Fatia vertical determinística** | Username → coleta → `Facts` → regras → nota → relatório. **Sem LLM** | **Feito** |
| 2 | Ingestão completa | Coleta em três fases, seleção de repositórios, casos-armadilha do catálogo | **Feito** |
| 3 | Rule engine | As 47 regras, com evidência e proveniência | **Feito** |
| 4 | Scoring engine | Slots, caps, personas, trilha de auditoria, golden, anti-gaming | **Feito** |
| 5 | **Análise semântica** | Porta `SemanticAnalyzer`, `EvidencePack`, positioning e clareza de README | Próximo · ativa `AI_ENABLED` |
| 6 | Recomendações | Contrafactual individual e conjunto, ordenação por impacto/esforço | **Feito** |
| 7 | Relatório | Trilha clicável, explorador de repositórios | **Feito** — falta o *10 Second Test* (depende do Épico 5) |
| 8 | Histórico | Rescan, diff por `EvidenceId`, comparação | Pendente · exige `PERSISTENCE` real |
| 9 | **Deep Scan** | Shallow clone, análise estática de código | Pendente · ativa `ASYNCHRONOUS` |
| 10 | Repositórios privados | Consentimento por repositório, escopos ampliados | Pendente · reavaliar `REGULATED` |

### O que ainda não está de pé

Três coisas que a documentação especifica e a implementação ainda não tem — vale registrar para
não parecerem esquecimento:

- **`PERSISTENCE` é um `Map` em processo**, não Postgres. A forma do port já é a documentada
  (`insert`/`find`, sem caminho de `UPDATE`), então trocar o adaptador não toca no domínio — mas
  hoje um restart perde os scans, e sem isso não há Épico 8.
- **`MULTI_TENANT` está declarada e não implementada.** Não há Clerk, não há `ownerId`, não há teste
  de vazamento. O produto roda com um token de servidor. É o que falta para o [ADR-0012](adr/0012-clerk-github-oauth.md)
  sair do papel.
- **Os cinco slots interpretativos caem em variante neutra.** A nota é honesta sobre isso — a
  interface marca a categoria como *parcialmente interpretado* —, mas `Positioning` hoje carrega
  35% de peso avaliado por aproximação determinística, não por leitura.

---

## Notas de sequenciamento

**Épico 1 não usa LLM, de propósito.** Introduzir modelo e rubrica ao mesmo tempo mistura duas
fontes de erro: quando a nota sair estranha, não se sabe se a culpa é do peso ou do prompt.
Determinístico primeiro, interpretativo depois.

**Épico 4 é o mais importante e o menos visível.** É onde o produto ganha ou perde a propriedade que
vende. Não deve ser comprimido para chegar mais rápido no Épico 7.

**A ativação de `ASYNCHRONOUS` é consequência do Épico 9, não decisão isolada.** Não se "adiciona
BullMQ" — implementa-se Deep Scan, que exige processamento fora do ciclo de requisição, e a
capacidade é ativada com a entrega mínima que ela obriga: `JobEnvelope` versionado, idempotência,
retry classificado, DLQ com retenção e replay, graceful shutdown e métricas de fila.

O gatilho alternativo é operacional: Quick Scan com p95 acima de 25 s. Ver
[ADR-0010](adr/0010-asynchronous-off-na-v1.md).

**Épico 10 pode reabrir uma decisão arquitetural.** Analisar repositório privado muda a classe dos
dados que trafegam e podem chegar a um provedor de LLM. Antes de começá-lo, reavaliar `REGULATED` e
revisar [ADR-0008](adr/0008-analise-estatica-apenas.md).

---

## O que deliberadamente não está aqui

| Ideia | Por que não |
| --- | --- |
| Nota pública indexável de qualquer perfil | Publica avaliação de quem não pediu. Só com ação explícita do dono |
| Ranking entre usuários | Transforma a ferramenta em placar e convida a otimização artificial |
| Score do gráfico de contribuição | Pune quem trabalha em repositório privado de empregador |
| Correção automática por PR | Gera exatamente o tipo de commit vazio que o anti-gaming tenta detectar |
| GitLab, Bitbucket, Codeberg | Depois. O domínio já é independente do GitHub para tornar isso barato — mas o produto ainda precisa provar valor numa fonte só |
