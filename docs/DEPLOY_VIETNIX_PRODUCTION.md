# ChapMee — Vietnix VPS production deploy (step-by-step)

Complete operator runbook for Docker Compose on Ubuntu 24.04.  
Kit files live in the git repo; secrets stay on the server only.

**Related:** `docs/PRODUCTION_ENV_GUIDE.md`, `docs/DOCKER_COMPOSE_PRODUCTION_GUIDE.md`, `docs/CADDY_PRODUCTION_GUIDE.md`, `docs/STORAGE_PRODUCTION_GUIDE.md`, `docs/BACKUP_RESTORE_GUIDE.md`, `docs/PRODUCTION_HEALTHCHECK.md`.

---

## Overview

| Domain | Service |
|--------|---------|
| `https://chapmee.com` | Next.js `web` (via Caddy) |
| `https://www.chapmee.com` | Redirect → `chapmee.com` |
| `https://media.chapmee.com` | MinIO public read (`chapmee-media` bucket) |

**Published ports on VPS:** `80`, `443` (Caddy only).  
**Never publish:** `3000`, `5432`, `6379`, `9000`, `9001`.

### Quan trọng: mọi lệnh `docker compose` cần `--env-file`

Compose **không** tự đọc `.env.production`. Nó chỉ đọc file tên `.env` (mặc định).  
File `docker-compose.production.yml` cần biến như `MINIO_ROOT_USER`, `POSTGRES_PASSWORD` để **thay vào YAML** — nếu thiếu `--env-file` sẽ lỗi ngay cả khi chạy `logs` hoặc `ps`.

Trên VPS, từ `/opt/chapmee/app`, dùng **một trong hai cách** sau cho **tất cả** lệnh compose trong guide này:

```bash
cd /opt/chapmee/app

# Cách 1 — prefix đầy đủ (copy từng lệnh)
docker compose -f docker-compose.production.yml --env-file .env.production <lệnh>

# Cách 2 — alias (khuyến nghị, gõ ngắn hơn)
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'
# Ví dụ: dcp up -d --build   |   dcp logs -f caddy web   |   dcp ps
```

Nếu `.env.production` nằm ở `/opt/chapmee/.env.production`:

```bash
ln -sf /opt/chapmee/.env.production /opt/chapmee/app/.env.production
# hoặc: alias dcp='docker compose -f docker-compose.production.yml --env-file /opt/chapmee/.env.production'
```

Các khối lệnh dưới đây dùng **`dcp`** — nếu không tạo alias, thay `dcp` bằng  
`docker compose -f docker-compose.production.yml --env-file .env.production`.

---

## A. VPS preparation

SSH as root or sudo user on a fresh **Ubuntu 24.04** VPS (≥ 2 vCPU, **8 GB RAM** recommended for `dcp up --build`; **4 GB** works only with **swap** — see build OOM below).

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw unzip htop nano ca-certificates gnupg
```

### Deploy user

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG sudo deploy
```

Copy your SSH key, then use `deploy` for daily ops.

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
```

Log out and back in as `deploy`, then:

```bash
docker --version
docker compose version
```

---

## B. DNS

At your DNS provider (point to **VPS public IP**):

| Record | Type | Value |
|--------|------|--------|
| `@` (chapmee.com) | A | VPS IP |
| `www` | A | VPS IP |
| `media` | A | VPS IP |

Wait for propagation (`dig chapmee.com +short`).

---

## C. Directory layout

```text
/opt/chapmee/
  app/                    # git clone (compose + Dockerfile + Caddyfile.production)
  .env.production         # real secrets (chmod 600) — NOT in git
/opt/backups/chapmee/     # backup-postgres.sh / backup-minio.sh output
  postgres/
  minio/
  manifests/
