# Build a partir da raiz do repositório: docker build -f apps/web/Dockerfile .
FROM node:24-slim AS builder
# O Corepack instala o pnpm da versão fixada no packageManager do package.json da raiz.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

COPY . .
RUN --mount=type=cache,target=/pnpm-store pnpm install --frozen-lockfile --store-dir /pnpm-store

# O API_URL é público: entra no bundle do navegador na hora do build.
ARG API_URL=http://localhost:8000
ENV NODE_ENV=production
ENV API_URL=$API_URL
RUN cd apps/web && pnpm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app /app

ENV HOST=0.0.0.0
ENV PORT=3001
EXPOSE 3001

# SSR chunks require workspace dependencies at runtime
WORKDIR /app/apps/web
CMD ["node", ".output/server/index.mjs"]
