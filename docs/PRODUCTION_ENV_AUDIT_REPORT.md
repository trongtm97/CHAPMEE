# Production environment audit report

**Generated:** 2026-06-03 (Prompt 2 — env template, guide, validator)  
No real secrets. Source: `process.env` / `readEnv()` grep across `*.{ts,tsx,mjs}` and committed templates.

## 1. Variables found in application code

### Required for production runtime (server)

| Variable | Primary usage |
|----------|----------------|
| `DATABASE_URL` | `lib/db/pool.ts`, migration scripts |
| `BETTER_AUTH_SECRET` | `lib/auth/auth.ts` |
| `BETTER_AUTH_URL` | `lib/auth/auth.ts` (fallback: `APP_URL`, `NEXT_PUBLIC_APP_URL`) |
| `APP_URL` | `lib/auth/auth.ts` |
| `POSTGREST_URL` | `lib/db/postgrest/*`, `lib/data/env.ts` |
| `POSTGREST_JWT_SECRET` | `lib/auth/postgrest-jwt.ts` (fallback: `PGRST_JWT_SECRET`) |
| `S3_ENDPOINT` | `lib/storage/s3.ts` (required) |
| `S3_ACCESS_KEY_ID` | `lib/storage/s3.ts` (required) |
| `S3_SECRET_ACCESS_KEY` | `lib/storage/s3.ts` (required) |
| `S3_BUCKET` | `lib/storage/s3.ts` (required) |
| `S3_PUBLIC_BASE_URL` | `lib/storage/s3.ts`, `lib/media/media-url.ts`, `lib/media/media-resolver.ts` |
| `S3_REGION` | `lib/storage/s3.ts` (default `us-east-1`) |
| `S3_FORCE_PATH_STYLE` | `lib/storage/s3.ts` (default true unless `"false"`) |
| `REDIS_URL` | `lib/cache/cache.ts`, `lib/cache/chapter-content-cache.ts` |
| `ENCRYPTION_KEY` | `lib/security/encryption.ts` |
| `CRON_SECRET` | `app/api/cron/*` |

### Required public (`NEXT_PUBLIC_*`)

| Variable | Primary usage |
|----------|----------------|
| `NEXT_PUBLIC_APP_URL` | `lib/auth/browser-auth.ts` |
| `NEXT_PUBLIC_SITE_URL` | `lib/site/site-url.ts`, `lib/seo/metadata.ts` |
| `NEXT_PUBLIC_APP_NAME` | `lib/brand/constants.ts` |
| `NEXT_PUBLIC_POSTGREST_URL` | `lib/db/browser-client.ts` |
| `NEXT_PUBLIC_S3_PUBLIC_BASE_URL` | `lib/media/public-media-client.ts` |

### Compose / ops (not read by Next.js directly)

| Variable | Usage |
|----------|--------|
| `POSTGRES_PASSWORD` | `docker-compose.yml` — `postgres`, `postgrest` `PGRST_DB_URI` |

### Optional / feature flags

| Variable | Usage |
|----------|--------|
| `CHAPTER_CONTENT_CACHE_TTL_MS` | `lib/cache/cache.ts` (default 900000) |
| `EMAIL_MODE`, `SMTP_*`, `MAIL_*` | `lib/email/email-config.ts` |
| `CHAPMEE_POSTGREST_TIMEOUT_MS` | `lib/data/client-options.ts` |
| `CHAPMEE_SKIP_REMOTE_CONFIG` | `lib/config/product-config.ts` |
| `CHAPMEE_DISABLE_SNIPPETS` | `lib/snippets/settings.ts` |
| `CHAPMEE_POSTGREST_URL` | Alias for `POSTGREST_URL` |
| `POSTGREST_SERVICE_ROLE` / `PGREST_SERVICE_ROLE` | Static JWT override |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Legacy fallback in `public-media-client.ts` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Crawl challenge |
| `SEPAY_*` | `lib/payments/sepay-config.ts` |
| `CHAPMEE_FACEBOOK_URL`, `CHAPMEE_TIKTOK_URL`, `CHAPMEE_YOUTUBE_URL` | `lib/chapmee-social-links.ts` |
| `PG_POOL_MAX`, `PG_CONNECT_TIMEOUT_MS` | `lib/db/pool.ts` |

### Dev / test only (empty in production)

| Variable | Usage |
|----------|--------|
| `RBAC_TEST_PASSWORD` | `scripts/rbac-*.ts`, `scripts/db-seed-local.ts` |
| `SEED_DEMO_PASSWORD` | `scripts/db-seed-local.ts` |
| `LEGACY_FROM` | `scripts/db-apply-legacy-migrations.mjs` |

### Legacy env names (aliases — do not use in new deploys)

