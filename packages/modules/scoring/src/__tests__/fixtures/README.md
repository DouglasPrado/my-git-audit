# Fixtures

`example-profile.json` é uma fixture **anonimizada**, derivada de uma coleta real feita contra a API
do GitHub durante a construção do produto.

A transformação trocou login, nomes de repositório, descrições, OIDs, headlines de commit e o texto
de todo README e workflow — preservando as **métricas estruturais** que os graders efetivamente
leem: contagem de títulos, imagens, blocos de código, comandos de instalação, parágrafos de prosa,
proporção de Conventional Commits, e os gatilhos e jobs de cada workflow.

Isso é deliberado, e é a mesma regra que o produto aplica a quem audita: publicar a árvore completa
de repositórios de uma pessoa — inclusive quais têm arquivo de credencial versionado — seria o tipo
de exposição que esta ferramenta existe para evitar.

Para gerar uma fixture nova a partir de um perfil real, use `pnpm fixture <login>`. O resultado
**não deve ser versionado** sem passar por anonimização equivalente.
