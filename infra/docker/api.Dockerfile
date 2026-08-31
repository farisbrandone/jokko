# syntax=docker/dockerfile:1.7
# Image de l'API Jokko (NestJS). Contexte de build = racine du monorepo.

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

# ---- deps + build -------------------------------------------------------
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm run build:packages && pnpm --filter "@jokko/api" run build
# Bundle auto-contenu (app + deps de prod ; les packages du workspace sont copiés)
RUN pnpm --filter "@jokko/api" --prod \
    --config.inject-workspace-packages=true \
    deploy /out

# ---- runtime ----------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
RUN apk add --no-cache curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /out ./
USER app
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --retries=10 \
  CMD curl -fsS http://127.0.0.1:3333/healthz || exit 1
CMD ["node", "dist/main.js"]