```

Create dirs:

```bash
sudo mkdir -p /opt/chapmee/app /opt/backups/chapmee
sudo chown -R deploy:deploy /opt/chapmee /opt/backups/chapmee
```

Inside `/opt/chapmee/app` you will have:

- `docker-compose.production.yml`
- `Caddyfile.production`
- `.env.production.example` (template only in git)

---

## D. Clone code

```bash
cd /opt/chapmee/app
git clone <YOUR_REPO_URL> .
# or: git pull on subsequent deploys
```

---

## E. Create `.env.production`

```bash
cp .env.production.example /opt/chapmee/.env.production
# Or keep in app dir:
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Replace every `CHANGE_ME_*` value. Generate secrets:

```bash
openssl rand -base64 48   # BETTER_AUTH_SECRET, POSTGREST_JWT_SECRET, CRON_SECRET
openssl rand -base64 32   # ENCRYPTION_KEY, POSTGRES_PASSWORD, MINIO_ROOT_PASSWORD
```

**Bắt buộc có trong file** (compose sẽ báo lỗi nếu thiếu):

| Variable | Notes |
|----------|--------|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Khớp `DATABASE_URL` |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | MinIO container |
| `S3_BUCKET` | Thường `chapmee-media` |
| `POSTGREST_JWT_SECRET` | PostgREST JWT |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | App upload (thường = MinIO user) |

**Must align:**

| Variable | Notes |
|----------|--------|
| `POSTGRES_PASSWORD` | Same in `DATABASE_URL` and compose postgres |
| `POSTGREST_JWT_SECRET` | Same as PostgREST `PGRST_JWT_SECRET` in compose |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | Match `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` for single-user setup |
| `S3_MEDIA_PUBLIC_BASE_URL` | `https://media.chapmee.com` |
| `NEXT_PUBLIC_*` | `https://chapmee.com` — no localhost |

Validate:

```bash
npm run env:validate -- --file .env.production --production
```

If env file is at `/opt/chapmee/.env.production`:

```bash
ln -sf /opt/chapmee/.env.production /opt/chapmee/app/.env.production
```

---

## F. Start services

From `/opt/chapmee/app` (tạo alias `dcp` như mục trên):

```bash
cd /opt/chapmee/app
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'

dcp up -d --build
dcp ps
```

### F.1 Build lỗi `JavaScript heap out of memory`

Khi `RUN pnpm build` trong Docker báo **heap out of memory** (~144s, GC ~1.8 GB rồi crash): VPS thiếu RAM cho webpack.

**Khắc phục nhanh:**

```bash
# 1) Thêm swap 4GB (VPS 4GB RAM)
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
free -h

# 2) Build lại chỉ service web (đã có NODE_OPTIONS=4096 trong Dockerfile)
cd /opt/chapmee/app
dcp build --no-cache web
dcp up -d
```

VPS **8 GB RAM**: có thể tăng heap khi build:

```bash
export NODE_MAX_OLD_SPACE_SIZE=6144
dcp build --no-cache web
```

Chi tiết: `docs/DOCKER_PRODUCTION_GUIDE.md` § Build OOM.

Services: `web`, `postgres`, `redis`, `minio`, `minio-init`, `postgrest`, `caddy`.

Watch logs:

```bash
dcp logs -f caddy web
```

---

## G. Database migrations

**Fresh database** (first deploy) — **đúng thứ tự**:

```bash
# 1) Drizzle foundation 0000–0005 (auth, storage shim, PostgREST grants)
dcp exec web node scripts/db-migrate-foundation.mjs

# 2) Legacy ~198 file — tạo stories, profiles, storage_assets, …
dcp exec web node scripts/db-apply-legacy-migrations.mjs

# 3) Drizzle extension 0006+ — alter bảng legacy (cover_media_asset, SEO, …)
dcp exec web node scripts/db-apply-shims.mjs
```

**Không** chạy `0006+` trước legacy — sẽ lỗi `relation "public.stories" does not exist`.

