# syntax=docker/dockerfile:1.7
# Image d'une app Next.js du monorepo (storefront ou dashboard).
#   docker build -f infra/docker/next.Dockerfile --build-arg APP=storefront .
# Contexte de build = racine du monorepo.

ARG APP=storefront

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS build
ARG APP
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm run build:packages && pnpm --filter "@jokko/${APP}" run build

# ---- runtime : sortie « standalone » de Next --------------------------
FROM node:22-alpine AS runtime
ARG APP
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache curl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=app:app /repo/apps/${APP}/public ./apps/${APP}/public
ENV APP_DIR=apps/${APP}
USER app
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --retries=10 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3000}/" -o /dev/null || exit 1
CMD ["sh", "-c", "node ${APP_DIR}/server.js"]
