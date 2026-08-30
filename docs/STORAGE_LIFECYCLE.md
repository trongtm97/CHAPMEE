# ChapMee — Storage lifecycle, search & cache

Vận hành kho truyện lớn: **PostgreSQL = metadata/index**, **MinIO/S3 = full bodies & import raw**.

> Runbook đầy đủ: [OPERATIONS_STORAGE.md](./OPERATIONS_STORAGE.md)

> **Cảnh báo:** Không chạy `docker compose down -v` trên máy có dữ liệu thật — lệnh này xóa volume Postgres và MinIO.

## Trách nhiệm DB vs S3

| Dữ liệu | PostgreSQL | S3/MinIO |
|---------|------------|----------|
| Story title, hook, taxonomy | ✓ | — |
| Chapter title, excerpt, `plain_text_preview`, `word_count` | ✓ | — |
| Full chapter body (S3-backed) | metadata: `content_object_key`, `content_hash`, `content_size_bytes` | `story-content/...` |
| Import staging | `import_jobs`, `import_items` | `imports/raw/...`, `imports/processed/...` |
| Media images | `storage_assets` | `avatars/`, `story-covers/`, … |

**Không** dùng full S3 body cho search.

## Search strategy

- **Stories:** `search_vector` (tsvector, config `simple`) + RPC `search_public_story_ids` — migration `179` / drizzle legacy.
- **Chapters:** `episodes.search_vector` (title, excerpt, `plain_text_preview`) + RPC `search_public_episode_ids` — `drizzle/0010_episodes_search_vector.sql`.
- **Fallback:** `ilike` trên metadata khi RPC chưa migrate.
- **App:** `lib/search/collect-candidates.ts`, `lib/search/story-search.ts`, `lib/search/chapter-search.ts`.
- **Không** tích hợp Meilisearch/Typesense trong MVP.

Snippet hiển thị từ `excerpt` / `plain_text_preview` — không fetch S3.

## Cache strategy

- Key: `chapter-content:{chapterId}:{contentHash}`
- TTL: `CHAPTER_CONTENT_CACHE_TTL_MS` (default 15 phút, max 30 phút khuyến nghị).
- Backend: Redis nếu `REDIS_URL` + package `redis`; fallback in-memory per instance.
- Redis lỗi → memory → S3; **không crash** reader.
- Code: `lib/cache/chapter-content-cache.ts`, reader: `lib/chapters/get-chapter-full-content.ts`.

## Lifecycle rules

| Artifact | Retention (config) | Hành động |
|----------|-------------------|---------------|
| Import raw (failed/cancelled) | 30d (`IMPORT_CLEANUP_POLICY`) | Cron `GET /api/cron/storage-cleanup` hoặc `npm run storage:garbage-collect -- --apply` |
| Import processed (published) | 14d | Cùng job garbage-collect |
| Upload `uploading`/`temp`/`error` (không gắn entity) | 24h / `delete_after_at` | Cùng job garbage-collect |
| `storage_assets` `pending_delete` | ≥24h sau quarantine | Cùng job garbage-collect |
| Lịch sử import CSV Studio (DB) | 90d | Cùng job garbage-collect |
| Published `story-content/` | Lâu dài | Không xóa tự động |
| Orphan S3 / missing key | — | `storage:cleanup-orphan-chapters` → quarantine log |
| `storage_assets` media (orphan) | Admin | `/admin/storage-cleanup` |
| Analytics raw events | Rollup rồi xóa | TODO cron |

**Không hard-delete** mặc định. Xóa S3 cần `--apply --confirm-delete`.

## Integrity check

```bash
npm run storage:health
npm run storage:health -- --probe-s3 --report=./storage-health.json
npm run storage:check-chapters
npm run storage:check-chapters -- --verify-hash --limit=100 --report=./chapters.json
npm run storage:check-imports -- --report=./imports.json
```

Báo cáo JSON console — không tự sửa/xóa.

## Cleanup dry-run / scheduled

```bash
npm run storage:garbage-collect              # dry-run (mặc định)
npm run storage:garbage-collect -- --apply   # xóa artifact đủ điều kiện
npm run storage:cleanup-import-temp
npm run storage:cleanup-orphan-chapters
npm run storage:scheduled-dry-run
```

**Cron VPS (khuyến nghị hàng ngày 04:00):**

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "https://chapmee.com/api/cron/storage-cleanup"
```

Dry-run qua HTTP: thêm `?dry_run=1`.

## Backup

1. **PostgreSQL:** `pg_dump` (schema + data) — stories/episodes metadata, import_jobs, …
2. **MinIO/S3:** `mc mirror` / `aws s3 sync` bucket (`chapmee-local-media` local)
3. **Cùng thời điểm:** backup DB và bucket trong cùng cửa sổ bảo trì (lệch vài phút chấp nhận được cho MVP).
4. **Không** chỉ backup DB (mất object S3).
5. **Không** chỉ copy S3 (mất metadata, keys, permissions).

## Production S3 (Vietnix)

1. Deploy code + migrations.
2. `mc mirror` / sync **cùng object keys** (`story-content/`, `imports/`).
3. Verify sample: `content_hash` = SHA-256 object bytes.
4. Đổi `S3_*` env — không rewrite keys trong DB.

## Admin

- `/admin/storage` — overview cards + CLI hints
- `/admin/storage-cleanup` — media `storage_assets`
- `/admin/imports` — import pipeline

## Related docs

- [CHAPTER_CONTENT_STORAGE_PLAN.md](./CHAPTER_CONTENT_STORAGE_PLAN.md)
- [IMPORT_PIPELINE.md](./IMPORT_PIPELINE.md)
- [STORAGE_ARCHITECTURE_AUDIT.md](./STORAGE_ARCHITECTURE_AUDIT.md)
