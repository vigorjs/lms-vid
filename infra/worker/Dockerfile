FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY infra/worker/package.json infra/worker/package-lock.json ./
COPY prisma.config.mjs ./
COPY prisma ./prisma
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/pjokvid
RUN npm ci --ignore-scripts && npx prisma generate

FROM build AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/generated ./generated
COPY infra/worker/package.json ./package.json
COPY worker ./worker
COPY lib/video/finalize.js lib/video/constants.js ./lib/video/
COPY infra/minio/init-minio.mjs ./infra/minio/init-minio.mjs
CMD ["node", "worker/video-processor.mjs"]
