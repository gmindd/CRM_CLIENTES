# syntax=docker/dockerfile:1

# ---- 1. Dependências (inclui compilação do better-sqlite3) ----
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Build ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Valor descartável: o build não precisa do segredo real, só de um válido.
ENV SESSION_SECRET="apenas-para-o-build-nao-e-usado-em-runtime-0000"
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 3. Execução ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Lisbon \
    DATABASE_PATH=/app/data/crm.sqlite

RUN apt-get update && apt-get install -y --no-install-recommends tzdata wget \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs crm \
    && mkdir -p /app/data && chown -R crm:nodejs /app

# O output "standalone" já traz o servidor e apenas as dependências necessárias.
COPY --from=builder --chown=crm:nodejs /app/.next/standalone ./
COPY --from=builder --chown=crm:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=crm:nodejs /app/scripts ./scripts

USER crm
EXPOSE 3000
VOLUME ["/app/data"]

HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login > /dev/null || exit 1

CMD ["node", "server.js"]
