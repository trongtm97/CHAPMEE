# ChapMee production image — Next.js standalone (next.config.ts: output: "standalone").
# Build on local machine or CI only. VPS must pull a pre-built image — never build there.
#
# syntax=docker/dockerfile:1
#
# Local build:
#   docker build -t chapmee-web:latest \
#     --build-arg NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com \
#     --build-arg NEXT_PUBLIC_APP_URL=https://chapmee.com \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://chapmee.com \
#     .

# -----------------------------------------------------------------------------
# base — shared Node runtime on Alpine (libc6-compat for sharp / native modules)
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# -----------------------------------------------------------------------------
# deps — install dependencies only (layer cached until lockfile changes)
# Package manager priority: pnpm-lock.yaml > package-lock.json > yarn.lock
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Manifest + lockfiles only — no application source in this layer
COPY package.json ./
COPY package-lock.json* pnpm-lock.yaml* yarn.lock* pnpm-workspace.yaml* .npmrc* ./

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN --mount=type=cache,id=chapmee-pnpm-store,target=/pnpm/store \
  --mount=type=cache,id=chapmee-npm-cache,target=/root/.npm \
  --mount=type=cache,id=chapmee-yarn-cache,target=/usr/local/share/.cache/yarn \
  if [ -f pnpm-lock.yaml ]; then \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci --no-audit --no-fund; \
  elif [ -f yarn.lock ]; then \
    yarn install --frozen-lockfile; \
  else \
    echo "ERROR: no lockfile found. Commit pnpm-lock.yaml, package-lock.json, or yarn.lock." >&2; \
    exit 1; \
  fi

# -----------------------------------------------------------------------------
# builder — compile Next.js (NODE_OPTIONS heap only for the build RUN, not runtime)
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

ARG NODE_MAX_OLD_SPACE_SIZE=8192

# Reuse installed deps (cached independently from source changes)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY package-lock.json* pnpm-lock.yaml* yarn.lock* pnpm-workspace.yaml* .npmrc* ./

# Config + entrypoints first (small layer), then application source
COPY next.config.ts next-env.d.ts tsconfig.json postcss.config.js tailwind.config.ts eslint.config.mjs proxy.ts ./
COPY scripts/next-build.mjs ./scripts/next-build.mjs
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
COPY src ./src
COPY hooks ./hooks
COPY styles ./styles
COPY types ./types

RUN mkdir -p public

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHAPMEE_SKIP_BUILD_TIME_DATA=true

ARG NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=$NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Heap limit applies only to this RUN — not inherited by runner stage
RUN --mount=type=cache,id=chapmee-next-cache,target=/app/.next/cache \
  NODE_OPTIONS="--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}" \
  NEXT_TELEMETRY_DISABLED=1 \
  sh -ec '\
    if [ -f pnpm-lock.yaml ]; then \
      pnpm build; \
    elif [ -f package-lock.json ]; then \
      npm run build; \
    elif [ -f yarn.lock ]; then \
      yarn build; \
    else \
      npm run build; \
    fi \
  '

RUN test -f .next/standalone/server.js \
  || (echo "ERROR: .next/standalone/server.js missing — check output: standalone in next.config.ts" >&2 && exit 1)

# -----------------------------------------------------------------------------
# runner — minimal runtime (no NODE_OPTIONS, no devDependencies, no source)
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
