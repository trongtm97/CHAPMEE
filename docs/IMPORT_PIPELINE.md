# ChapMee — Import Pipeline (MVP)

Pipeline an toàn cho nguồn truyện dịch lớn: **raw file trên MinIO/S3**, metadata + staging trong PostgreSQL, **review trước publish**, full chapter body qua **Chapter Content Object Storage**.

> **Cảnh báo bản quyền:** Chỉ import nội dung bạn có quyền sử dụng trên ChapMee. Không đăng bản dịch/tác phẩm có bản quyền nếu chưa được phép. Nền tảng cần quy trình copyright takedown (ngoài phạm vi MVP).

## Supported formats (MVP)

| Format | Mô tả |
|--------|--------|
| `.json` | `{ "title", "author?", "chapters": [{ "title", "content", "number?" }] }` |
| `.txt` / `.md` | Chia chương bằng heading: `Chương 1:`, `Chapter 1:`, `# Chương 1`, `## Chương 1` |

Không hỗ trợ trong MVP: `.zip`, crawl web, API tự động, AI dịch.

## Object keys

| Loại | Pattern |
|------|---------|
| Raw upload | `imports/raw/{yyyy}/{mm}/{dd}/{importJobId}/{originalFilename}` |
| Processed (staging) | `imports/processed/{yyyy}/{mm}/{dd}/{importJobId}/{itemId}.txt.gz` |
| Published chapter | `story-content/{yyyy}/{mm}/{storyId}/chapters/{chapterId}.composer_json.gz` (hoặc `.txt.gz` tùy format) |

Raw **không** lưu trong DB — chỉ `raw_bucket`, `raw_object_key`.

## Database

Migration: `drizzle/0009_import_jobs_pipeline.sql`

- `import_jobs` — job lifecycle, counters, rights attestation
- `import_items` — story/chapter staging, processed key, dedupe hash, publish targets

## Flow

### 1. Upload

- Admin: `/admin/imports` — form upload + tick xác nhận quyền; tùy chọn **Parse ngay sau upload**
- CLI: `npm run import:local-file -- --file=./sample.json --owner-profile-id=<uuid> --source-name=partner-x --rights`

Tạo `import_jobs.status = uploaded`. Redirect sang trang job với flash message.

### 2. Parse

- Action **Parse job** hoặc CLI `--parse`
- Đọc raw từ S3 → parser → `import_items` (1 story + N chapters)
- Lưu processed chapter text vào `imports/processed/...`
- Dedupe → `duplicate` / `ready`
- Job → `parsed` hoặc `failed`

### 3. Review

- `/admin/imports/{jobId}` — danh sách items, lỗi, duplicate
- Skip / bỏ chọn items không publish

### 4. Publish

- Một form: **Publish selected** / **Skip selected** (cùng checkbox)
- Cần `owner_profile_id` (profile có `creator_profiles`)
- Chỉ chọn chapter vẫn OK: hệ thống **tự publish story** nếu story item `ready`
- Story: `draft` + `visibility: private` (trừ khi tick public)
- Chapter: insert metadata → `applyEpisodeObjectStorageAfterSave` → S3 `story-content/...`
- Items → `published`, link Studio trên trang job

## Dedupe rules

1. **Story:** `normalize(title) + source_name` → `source_story_key`; trùng `import_items` hoặc `stories.title` gần khớp
2. **Chapter (trong job):** cùng `source_chapter_key` hoặc `content_hash`
3. **Chapter (DB):** `episodes.content_hash`, hoặc cùng `story_id` + `episode_number`

Duplicate → `import_items.status = duplicate`, không auto-publish.

## Cleanup policy

| Artifact | Retention |
|----------|-----------|
| Raw failed imports | 30 ngày |
| Processed temp | 14 ngày |
| Published `story-content/` | Lâu dài |
| Import job logs (DB) | 90 ngày |

Liệt kê job đủ điều kiện (không xóa tự động trong MVP):

```bash
npm run import:cleanup -- --dry-run
```

Không hard-delete published content; xóa S3 thủ công sau review.

## Local MinIO

```bash
npm run docker:local:up
npm run db:migrate
# .env.local: S3_ENDPOINT, S3_BUCKET, keys
npm run dev
# Admin → Import pipeline
```

Test nhỏ:

```bash
npm run import:local-file -- --file=./docs/samples/import-sample.json --owner-profile-id=<uuid> --source-name=test --parse
```

## Modules

| Module | Path |
|--------|------|
| Keys | `lib/import/pipeline/import-object-keys.ts` |
| S3 raw/processed | `lib/import/pipeline/import-storage.ts` |
| Parser | `lib/import/pipeline/import-parser.ts` |
| Dedupe | `lib/import/pipeline/import-dedupe.ts` |
| Runner | `lib/import/pipeline/import-runner.ts` |
| Publisher | `lib/import/pipeline/import-publisher.ts` |
| Admin actions | `lib/admin/import-pipeline-actions.ts` |
| UI | `app/admin/imports/*` |

## TODO (post-MVP)

- Redis/worker queue cho parse/publish batch
- ZIP multi-file
- Automated lifecycle cron (raw/processed cleanup)
- Creator-scoped import (không chỉ admin)
- Rights attestation versioning + IP audit