Nếu đã fail ở `0006_stories_cover_media_asset.sql` (0000–0005 đã ok) — **container đang dùng script cũ** nếu vẫn thấy `→ 0006_...` trong “Applying db-compat shims”:

```bash
# Trên PC: upload script mới + db/migrations/legacy/ vào /opt/chapmee/app
cd /opt/chapmee/app
docker cp scripts/db-apply-legacy-only.mjs chapmee-web:/app/scripts/
docker cp scripts/db-apply-shims.mjs chapmee-web:/app/scripts/
docker cp scripts/db-migrate-foundation.mjs chapmee-web:/app/scripts/
docker cp scripts/db-apply-legacy-migrations.mjs chapmee-web:/app/scripts/
docker cp db/migrations chapmee-web:/app/db/

dcp exec web sh -c 'ls /app/db/migrations/legacy/*.sql | wc -l'   # ~198

# Cách A — legacy thuần (không chạy drizzle shim)
dcp exec web node scripts/db-apply-legacy-only.mjs
dcp exec web node scripts/db-apply-shims.mjs

# Cách B — script legacy mới + bỏ qua shim (0001–0005 đã có)
dcp exec web node scripts/db-apply-legacy-migrations.mjs --skip-pre-legacy-shims
dcp exec web node scripts/db-apply-shims.mjs
```

**Không** chạy lại `db-migrate-foundation.mjs` với script cũ (nó vẫn cố 0006).

Equivalent from host — **không cần** `export $(grep ... | xargs)` (dễ lỗi vì `DATABASE_URL` có `@`, email `MAIL_FROM` có khoảng trắng). Dùng `dcp exec web` — compose đã inject `.env.production`:

```bash
dcp exec web npm run db:setup
# hoặc từng bước như trên
```

**Existing DB** (legacy already applied): run only `db:migrate` + `db:shims`; see `LOCAL_SETUP.md`.

Status:

```bash
dcp exec web node scripts/db-migrate-foundation.mjs --status
```

---

## H. Init storage

`minio-init` runs on first `up`. Re-run if needed:

```bash
npm run storage:init -- --file .env.production
```

Or from host with env loaded:

```bash
npx --yes tsx scripts/init-storage.ts --file .env.production
```

---

## I. MinIO public read (download only)

Confirm policy (no public write):

```bash
dcp exec minio sh
mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc anonymous set download local/chapmee-media
mc anonymous get local/chapmee-media
exit
```

---

## J. Test domains

```bash
curl -sI https://chapmee.com | head -5
curl -sI https://chapmee.com/api/health | head -5
curl -sI https://www.chapmee.com | head -5
```

After `npm run storage:check -- --file .env.production`:

```bash
curl -sI "https://media.chapmee.com/health/chapmee-storage-test.txt"
```

Browser: register/login, open story, upload cover in Studio.

Full checklist: `docs/PRODUCTION_HEALTHCHECK.md`.

---

## J.1 Transactional email (Postfix)

App container gửi SMTP tới Postfix trên **host** (không chạy mail trong Docker).

**Một lần trên VPS:**

```bash
cd /opt/chapmee/app
sudo chmod +x scripts/deploy/setup-postfix-mail.sh scripts/deploy/verify-mail.sh
sudo ./scripts/deploy/setup-postfix-mail.sh
```

Thêm DNS SPF (`ip4:<VPS_IP>`) + DKIM theo output script — chi tiết: `docs/EMAIL_PRODUCTION_SETUP.md`.

**`.env.production`** (đã có trong `.env.production.example`):

```env
EMAIL_MODE=smtp
SMTP_HOST=host.docker.internal
SMTP_PORT=25
SMTP_SECURE=false
SMTP_TLS_REJECT_UNAUTHORIZED=false
MAIL_FROM=ChapMee <no-reply@chapmee.com>
```

Sau `git pull` có `extra_hosts` trong compose:

```bash
dcp up -d web
./scripts/deploy/verify-mail.sh
EMAIL_TEST_TO=you@gmail.com ./scripts/deploy/verify-mail.sh --send
```

