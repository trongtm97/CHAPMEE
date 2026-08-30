# Vietnix deploy kit — final validation report

**Date:** 2026-06-03 (Prompt 8 — final kit validation)  
**Scope:** Production deploy artifacts in repo (Prompts 1–8). No VPS deploy executed from CI/agent.

---

## 1. Kit inventory (files created / updated)

### Core runtime

| File | Status | Purpose |
|------|--------|---------|
| `Dockerfile` | Ready | pnpm, Next standalone, `node server.js` |
| `.dockerignore` | Ready | Excludes env, `node_modules`, backups |
| `docker-compose.production.yml` | Ready | web, postgres, redis, minio, postgrest, caddy |
| `Caddyfile.production` | Ready | TLS, app, PostgREST proxy, media |
| `.env.production.example` | Ready | Template (no secrets) |

### Scripts

| File | Status |
|------|--------|
| `scripts/validate-env.ts` | Ready |
| `scripts/init-storage.ts` | Ready |
| `scripts/check-storage.ts` | Ready |
| `scripts/lib/load-env-file.ts` | Ready |
| `scripts/deploy/lib/common.sh` | Ready |
| `scripts/deploy/backup-postgres.sh` | Ready |
| `scripts/deploy/restore-postgres.sh` | Ready (confirmation guard) |
| `scripts/deploy/backup-minio.sh` | Ready |
| `scripts/deploy/backup-all.sh` | Ready |
| `docker-compose.override.example.yml` | Ready |

### API

| File | Status |
|------|--------|
| `app/api/health/route.ts` | Ready — `GET /api/health`, optional `?deep=1` |

### Documentation

| Doc | Status |
|-----|--------|
| `docs/DEPLOY_VIETNIX_AUDIT_REPORT.md` | Prompt 1 |
| `docs/PRODUCTION_ENV_GUIDE.md` | Prompt 2 |
| `docs/PRODUCTION_ENV_AUDIT_REPORT.md` | Prompt 2 |
| `docs/DOCKER_PRODUCTION_GUIDE.md` | Prompt 3 |
| `docs/DOCKER_COMPOSE_PRODUCTION_GUIDE.md` | Prompt 4 |
| `docs/CADDY_PRODUCTION_GUIDE.md` | Prompt 5 |
| `docs/STORAGE_PRODUCTION_GUIDE.md` | Prompt 6 |
| `docs/BACKUP_RESTORE_GUIDE.md` | Prompt 7 |
| `docs/DEPLOY_VIETNIX_PRODUCTION.md` | Prompt 8 — **operator runbook** |
| `docs/PRODUCTION_HEALTHCHECK.md` | Prompt 8 |
| `docs/VIETNIX_DEPLOY_KIT_FINAL_REPORT.md` | This file |

### Legacy / reference

| File | Note |
|------|------|
| `DEPLOY_VIETNIX.md` | Older short VPS notes |
| `docker-compose.yml` | Dev/staging template — use **production** file on VPS |
| `scripts/backup-db.sh` | Superseded by `scripts/deploy/backup-postgres.sh` for compose |

### package.json scripts

`env:validate`, `storage:init`, `storage:check`, `backup:postgres`, `backup:minio`, `backup:all`

---

## 2. Component status

| Area | Status | Notes |
|------|--------|-------|
| **Env** | Ready | `.env.production.example` + `validate-env.ts` |
| **Docker image** | Ready | Dockerfile standalone; **build not run** in validation (see §6) |
| **Compose** | Ready | `docker compose config` exit **0** with example env |
| **Caddy** | Ready | `caddy validate` passed in Prompt 5 |
| **Storage** | Ready | init/check scripts; `minio-init` in compose |
| **Backup** | Ready | postgres + minio + restore guard |
| **Healthcheck** | Ready | `/api/health` + compose `web` healthcheck |
| **PostgREST** | Required | Service + Caddy `/api/postgrest` proxy |

---

## 3. Commands run (validation)

| Command | Result |
|---------|--------|
| `docker compose -f docker-compose.production.yml --env-file .env.production.example config --quiet` | **Pass** (exit 0) |
| `npm run typecheck` | **Pass** (exit 0) |
| `npm run env:validate -- --file .env.production.example` | Pass (Prompt 2; CHANGE_ME warnings expected) |
| `npm run storage:check` | Pass locally when MinIO up (Prompt 6) |
| `pnpm build` / `docker build` | **Not run** (see §6) |
| `docker compose up` | **Not run** (per constraints) |
| `restore-postgres.sh` | **Not run** (destructive) |

---

## 4. Health endpoint

| URL | Behavior |
|-----|----------|
| `GET /api/health` | `{ ok, app, time, checks: { server: "ok" } }` |
| `GET /api/health?deep=1` | Adds `database`, `redis` (`ok` / `skipped` / `error`), 3s DB timeout |

- No secrets or env values in response.
- No S3 probe (avoid slow health).
- Compose `web` healthcheck hits `http://127.0.0.1:3000/api/health`.

---

## 5. What you must fill manually on VPS

| Item | Action |
|------|--------|
| `.env.production` | Copy example → replace all `CHANGE_ME_*` |
| DNS | A records → VPS IP |
| Git remote | Clone URL |
| TLS email | `Caddyfile.production` global `email` |
| Firewall | ufw 22/80/443 |
| Backups | Cron + off-site copy |
| `CHAPMEE_RESTORE_CONFIRM` | Only when restoring DB |

**Never commit:** `.env.production`, backup archives, real passwords.

---

## 6. Build: not run (reason)

| Build | Run? | Reason |
|-------|------|--------|
| `pnpm build` | No | Prompt constraint; typecheck sufficient for health route |
| `docker build` | No | Not required for doc/config validation; run on VPS at `up --build` |

**Recommendation:** first VPS deploy: `docker compose ... up -d --build` and monitor `web` build logs (~5–15 min).

---

## 7. Remaining TODO (post-kit)

| Priority | Item |
|----------|------|
| P0 | First production `up --build` on VPS |
| P0 | Run `db:setup` (or migrate + legacy + shims) on fresh DB |
| P0 | Replace all `CHANGE_ME` in `.env.production` |
| P1 | Configure backup cron + off-site sync (rclone) |
| P1 | Cron HTTP jobs with `CRON_SECRET` |
| P2 | Email SMTP (Postfix on host) if transactional mail needed |
| P2 | SePay / Turnstile when enabling payments / crawl challenge |
| P3 | Migrate off PostgREST to Drizzle/API (long-term) |
| P3 | Add `media.chapmee.com` to `next.config.ts` `images.remotePatterns` if Next Image optimizer needed |

---

## 8. Safety checklist (kit design)

- [x] No `docker compose down -v` in scripts/docs
- [x] No hardcoded secrets in compose/Caddyfile
- [x] DB/Redis/MinIO API not published on host
- [x] MinIO console 9001 not proxied
- [x] Restore requires `RESTORE_CHAPMEE_POSTGRES`
- [x] `.gitignore` covers `.env.production`, `backups/`
- [x] Media: object keys in DB, not hardcoded URLs

---

## 9. Quick start (operator)

1. Read `docs/DEPLOY_VIETNIX_PRODUCTION.md` sections A → J.
2. `docker compose -f docker-compose.production.yml --env-file .env.production up -d --build`
3. Migrations + `npm run storage:check`
4. `docs/PRODUCTION_HEALTHCHECK.md`
5. `./scripts/deploy/backup-all.sh`

Deploy kit is **documentation- and config-complete**; production go-live requires VPS execution by operator.
