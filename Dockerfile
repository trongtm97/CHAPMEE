# ChapMee production image — Next.js standalone (see next.config.ts output: "standalone").
# Package manager: pnpm (pnpm-lock.yaml). Runtime env from compose env_file — never COPY .env.production.
#
# Build (when ready): docker build -t chapmee-app:latest .
# Run: see docs/DOCKER_PRODUCTION_GUIDE.md

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHAPMEE_SKIP_BUILD_TIME_DATA=true
# Next.js webpack production build needs >2GB heap (default ~2GB OOMs on large apps).
# Override at build: --build-arg NODE_MAX_OLD_SPACE_SIZE=6144 (8GB VPS) or 3072 if tight RAM + swap.
ARG NODE_MAX_OLD_SPACE_SIZE=4096
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MAX_OLD_SPACE_SIZE}
# Non-secret NEXT_PUBLIC_* only — baked into client bundle at build time.
ARG NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=$NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S chapmee && adduser -S chapmee -G chapmee

# Standalone server (node server.js) — traced deps include pg, better-auth, drizzle-orm, aws-sdk per next.config serverExternalPackages
COPY --from=builder --chown=chapmee:chapmee /app/public ./public
COPY --from=builder --chown=chapmee:chapmee /app/.next/standalone ./
COPY --from=builder --chown=chapmee:chapmee /app/.next/static ./.next/static

# Optional: run DB migrations via `docker compose exec app node scripts/db-migrate-foundation.mjs` (env from compose at runtime)
COPY --from=builder --chown=chapmee:chapmee /app/drizzle ./drizzle
COPY --from=builder --chown=chapmee:chapmee /app/db ./db
COPY --from=builder --chown=chapmee:chapmee /app/scripts/lib ./scripts/lib
COPY --from=builder --chown=chapmee:chapmee /app/scripts/db-migrate-foundation.mjs ./scripts/db-migrate-foundation.mjs
COPY --from=builder --chown=chapmee:chapmee /app/scripts/db-apply-legacy-migrations.mjs ./scripts/db-apply-legacy-migrations.mjs
COPY --from=builder --chown=chapmee:chapmee /app/scripts/db-apply-legacy-only.mjs ./scripts/db-apply-legacy-only.mjs
COPY --from=builder --chown=chapmee:chapmee /app/scripts/db-apply-shims.mjs ./scripts/db-apply-shims.mjs

USER chapmee
EXPOSE 3000

# Health: no GET /api/health yet — add Docker HEALTHCHECK after that route exists (separate prompt).
CMD ["node", "server.js"]