Cron worker tuỳ chọn: `GET /api/cron/process-emails` (Bearer `CRON_SECRET`).

---

## K. Backup setup

```bash
chmod +x scripts/deploy/*.sh
CHAPMEE_APP_DIR=/opt/chapmee/app ENV_FILE=/opt/chapmee/.env.production ./scripts/deploy/backup-all.sh
```

Cron (see `docs/BACKUP_RESTORE_GUIDE.md`):

```cron
15 2 * * * cd /opt/chapmee/app && CHAPMEE_APP_DIR=/opt/chapmee/app ENV_FILE=/opt/chapmee/.env.production ./scripts/deploy/backup-postgres.sh >> /var/log/chapmee-backup.log 2>&1
```

---

## L. Deploy updates

```bash
cd /opt/chapmee/app
alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'

./scripts/deploy/backup-all.sh
git pull
dcp up -d --build web
# Migrations if release notes say so:
dcp exec web node scripts/db-migrate-foundation.mjs
dcp logs -f web --tail 100
curl -s https://chapmee.com/api/health
```

---

## M. Emergency rollback (basics)

1. Stop writes: `dcp stop web`
2. Restore DB from latest `.sql.gz` (see `docs/BACKUP_RESTORE_GUIDE.md`) with `RESTORE_CHAPMEE_POSTGRES` confirmation.
3. Restore MinIO mirror from same backup window if media affected.
4. `dcp start web`
5. **Do not** `dcp down -v` hoặc `docker compose down -v`.

Revert code: `git checkout <previous-tag>` + rebuild `web`.

---

## N. Never do

| Action | Why |
|--------|-----|
| `dcp down -v` / `docker compose ... down -v` | Deletes `postgres_data`, `minio_data` |
| Expose `5432`, `6379`, `9000`, `9001` | Data breach / abuse |
| Commit `.env.production` | Secret leak |
| Store `http://localhost:9000` URLs in DB | Broken production media |
| `mc anonymous set public` on media bucket | Anonymous upload |
| Copy `.env.local` to VPS | Wrong secrets / localhost URLs |

---

## Quick reference

Giả sử đã có: `alias dcp='docker compose -f docker-compose.production.yml --env-file .env.production'`

| Task | Command |
|------|---------|
| Up | `dcp up -d --build` |
| Ps | `dcp ps` |
| Logs | `dcp logs -f caddy web` |
| Config test | `dcp config --quiet` |
| Health | `curl -s https://chapmee.com/api/health` |
| Deep health | `curl -s 'https://chapmee.com/api/health?deep=1'` |
| Migrations | `dcp exec web node scripts/db-migrate-foundation.mjs` (+ legacy + shims) |
| Storage test | `npm run storage:check -- --file .env.production` |

---

## Doc index (deploy kit)

| Doc | Topic |
|-----|--------|
| `docs/DEPLOY_VIETNIX_AUDIT_REPORT.md` | Initial audit |
| `docs/PRODUCTION_ENV_GUIDE.md` | Env vars |
| `docs/DOCKER_PRODUCTION_GUIDE.md` | Dockerfile |
| `docs/DOCKER_COMPOSE_PRODUCTION_GUIDE.md` | Compose |
| `docs/CADDY_PRODUCTION_GUIDE.md` | Caddy / TLS |
| `docs/STORAGE_PRODUCTION_GUIDE.md` | MinIO / S3 |
| `docs/BACKUP_RESTORE_GUIDE.md` | Backup / restore |
| `docs/PRODUCTION_HEALTHCHECK.md` | Post-deploy checks |
| `docs/EMAIL_PRODUCTION_SETUP.md` | Postfix / OpenDKIM / DNS |
| `docs/EMAIL_SYSTEM.md` | App email queue & env |
| `docs/VIETNIX_DEPLOY_KIT_FINAL_REPORT.md` | Kit inventory |
