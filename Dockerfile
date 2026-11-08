# syntax=docker/dockerfile:1

# Build de produção (Nuxt 4 + Nitro). O .env nunca entra na imagem: as variáveis chegam na hora de rodar
# (docker-compose.yml ou `docker run --env-file`). O .output já traz as dependências do servidor.

FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile
COPY . .
RUN pnpm install --offline --frozen-lockfile && pnpm build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
