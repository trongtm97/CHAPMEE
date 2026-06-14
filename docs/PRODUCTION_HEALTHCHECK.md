# ChapMee — Production healthcheck

Run after deploy or incident. Assumes stack is up on Vietnix VPS.

**Mọi lệnh compose** cần `--env-file .env.production` (xem `docs/DEPLOY_VIETNIX_PRODUCTION.md`). Ví dụ:

```bash
cd /opt/chapmee/app
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'
```

Dưới đây dùng `dcp` — thay bằng prefix đầy đủ nếu không dùng alias.

---

## 1. Container status

```bash
cd /opt/chapmee/app
dcp ps
```

Expect **running** (healthy for `web` after ~90s start period):

| Service | Notes |
|---------|--------|
| `caddy` | Ports 80/443 |
| `web` | healthy if `/api/health` OK |
| `postgres` | healthy |
| `redis` | running |
| `minio` | running |
| `postgrest` | running |

---

## 2. Logs (errors)

```bash
dcp logs web --tail 80
dcp logs postgres --tail 40
dcp logs minio --tail 40
dcp logs caddy --tail 40
dcp logs postgrest --tail 40
```

No repeating crash loops; Caddy should show certificate obtain success.

---

## 3. HTTP checks (curl)

```bash
# Shallow health (fast — no DB/Redis)
curl -s https://chapmee.com/api/health | jq .

# Deep health (DB + Redis probes, 3s timeout each)
curl -s 'https://chapmee.com/api/health?deep=1' | jq .

# Home
curl -sI https://chapmee.com | head -8

# www redirect
curl -sI https://www.chapmee.com | grep -i location

# PostgREST proxy
curl -sI https://chapmee.com/api/postgrest/ | head -5
```

Expected shallow response:

```json
{
  "ok": true,
  "app": "ChapMee",
  "time": "2026-...",
  "checks": { "server": "ok" }
}
```

---

## 4. Database

```bash
dcp exec postgres pg_isready -U chapmee -d chapmee

dcp exec web node scripts/db-migrate-foundation.mjs --status
```

Browser: login / register (Better Auth + Postgres).

---

## 5. Redis (optional cache)

Deep health shows `checks.redis: "ok"` or `"skipped"` if `REDIS_URL` unset.

```bash
dcp exec redis redis-cli ping
# PONG
```

---

## 6. Storage (internal + public)

```bash
cd /opt/chapmee/app
npm run storage:check -- --file .env.production
```

Public read (after test object exists):

```bash
curl -sI "https://media.chapmee.com/health/chapmee-storage-test.txt"
# HTTP/2 200
```

Cleanup test object:

```bash
npm run storage:check -- --file .env.production --cleanup
```

---

## 7. SEO / canonical (no localhost)

```bash
curl -s https://chapmee.com | grep -i 'canonical\|localhost\|127.0.0.1' | head -5
curl -sI https://chapmee.com/robots.txt | head -5
curl -sI https://chapmee.com/sitemap.xml | head -5
```

Canonical should use `https://chapmee.com`. No `localhost` in HTML meta.

Admin: SEO panel — site URL matches production.

---

## 8. Email (transactional)

```bash
./scripts/deploy/verify-mail.sh
```

Expect **SMTP connect: pass** from `web` container.

Optional send test (user must exist in DB):

```bash
EMAIL_TEST_TO=you@gmail.com ./scripts/deploy/verify-mail.sh --send
```

SQL:

```bash
dcp exec postgres psql -U chapmee -d chapmee -c \
  "SELECT type, to_email, status, error_message, sent_at FROM email_jobs ORDER BY created_at DESC LIMIT 5;"
```

Host mail log (bounced / DKIM):

```bash
sudo tail -20 /var/log/mail.log
```

Guide: `docs/EMAIL_PRODUCTION_SETUP.md`.

---

## 9. Smoke tests (manual)

| Test | Pass criteria |
|------|----------------|
| Forgot password | Email arrives (check spam); `email_jobs.status = sent` |
| Mobile nav | Home, discover, rankings open on phone width |
| Upload image | Studio story cover presign → displays via `media.chapmee.com` |
| Read chapter | Episode loads; paid gate if applicable |
| Messages / coin | PostgREST browser calls succeed (no CORS 502 on `/api/postgrest`) |
| Reels / discover | Feeds load without PostgREST timeout |

---

## 10. Backup verification

```bash
ls -lh /opt/backups/chapmee/postgres/*.sql.gz | tail -3
ls -ld /opt/backups/chapmee/minio/chapmee-media-* | tail -3
```

---

## 11. Failure quick map

| Symptom | Check |
|---------|--------|
| 502 on chapmee.com | `dcp logs web --tail 80`, `dcp ps` |
| `MINIO_ROOT_USER` / biến thiếu khi `ps`/`logs` | Thiếu `--env-file .env.production` — dùng `dcp` |
| Health 503 deep | `DATABASE_URL`, postgres logs |
| Media 403 on objects | `mc anonymous get local/chapmee-media` |
| PostgREST fail | `postgrest` logs, JWT secret match |
| TLS fail | DNS, `ufw`, caddy logs ACME |
| Email timeout from app | `sudo ./scripts/deploy/setup-postfix-mail.sh`, UFW rule for Docker subnet |
| Gmail 550 unauthenticated | SPF `ip4:VPS_IP` + DKIM `default._domainkey` |

---

## 12. Related

- `docs/DEPLOY_VIETNIX_PRODUCTION.md` — full deploy
- `scripts/deploy/backup-all.sh` — before risky changes
