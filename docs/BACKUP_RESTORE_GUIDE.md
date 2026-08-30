# ChapMee — Backup and restore guide

Protect **PostgreSQL** (`postgres_data`) and **MinIO** (`minio_data`). Stories, users, and media depend on both staying consistent.

**Never on production:**

```bash
docker compose down -v   # DELETES volumes — irreversible data loss
```

---

## 1. Layout (VPS)

| Path | Purpose |
|------|---------|
| `/opt/chapmee/app` | Git clone / deploy (`CHAPMEE_APP_DIR`) |
| `/opt/chapmee/.env.production` | Secrets (backup **manually**, encrypted, off-repo) |
| `/opt/backups/chapmee/postgres` | `pg_dump` `.sql.gz` files |
| `/opt/backups/chapmee/minio` | `mc mirror` of bucket `chapmee-media` |
| `/opt/backups/chapmee/manifests` | `backup-all` JSON metadata |

Override with `BACKUP_ROOT`, `BACKUP_DIR`, `RETENTION_DAYS`.

---

## 2. Scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy/backup-postgres.sh` | `pg_dump` → gzip, retention |
| `scripts/deploy/restore-postgres.sh` | **Destructive** — requires `RESTORE_CHAPMEE_POSTGRES` |
| `scripts/deploy/backup-minio.sh` | `mc mirror` (keys unchanged) |
| `scripts/deploy/backup-all.sh` | Postgres + MinIO + manifest |

```bash
cd /opt/chapmee/app
chmod +x scripts/deploy/*.sh scripts/deploy/lib/common.sh

# Or via npm (from repo root):
npm run backup:postgres
npm run backup:minio
npm run backup:all
```

Environment:

```bash
export CHAPMEE_APP_DIR=/opt/chapmee/app
export ENV_FILE=/opt/chapmee/.env.production   # if env lives outside app dir
export BACKUP_ROOT=/opt/backups/chapmee
export RETENTION_DAYS=30
```

Scripts **do not print** `POSTGRES_PASSWORD` or `MINIO_ROOT_PASSWORD`.

---

## 3. Before deploy or migration

```bash
cd /opt/chapmee/app
./scripts/deploy/backup-all.sh
```

Also:

- Note current git commit (in manifest).
- Export encrypted copy of `.env.production` separately.
- Optionally stop `web` during DB restore only (not required for backup).

---

## 4. Cron examples

```cron
# Daily PostgreSQL — 02:15
15 2 * * * cd /opt/chapmee/app && CHAPMEE_APP_DIR=/opt/chapmee/app ENV_FILE=/opt/chapmee/.env.production RETENTION_DAYS=30 ./scripts/deploy/backup-postgres.sh >> /var/log/chapmee-backup.log 2>&1

# Weekly MinIO mirror — Sunday 03:30 (adjust if bucket is large)
30 3 * * 0 cd /opt/chapmee/app && CHAPMEE_APP_DIR=/opt/chapmee/app ENV_FILE=/opt/chapmee/.env.production RETENTION_DAYS=90 ./scripts/deploy/backup-minio.sh >> /var/log/chapmee-backup.log 2>&1

# Optional: daily backup-all before low-traffic window
# 10 2 * * * cd /opt/chapmee/app && ./scripts/deploy/backup-all.sh >> /var/log/chapmee-backup.log 2>&1
```

Copy archives off-VPS (rclone, Vietnix S3 cold storage, etc.) — not included in scripts yet.

---

## 5. PostgreSQL backup

```bash
./scripts/deploy/backup-postgres.sh
```

- Uses: `docker compose -f docker-compose.production.yml exec -T postgres pg_dump`
- Output: `chapmee-postgres-YYYYMMDD-HHMMSS.sql.gz`
- Verifies non-empty file
- Prunes files older than `RETENTION_DAYS` (default **14**)

Verify:

```bash
ls -lh /opt/backups/chapmee/postgres/
gunzip -c /opt/backups/chapmee/postgres/chapmee-postgres-*.sql.gz | head -20
```

---

## 6. PostgreSQL restore (destructive)

**Guard:** must set or type confirmation phrase `RESTORE_CHAPMEE_POSTGRES`.

```bash
# Optional: stop app to avoid writes
docker compose -f docker-compose.production.yml stop web

CHAPMEE_RESTORE_CONFIRM=RESTORE_CHAPMEE_POSTGRES \
  ./scripts/deploy/restore-postgres.sh /opt/backups/chapmee/postgres/chapmee-postgres-YYYYMMDD-HHMMSS.sql.gz
```

- Default `PRE_RESTORE_BACKUP=1` runs `backup-postgres.sh` into `postgres/pre-restore/` first.
- Uses `psql` on plain SQL dumps (not `pg_restore --clean`).
- **Risk:** restoring older dump onto newer schema may error — review SQL or restore to empty DB.
- **Never** `docker compose down -v`.

After restore:

```bash
docker compose -f docker-compose.production.yml start web
# Re-run migrations only if docs say so for that release
npm run storage:check -- --file /opt/chapmee/.env.production
```

---

## 7. MinIO backup

```bash
./scripts/deploy/backup-minio.sh
```

- Runs `minio/mc` on Docker network `chapmee_chapmee_net`
- `mc mirror local/chapmee-media /backup/chapmee-media` — **no rename** of object keys
- Does **not** delete objects in MinIO
- Retention removes old `chapmee-media-*` directories on disk (default **30** days)

### Manual `mc` (reference)

```bash
docker compose -f docker-compose.production.yml exec minio sh
mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mirror local/chapmee-media /path/on/host/chapmee-media-backup
```

---

## 8. Media consistency rule

| Store | Holds |
|-------|--------|
| PostgreSQL | `storage_assets` / `media_assets` view, `*_media_asset_id`, `object_key` on entities |
| MinIO | Bytes at each **object key** |

Restore **both** from the same backup window when recovering from disaster. After partial restore, run `npm run media:check` and fix orphans per ops docs.

Public URLs are **not** in DB — they are built from `S3_PUBLIC_BASE_URL` + key.

---

## 9. Verify backups

| Check | Command |
|-------|---------|
| Postgres file size | `ls -lh …/postgres/*.sql.gz` |
| Postgres content | `gunzip -c file.sql.gz \| head` |
| MinIO file count | `find …/minio/chapmee-media-* -type f \| wc -l` |
| Live app | `curl -sI https://chapmee.com` |
| Storage test | `npm run storage:check -- --file .env.production` |

---

## 10. What is NOT backed up by these scripts

- **Redis** (`redis_data`) — cache only; safe to lose
- **Caddy** TLS state (`caddy_data`) — re-issues certs
- **`.env.production`** — manual encrypted backup
- **Docker images** — rebuild with `docker compose build`

---

## 11. Related

- `scripts/backup-db.sh` — older single-container helper (superseded by `scripts/deploy/backup-postgres.sh` for compose production)
- `docs/STORAGE_PRODUCTION_GUIDE.md` — MinIO public read, object keys
- `docs/DOCKER_COMPOSE_PRODUCTION_GUIDE.md` — stack operations
