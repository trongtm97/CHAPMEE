# ChapMee — Local media → VPS / Vietnix S3

Hướng dẫn chuyển nội dung đã tạo trên máy local (PostgreSQL + MinIO) lên production mà **không đổi object_key** trong database.

## Nguyên tắc

- Ảnh được lưu trong `storage_assets` (view `media_assets`) với `bucket` + `path` (object key).
- Nội dung truyện/chương/Composer **không** lưu URL `localhost` — chỉ `media_id` / object key.
- URL hiển thị được resolve lúc đọc qua `S3_PUBLIC_BASE_URL` + object key.
- **Không** chạy `docker compose down -v` trừ khi bạn chủ đích xóa toàn bộ volume (mất DB + MinIO).

## 1. Backup local

```bash
bash scripts/backup-local-db.sh
```

File nằm trong `backups/db/chapmee-local-YYYY-MM-DD_HH-mm-ss.sql`.

Restore thử trên máy dev:

```bash
docker exec -i chapmee-local-postgres psql -U chapmee chapmee_local < backups/db/chapmee-local-....sql
```

## 2. Export manifest (tuỳ chọn)

```bash
npx tsx scripts/check-media-integrity.ts
npx tsx scripts/check-media-integrity.ts --check-s3
```

## 3. Sync MinIO → Vietnix S3

Giữ nguyên **object key** (ví dụ `story-covers/2026/06/01/uuid/portrait.webp`).

1. Cài [MinIO Client `mc`](https://min.io/docs/minio/linux/reference/minio-mc.html).
2. Cấu hình alias local và production.
3. Chạy:

```bash
SOURCE_BUCKET=chapmee-local-media TARGET_BUCKET=chapmee-media ./scripts/sync-minio-to-s3.sh
```

Hoặc dùng `aws s3 sync` nếu endpoint hỗ trợ:

```bash
aws s3 sync s3://chapmee-local-media s3://chapmee-media --endpoint-url https://YOUR_VIETNIX_S3_ENDPOINT
```

## 4. Restore database lên VPS

```bash
pg_restore hoặc psql < backup.sql
npm run db:migrate && npm run db:shims
```

## 5. Cập nhật env production

```env
DATABASE_URL=postgresql://chapmee:STRONG_PASSWORD@postgres:5432/chapmee
S3_ENDPOINT=https://YOUR_VIETNIX_S3_ENDPOINT
S3_REGION=auto
S3_BUCKET=chapmee-media
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_BASE_URL=https://media.chapmee.com
```

Không đặt secret trong `NEXT_PUBLIC_*`.

## 6. Đổi tên bucket trong DB (nếu cần)

Chỉ sau khi đã sync object sang bucket production:

```sql
UPDATE public.storage_assets
SET bucket = 'chapmee-media'
WHERE bucket = 'chapmee-local-media';
```

`path` (object key) **giữ nguyên**.

## 7. Kiểm tra sau migrate

- Studio: upload ảnh bìa, ảnh chương, Composer image block.
- Reader/preview: ảnh hiển thị qua `S3_PUBLIC_BASE_URL`.
- `npx tsx scripts/check-media-integrity.ts --check-s3`

## Avatar

Upload mới lưu `profiles.avatar_url` = object key (`avatars/yyyy/mm/dd/...`) và `avatar_media_id` → `storage_assets.id`. UI resolve URL qua `S3_PUBLIC_BASE_URL`.

## Scripts bổ sung

```bash
npx tsx scripts/export-media-manifest.ts
npx tsx scripts/check-media-integrity.ts --check-s3
```

## TODO (polish)

- Image variants pipeline (thumb/card/cover/reader) với `sharp` — hiện lưu `variants` JSON, chưa generate đầy đủ.
- Batch-resolve avatar trên feed/ranking (hiện resolve tại profile loaders chính).
- Paid/private media signed URLs.