| Legacy | Preferred |
|--------|-----------|
| `CHAPCHAP_POSTGREST_TIMEOUT_MS` | `CHAPMEE_POSTGREST_TIMEOUT_MS` |
| `CHAPCHAP_*` via `lib/env/legacy-env.ts` | `CHAPMEE_*` |
| `PGRST_JWT_SECRET` | `POSTGREST_JWT_SECRET` |
| `PGREST_SERVICE_ROLE` | `POSTGREST_SERVICE_ROLE` |
| `NEXT_PUBLIC_SUPABASE_*` | **Removed** — unused |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | `NEXT_PUBLIC_S3_PUBLIC_BASE_URL` |

### PostgREST status

**Still required** for production (legacy compatibility layer). Variables are **not** optional in `.env.production.example` until code migrates off `lib/data/server.ts` / `lib/db/browser-client.ts`.

## 2. Variables in `.env.production.example`

| Section | Keys |
|---------|------|
| App URLs | `NEXT_PUBLIC_APP_URL`, `APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_NAME` |
| Database | `DATABASE_URL`, `POSTGRES_PASSWORD` |
| PostgREST | `POSTGREST_URL`, `NEXT_PUBLIC_POSTGREST_URL`, `POSTGREST_JWT_SECRET` |
| Auth | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |
| Redis | `REDIS_URL`, `CHAPTER_CONTENT_CACHE_TTL_MS` |
| S3 / MinIO | `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_BASE_URL`, `NEXT_PUBLIC_S3_PUBLIC_BASE_URL` |
| Encryption | `ENCRYPTION_KEY` |
| Cron | `CRON_SECRET` |
| Email | Commented optional (`SMTP_HOST=127.0.0.1` allowed on VPS) |
| Optional | Turnstile, SePay (commented) |
| Dev helpers | `RBAC_TEST_PASSWORD`, `SEED_DEMO_PASSWORD`, `CHAPMEE_SKIP_REMOTE_CONFIG`, `CHAPMEE_POSTGREST_TIMEOUT_MS` |

**Not in user brief but required by code:** `NEXT_PUBLIC_S3_PUBLIC_BASE_URL`, `POSTGRES_PASSWORD`, `CRON_SECRET`, `CHAPTER_CONTENT_CACHE_TTL_MS`.

## 3. `.env.local` vs production example

| In `.env.local` (keys) | In production example |
|------------------------|------------------------|
| Full `S3_*` set | Same names, production hosts |
| No `NEXT_PUBLIC_S3_PUBLIC_BASE_URL` | **Added** (code uses it) |
| No `POSTGRES_PASSWORD`, `CRON_SECRET` | **Added** (compose + cron) |
| `ENCRYPTION_KEY` present | Placeholder `CHANGE_ME` |

## 4. `.gitignore` status

| Pattern | Status |
|---------|--------|
| `.env` | Ignored |
| `.env.local` | Ignored |
| `.env.production` | Ignored |
| `.env*.local` | Ignored |
| `!.env.production.example` | **Committed** (negation rule) |

## 5. Validation script status

| Item | Value |
|------|--------|
| File | `scripts/validate-env.ts` |
| npm script | `env:validate` in `package.json` |
| CLI | `--file <path>`, `--production` |
| Behavior | Required keys; `CHANGE_ME` warn; `NEXT_PUBLIC_*` secret-name error; S3 endpoint/public URL checks; PostgREST public URL check; no secret values printed |
| SMTP loopback | Allowlisted for `SMTP_*` only in `--production` |

## 6. Validator run (`.env.production.example`)

Command: `npm run env:validate -- --file .env.production.example`

Expected: **0 errors**, warnings for each `CHANGE_ME_*` placeholder (and optional `CHAPTER_CONTENT_CACHE_TTL_MS` if checked — set in example so no warn).

## 7. Warnings / follow-up

1. **PostgREST** — Caddy must proxy `https://chapmee.com/api/postgrest` (no Next.js route).
2. **`POSTGREST_JWT_SECRET`** — must match `PGRST_JWT_SECRET` in PostgREST container (compose fix in next prompt).
3. **Vietnix S3-only** — if not using MinIO on VPS, change `S3_ENDPOINT` and public base per `LOCAL_MEDIA_MIGRATION.md`; validator warnings will differ from MinIO template.
4. **Do not** `docker compose down -v` on production.

## 8. Files changed (Prompt 2)

- `.env.production.example` — reordered, PostgREST JWT at end, email optional commented
- `docs/PRODUCTION_ENV_GUIDE.md` — VPS path `/opt/chapmee/.env.production`, safety, media rules
- `docs/PRODUCTION_ENV_AUDIT_REPORT.md` — this report
- `scripts/validate-env.ts` — stricter S3 public URL, `NEXT_PUBLIC_APP_NAME`, SMTP allowlist
- `.gitignore` — unchanged (already correct)
