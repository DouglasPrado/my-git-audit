# syntax=docker/dockerfile:1.7
# Imagem do app web. Um deployable só — ADR-0001.
#
# Fica na RAIZ de propósito: o contexto de build precisa ser o repositório
# inteiro (o estágio de deps copia os manifestos de todo o workspace), e é isso
# que a detecção padrão do EasyPanel assume. Movê-lo para apps/web exigiria
# configurar `buildFile` no painel.

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# ---- deps: só lockfile e manifestos, para o cache sobreviver a mudança de código.
FROM base AS deps
# `@gba/components` vem do registry privado. A credencial NÃO pode ir para o
# .npmrc do projeto (é versionado) nem virar ENV (fica na imagem). Entra como
# BuildKit secret: existe durante o RUN e não sobra em nenhuma camada.
#   docker build --secret id=npmrc,src=$HOME/.npmrc ...
# No EasyPanel, o equivalente é o campo de secret de build do serviço.
# O .npmrc do PROJETO entra junto: é ele que mapeia o escopo @gba para o
# registry privado. Sem ele o pnpm procura @gba/components no npmjs.org e leva
# 404, mesmo com a credencial montada — o token autentica, mas no registry errado.
COPY .npmrc pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/kernel/package.json packages/shared/kernel/
COPY packages/shared/contracts/package.json packages/shared/contracts/
COPY packages/modules/collection/package.json packages/modules/collection/
COPY packages/modules/scoring/package.json packages/modules/scoring/
COPY packages/modules/reporting/package.json packages/modules/reporting/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    --mount=type=secret,id=npmrc,target=/root/.npmrc,required=false \
    pnpm install --frozen-lockfile

# ---- build
FROM base AS build
# A árvore INTEIRA do estágio de deps: num workspace pnpm cada pacote tem seu
# próprio node_modules com os links para os irmãos. Copiar só a raiz e o app faz
# `@audit/kernel` e companhia sumirem, e o Next falha com module-not-found.
COPY --from=deps /app ./
# O .dockerignore exclui node_modules, então isto traz o fonte sem sobrescrever
# o que veio acima.
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# O pnpm 11 revalida as dependências antes de cada `run`, e essa revalidação
# tenta ALCANÇAR o registry — aqui, sem credencial, resulta em 401 no
# @gba/components. As deps já vieram do estágio anterior com lockfile congelado,
# então a checagem é redundante: desligá-la evita levar o segredo para um
# estágio que não precisa dele.
ENV PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
RUN pnpm --filter @audit/web build

# ---- runtime: nada de código de terceiro executando na imagem final.
FROM base AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=4310
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 4310
CMD ["node", "apps/web/server.js"]
