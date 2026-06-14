# ChapMee — Production environment guide

VPS Vietnix · Docker Compose · domains `chapmee.com` and `media.chapmee.com`.

## 1. Files and placement

| File | Role |
|------|------|
| **`.env.production.example`** | Committed template — placeholders only, safe to share. |
| **`.env.production`** | Real secrets on the VPS — **never commit**. |

**Recommended path on VPS:**

```text
/opt/chapmee/.env.production
```

Wire this file in `docker-compose.production.yml`, for example:

```yaml
env_file:
  - .env.production
```

Or absolute path: `/opt/chapmee/.env.production` when compose runs from another cwd.

Alternative (same machine): `/opt/chapmee/app/.env.production` if compose runs from the app directory — pick one path and keep backups out of git.

**Do not** copy `.env.local` to production. Generate new secrets for every `CHANGE_ME_*` value.

## 2. Bootstrap

```bash
cp .env.production.example /opt/chapmee/.env.production
chmod 600 /opt/chapmee/.env.production
# edit — replace every CHANGE_ME_* value
```

Validate before `docker compose up`:

```bash
npm run env:validate -- --file /opt/chapmee/.env.production --production
# or from repo clone:
npm run env:validate -- --file .env.production.example
```

Placeholders in the **example** file produce `CHANGE_ME` warnings — expected.

## 3. Secret generation

```bash
# BETTER_AUTH_SECRET, POSTGREST_JWT_SECRET, CRON_SECRET
openssl rand -base64 48

# ENCRYPTION_KEY
openssl rand -base64 32

# POSTGRES_PASSWORD, MinIO password — store in a password manager
openssl rand -base64 32
```

| Variable | Notes |
|----------|--------|
| `BETTER_AUTH_SECRET` | Better Auth session signing |
| `POSTGREST_JWT_SECRET` | **Must equal** `PGRST_JWT_SECRET` in the `postgrest` container |
| `CRON_SECRET` | Required for `GET/POST /api/cron/*` |
| `ENCRYPTION_KEY` | Required before storing encrypted payment/provider secrets |
| `POSTGRES_PASSWORD` | Must match password embedded in `DATABASE_URL` |
| `S3_SECRET_ACCESS_KEY` | MinIO application user (see MinIO init in compose) |

## 4. Local vs production

| Concern | Local (`.env.local`) | Production |
|--------|----------------------|------------|
| App | `http://localhost:3000` | `https://chapmee.com` |
| Database | `localhost:5432` / `chapmee_local` | `postgres:5432` / `chapmee` |
| PostgREST (server) | `http://127.0.0.1:54321` | `http://postgrest:3000` |
| PostgREST (browser) | direct port | `https://chapmee.com/api/postgrest` (Caddy proxy) |
| Redis | `redis://127.0.0.1:6379` | `redis://redis:6379` |
| S3 upload | `http://localhost:9000` | `https://s3.vn-hcm-1.vietnix.cloud` |
| S3 media public | `http://localhost:9000/chapmee-local-media` | `https://media.chapmee.com` (custom domain, no bucket path) |
| S3 media bucket | `chapmee-local-media` | `chapmee-media` (public read) |
| S3 text bucket | `chapmee-local-text` | `chapmee-text` (private) |

**Production values must not use `localhost` or `127.0.0.1`** for app, database, Redis, PostgREST, or S3 — except **SMTP** to Postfix on the VPS host via `host.docker.internal` (see `docs/EMAIL_PRODUCTION_SETUP.md`).

### Transactional email (production)

| Variable | Value |
|----------|--------|
| `EMAIL_MODE` | `smtp` |
| `SMTP_HOST` | `host.docker.internal` (requires `extra_hosts` on `web` in compose) |
| `SMTP_PORT` | `25` |
| `SMTP_SECURE` | `false` |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | `false` (relay to local Postfix) |
| `MAIL_FROM` | `ChapMee <no-reply@chapmee.com>` |

