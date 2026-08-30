# ChapMee — Storage operations runbook

Tài liệu vận hành gộp cho **chapter S3**, **import pipeline**, **search**, **cache**, **cleanup**.

> Chi tiết kiến trúc: [STORAGE_LIFECYCLE.md](./STORAGE_LIFECYCLE.md), [CHAPTER_CONTENT_STORAGE_PLAN.md](./CHAPTER_CONTENT_STORAGE_PLAN.md), [IMPORT_PIPELINE.md](./IMPORT_PIPELINE.md).

## Cảnh báo

- **Không** `docker compose down -v` trên DB/MinIO có dữ liệu thật.
- **Backup DB + bucket cùng cửa sổ** — không chỉ `pg_dump` hoặc chỉ copy S3.
- Cleanup scripts **mặc định dry-run** — xóa thật cần `--apply --confirm-delete`.

## 1. Database migrations

```powershell
npm run db:migrate              # drizzle 0000–0010 (+ tracking table)
node scripts/db-migrate-foundation.mjs --status   # xem pending
npm run db:legacy               # db/migrations/legacy (stories search_vector, …)
npm run db:shims
```

| File drizzle | Nội dung |
|--------------|----------|
| `0008_*` | Episode S3 metadata columns |
| `0009_*` | `import_jobs`, `import_items` |
| `0010_*` | `episodes.search_vector`, RPC `search_public_episode_ids` |
| `0011_*` | `storage_integrity_runs` (admin last-check UI) |

## 2. Health checks

```powershell
npm run verify:local
npm run storage:health
npm run storage:health -- --probe-s3 --report=./reports/storage-health.json
npm run storage:check-all -- --verify-hash
npm run storage:check-s3-orphans -- --limit=200
npm run storage:scheduled-dry-run   # cron: health + checks + cleanup dry-run
```

| Script | Mục đích |
|--------|----------|
| `storage:health` | Schema + RPC |
| `storage:check-chapters` | S3 object vs `episodes` |
| `storage:check-imports` | S3 raw/processed vs import tables |
| `storage:check-all` | Chạy cả ba |

## 3. Chapter content (MinIO)

```powershell
npm run test:chapter-content
npm run backfill:chapter-content -- --dry-run --limit=50
npm run backfill:chapter-content -- --story-id=<uuid>
```

Object key: `story-content/{yyyy}/{mm}/{storyId}/chapters/{chapterId}.*.gz`

## 4. Import pipeline

```powershell
npm run import:local-file -- --file=./docs/samples/import-sample.json --owner-profile-id=<uuid> --source-name=test --rights --parse
```

Admin: `/admin/imports` — upload → parse → review → publish (draft/private).

## 5. Search (không đọc S3)

- UI: `/search?q=...`
- DB: `title`, `hook`, `excerpt`, `plain_text_preview`, `search_vector`
- RPC: `search_public_story_ids`, `search_public_episode_ids`

## 6. Cache

- Env: `REDIS_URL`, `CHAPTER_CONTENT_CACHE_TTL_MS` (default 15 phút)
- Key: `chapter-content:{chapterId}:{contentHash}`
- Redis lỗi → memory → S3 (reader không crash)

## 7. Cleanup (dry-run)

```powershell
npm run storage:cleanup-import-temp
npm run storage:cleanup-orphan-chapters
npm run import:cleanup -- --dry-run
```

## 8. Scheduled dry-run (cron)

Không xóa dữ liệu — chỉ health, integrity, cleanup dry-run:

```powershell
npm run storage:scheduled-dry-run
```

Ví dụ crontab (Linux server): `0 3 * * * cd /app && npm run storage:scheduled-dry-run >> /var/log/chapmee-storage.log 2>&1`

Kết quả ghi vào `storage_integrity_runs` (trừ cleanup scripts). Xem trên `/admin/storage`.

## 9. Admin UI

| URL | Mục đích |
|-----|----------|
| `/admin/storage` | Overview + CLI hints |
| `/admin/imports` | Import pipeline |
| `/admin/storage-cleanup` | Media `storage_assets` |

## 10. Production sync (Vietnix)

1. `pg_dump` Postgres
2. `mc mirror` / `aws s3 sync` — **giữ nguyên object keys**
3. Verify: `content_hash` = SHA-256 bytes trên bucket mới
4. Đổi `S3_*` env
