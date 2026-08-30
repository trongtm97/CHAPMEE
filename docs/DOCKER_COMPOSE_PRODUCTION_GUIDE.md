# ChapMee — Docker Compose production guide

Stack file: **`docker-compose.production.yml`**  
Env file: **`.env.production`** (copy from `.env.production.example`, never commit)  
Reverse proxy: **`Caddyfile.production`**

**Lưu ý:** Mọi lệnh `docker compose` phải có `--env-file .env.production` (Compose không tự đọc file này). Khuyến nghị:

```bash
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'
```

Chi tiết: `docs/DEPLOY_VIETNIX_PRODUCTION.md`.

---

## 1. Service map

| Service | Image / build | Internal access | Public |
|---------|---------------|-----------------|--------|
| **web** | `Dockerfile` | `web:3000` | via Caddy → `https://chapmee.com` |
| **postgres** | `postgres:16-alpine` | `postgres:5432` | **no** |
| **redis** | `redis:7-alpine` | `redis:6379` | **no** |
| **minio** | `minio/minio` | `minio:9000` (API), `:9001` (console) | **no** — media via Caddy |
| **minio-init** | `minio/mc` (one-shot) | — | **no** |
| **postgrest** | `postgrest/postgrest:v12.2.8` | `postgrest:3000` | **no** — `/api/postgrest` via Caddy |
| **caddy** | `caddy:2-alpine` | `Caddyfile.production` | **80, 443** only |

Network: **`chapmee_net`** (bridge). No service except Caddy publishes host ports.

### Domains (Caddy)

| Host | Backend |
|------|---------|
| `chapmee.com` | `web:3000`; `/api/postgrest/*` → `postgrest:3000` (prefix stripped) |
| `www.chapmee.com` | 301 → `https://chapmee.com` |
| `media.chapmee.com` | `minio:9000` (public read bucket `chapmee-media`) |

---

## 2. Prerequisites

1. DNS A/AAAA: `chapmee.com`, `www.chapmee.com`, `media.chapmee.com` → VPS IP.
2. `.env.production` on the server (see `docs/PRODUCTION_ENV_GUIDE.md`).
3. Validate env:

```bash
npm run env:validate -- --file .env.production --production
```

Required compose variables (also in example):

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DATABASE_URL` (same password/host/db)
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` (align with `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` for single-user setup)
- `POSTGREST_JWT_SECRET` (same value in app + PostgREST container)

---

## 3. Start

From repo root (e.g. `/opt/chapmee/app`):

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

First boot runs **minio-init** once to create `S3_BUCKET` and set anonymous download.

Check:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production ps
docker compose -f docker-compose.production.yml --env-file .env.production logs -f caddy web
```

---

## 4. Stop safely

```bash
# Stop containers — volumes KEPT
docker compose -f docker-compose.production.yml --env-file .env.production stop

# Stop and remove containers — volumes STILL KEPT
docker compose -f docker-compose.production.yml --env-file .env.production down
```

### Never do this on production

```bash
docker compose -f docker-compose.production.yml --env-file .env.production down -v
```

`-v` **deletes** named volumes: `postgres_data`, `minio_data`, `redis_data`, `caddy_data` — full data loss.

---

## 5. Logs

```bash
# All services
docker compose -f docker-compose.production.yml --env-file .env.production logs -f

# Single service
docker compose -f docker-compose.production.yml --env-file .env.production logs -f web
docker compose -f docker-compose.production.yml --env-file .env.production logs -f postgres
docker compose -f docker-compose.production.yml --env-file .env.production logs -f caddy
docker compose -f docker-compose.production.yml --env-file .env.production logs -f postgrest
```

---

## 6. Restart web only

After code/env change (no DB wipe):

```bash
docker compose -f docker-compose.production.yml --env-file .env.production up -d --build web
# or
docker compose -f docker-compose.production.yml --env-file .env.production restart web
```

Caddy/Postgres/MinIO keep running.

---

## 7. Database migrations

After Postgres is healthy:

```bash
docker compose -f docker-compose.production.yml --env-file .env.production exec web node scripts/db-migrate-foundation.mjs
docker compose -f docker-compose.production.yml --env-file .env.production exec web node scripts/db-apply-legacy-migrations.mjs
docker compose -f docker-compose.production.yml --env-file .env.production exec web node scripts/db-apply-shims.mjs
```

`DATABASE_URL` in `.env.production` must use host **`postgres`**, not `localhost`.

---

## 8. Volumes

| Volume | Data |
|--------|------|
| `postgres_data` | PostgreSQL |
| `redis_data` | Redis RDB |
| `minio_data` | Media objects |
| `caddy_data` | TLS certificates |
| `caddy_config` | Caddy config state |

Backup Postgres separately (`scripts/backup-db.sh` in a later prompt).

---

## 9. PostgREST (required)

Audit confirms the app still uses PostgREST for most reads/writes. This compose includes **postgrest** internal-only.

- App server: `POSTGREST_URL=http://postgrest:3000`
- Browser: `NEXT_PUBLIC_POSTGREST_URL=https://chapmee.com/api/postgrest`
- JWT: `POSTGREST_JWT_SECRET` → `PGRST_JWT_SECRET` in compose (no hardcoded secret in YAML)

---

## 10. Optional override (debug)

Copy `docker-compose.override.example.yml` → `docker-compose.override.yml` (gitignored) to bind `127.0.0.1:3000` for local smoke tests **without** exposing DB/Redis/MinIO.

---

## 11. Validate compose file

```bash
docker compose -f docker-compose.production.yml --env-file .env.production.example config
```

Uses example env (placeholders) — confirms YAML syntax and interpolation only.

---

## 12. Related docs

- `docs/DOCKER_PRODUCTION_GUIDE.md` — Dockerfile / standalone image
- `docs/PRODUCTION_ENV_GUIDE.md` — env variables
- `docs/DEPLOY_VIETNIX_AUDIT_REPORT.md` — full infra audit
