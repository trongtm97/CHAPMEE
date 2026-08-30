# ChapMee — Media platform (local-first)

Tài liệu tóm tắt sau khi hoàn thiện MVP media. Chi tiết migrate: [LOCAL_MEDIA_MIGRATION.md](./LOCAL_MEDIA_MIGRATION.md).

## Stack

| Thành phần | Local | Production |
|------------|-------|------------|
| DB | PostgreSQL (`docker-compose.local.yml`) | PostgreSQL VPS |
| Object storage | MinIO `:9000` | Vietnix S3 |
| Metadata | `storage_assets` (view `media_assets`) | Cùng schema |
| URL hiển thị | `S3_PUBLIC_BASE_URL` + object key | Đổi env sau migrate |

## Object key (không lưu localhost vào content)

```
avatars/yyyy/mm/dd/{uuid}.ext
story-covers/yyyy/mm/dd/{uuid}/{variant}.webp
chapter-media/yyyy/mm/dd/{uuid}.webp
composer-images/yyyy/mm/dd/{uuid}.ext
reel-backgrounds/yyyy/mm/dd/{uuid}.ext
```

## Upload

| Loại | Luồng |
|------|--------|
| Ảnh bìa | Studio → server → MinIO → `story_images` + `stories.cover_url` (object key) |
| Ảnh chương / Composer | `/api/chapter-images/upload` → `chapter_images` + `media_id` |
| Avatar | Settings → object key + `profiles.avatar_media_id` |
| Reels nền | Chọn bìa/chương (lưu object key) hoặc gradient |
| Generic | `POST /api/media/presign-upload` + `complete-upload` |

## Resolve URL (đọc)

- `resolveStoredMediaUrl` / `resolveStoryCoverUrl` / `profileAvatarUrlFromRow`
- Client preview: `NEXT_PUBLIC_S3_PUBLIC_BASE_URL` (mirror public base, không secret)

## Scripts

```bash
npm run docker:local:up
npm run db:setup
npm run media:check
npm run media:manifest
bash scripts/backup-local-db.sh
```

## Validation

- Composer / chapter: chặn `localhost`, `file://`, `/public/uploads` trong content
- Publish: `verifyChapterMediaIdsForPublish`, Reels background normalize

## TODO sau MVP

- Image variants đầy đủ (card/reader) qua presign + sharp job
- Admin panels: resolve avatar còn lại
- `episodes.background_image_url` migrate sang object key thuần