## 5. `NEXT_PUBLIC_*` (visible in the browser)

Next.js embeds `NEXT_PUBLIC_*` in the client bundle.

**Safe to expose:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL`, `NEXT_PUBLIC_POSTGREST_URL`, Turnstile site key.

**Never use `NEXT_PUBLIC_` for:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `S3_SECRET_ACCESS_KEY`, `POSTGREST_JWT_SECRET`, `CRON_SECRET`, `ENCRYPTION_KEY`, `POSTGRES_PASSWORD`.

## 6. S3 / Vietnix Object Storage / media domain

| Variable | Meaning |
|----------|---------|
| `S3_ENDPOINT=https://s3.vn-hcm-1.vietnix.cloud` | **S3-compatible** endpoint (reachable from app container with credentials). |
| `S3_MEDIA_BUCKET=chapmee-media` | Image bucket — public read via custom domain. |
| `S3_TEXT_BUCKET=chapmee-text` | Text bucket — private, server GET only. |
| `S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com` | **Public** base URL (no bucket in path) for browser/CDN display links. |
| `NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL` | Same public base for **client** preview. |

`media.chapmee.com` is a custom domain (CNAME/CDN) pointing to the `chapmee-media` bucket root. Caddy on `chapmee.com` does **NOT** proxy to S3 (MinIO service has been removed).

### Database media rules

- Store **`media_asset_id`** (FK to `storage_assets`) and/or **`object_key`** — not full CDN URLs.
- `media_assets` is a **view** over `storage_assets`.
- Chapter **text** uses S3 keys on `episodes` (`story-content/…`), not the media registry.
- Reels text, community posts, comments also use S3 keys (`reels-content/…`, `community-content/…`, `comments-content/…`).
- Do not persist `http://localhost:9000`, `127.0.0.1`, `/public/uploads`, or Windows paths in DB/content JSON.

## 7. PostgREST (still required)

Audit confirms PostgREST is **active** — not optional for current releases.

| Variable | Role |
|----------|------|
| `POSTGREST_URL` | Server-only: `http://postgrest:3000` |
| `NEXT_PUBLIC_POSTGREST_URL` | Browser: `https://chapmee.com/api/postgrest` |
| `POSTGREST_JWT_SECRET` | JWT for RLS; must match `PGRST_JWT_SECRET` in the PostgREST container |

There is no Next.js route at `/api/postgrest`. **Caddy** must proxy that path to PostgREST (see deploy docs).

**Future:** when all reads/writes use Drizzle/API routes, PostgREST vars can be removed — track in `docs/DEPLOY_VIETNIX_AUDIT_REPORT.md`.

## 8. Docker services (env targets)

Production architecture this template assumes:

| Service | Env consumers |
|---------|----------------|
| `app` (web) | Most variables |
| `postgres` | `DATABASE_URL`, `POSTGRES_PASSWORD` |
| `redis` | `REDIS_URL` |
| `postgrest` | `POSTGREST_JWT_SECRET` → `PGRST_JWT_SECRET` |
| `caddy` | TLS + reverse proxy (no secrets in this file) |

> S3 endpoint is **external** (Vietnix), reachable directly from the `web` container with credentials. No S3 service in compose.

## 9. Safety

- **Do not** run `docker compose down -v` — destroys the Postgres volume.
- **Do not** commit `.env.production` or paste secrets into tickets/chat.
- **Do not** reuse local `BETTER_AUTH_SECRET`, `POSTGREST_JWT_SECRET`, or MinIO passwords on VPS.
- Rotate secrets if a file was ever committed by mistake.

## 10. Related docs

- `docs/PRODUCTION_ENV_AUDIT_REPORT.md` — variable inventory from code search
- `docs/DEPLOY_VIETNIX_AUDIT_REPORT.md` — full infra audit
- `DEPLOY_VIETNIX.md` — operator runbook
- `LOCAL_MEDIA_MIGRATION.md` — Vietnix S3-only alternative (different `S3_ENDPOINT`)
