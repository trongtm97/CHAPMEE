# ChapMee — Storage production guide (Vietnix S3 Object Storage)

> Cập nhật 2026-06-14: chuyển từ MinIO self-hosted sang Vietnix S3, tách thành **2 bucket** (media public + text private).

Production buckets:
- **Media (images)**: `chapmee-media` — public read qua CDN Vietnix
- **Text (chapter body, standalone, reels text, community posts, comments)**: `chapmee-text` — private, server-side GET only

S3 endpoint (cả 2 bucket): `https://s3.vn-hcm-1.vietnix.cloud`

---

## 1. Internal vs public URLs

| Use | Variable / URL | Who uses it |
|-----|----------------|-------------|
| Upload, presign, server read (media) | `S3_ENDPOINT` + `S3_MEDIA_BUCKET=chapmee-media` | Next.js `app` container |
| Server read (text) | `S3_ENDPOINT` + `S3_TEXT_BUCKET=chapmee-text` | Next.js `app` container |
| Browser `<img>`, OG tags, client preview | `S3_MEDIA_PUBLIC_BASE_URL` + object key | Built at read time — **not stored in DB** |
| Client bundle preview | `NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL` | Same base as `S3_MEDIA_PUBLIC_BASE_URL` |
| Text content (chapter body, etc.) | **Never public** — server fetches via secret key, sends to client as HTML | Server-rendered pages only |

**Database rule:** store `media_asset_id` (FK → `storage_assets`) and/or **`object_key`** only. Never persist `https://media.chapmee.com/...` in columns or JSON content.

### Env contract

| Env | Purpose | Example |
|---|---|---|
| `S3_ENDPOINT` | S3-compatible API endpoint | `https://s3.vn-hcm-1.vietnix.cloud` |
| `S3_REGION` | Region | `vn-hcm-1` |
| `S3_FORCE_PATH_STYLE` | Path-style URLs (true for Vietnix) | `true` |
| `S3_ACCESS_KEY_ID` | Access key (cần quyền trên cả 2 bucket) | `f248b5a9...` |
| `S3_SECRET_ACCESS_KEY` | Secret | `...` |
| `S3_MEDIA_BUCKET` | Bucket ảnh (public read) | `chapmee-media` |
| `S3_MEDIA_PUBLIC_BASE_URL` | URL public cho browser/CDN | `https://media.chapmee.com` (no bucket path) |
| `NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL` | Mirror client (no secrets) | same as above |
| `S3_TEXT_BUCKET` | Bucket text (private) | `chapmee-text` |
| `S3_BUCKET` (legacy) | Fallback — alias of `S3_MEDIA_BUCKET` | `chapmee-media` |

### Allowed external URL exceptions

Third-party URLs (not ChapMee MinIO) when explicitly modeled, e.g.:

- YouTube thumbnails, translation source links, legal links (`lib/media/media-resolver.ts` external contexts)
- Campaign CTAs, canonical links

Do not use external URLs for story covers, avatars, or chapter images that belong in `storage_assets`.

---

## 2. Bucket policies

### `chapmee-media` (public read)

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::chapmee-media/*"
  }]
}
```

### `chapmee-text` (private — no public policy)

Server-side reads only via `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`.

### Application bucket access (via access key)

The access key needs the following on BOTH buckets:
- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`

### Object key prefixes (per bucket)

| Bucket | Prefix | Content |
|---|---|---|
| `chapmee-media` | `avatars/...` | User avatars |
| `chapmee-media` | `story-covers/...` | Story cover images (portrait, landscape, square variants) |
| `chapmee-media` | `chapter-media/...` | Inline images inside chapter body (Composer blocks) |
| `chapmee-media` | `composer-images/...` | Composer image uploads |
| `chapmee-media` | `reel-backgrounds/...` | Manual Reels background images |
| `chapmee-media` | `temp/...` | Temp uploads (3-day TTL) |
| `chapmee-text` | `story-content/{yyyy}/{mm}/{storyId}/chapters/{chapterId}.{format}.gz` | Chapter canonical body |
| `chapmee-text` | `story-content/standalone/{storyId}/canonical.{format}.gz` | Standalone story body |
| `chapmee-text` | `reels-content/{yyyy}/{mm}/{reelId}-<uuid>.json.gz` | Reels text (envelope {v, title, hook, body, cta}) |
| `chapmee-text` | `community-content/{yyyy}/{mm}/{postId}-<uuid>.json.gz` | Community post body |
| `chapmee-text` | `comments-content/{yyyy}/{mm}/{commentId}-<uuid>.json.gz` | Comment body |
| `chapmee-text` | `imports/raw/...` | Import pipeline raw files |
| `chapmee-text` | `imports/processed/...` | Import pipeline processed chapter text |

---

## 3. Scripts

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run storage:init` | `scripts/init-storage.ts` | Create buckets, set public read on media bucket (idempotent) |
| `npm run storage:check` | `scripts/check-storage.ts` | Upload/read test object `health/chapmee-storage-test.txt` |
| `npm run storage:check-chapters` | `scripts/check-chapter-content-integrity.ts` | Verify chapter body S3 integrity (random sample) |
| `npm run backfill:chapter-content` | `scripts/backfill-chapter-content-s3.ts` | Migrate legacy inline chapter bodies to S3 |
| `npx tsx scripts/clear-old-text-content.ts` | `scripts/clear-old-text-content.ts` | NULL out inline reels/community/comments text after S3 migration |
| `npm run media:check` | `scripts/check-media-integrity.ts --check-s3` | Verify media + chapter body S3 integrity |

With production env file on VPS:

```bash
npm run storage:init -- --file .env.production
npm run storage:check -- --file .env.production
npm run storage:check -- --file .env.production --cleanup
```

Scripts **do not print** `S3_SECRET_ACCESS_KEY` or passwords.

---

## 4. Migrating from MinIO (one-time)

If you have existing MinIO data and want to switch to Vietnix S3 without downtime:

```bash
# 1) Install mc
sudo curl -L https://dl.min.io/client/mc/release/linux-amd64/mc \
  -o /usr/local/bin/mc && sudo chmod +x /usr/local/bin/mc

# 2) Configure aliases
mc alias set minio http://chapmee_minio:CHANGE_ME@127.0.0.1:9000
mc alias set vietnix https://ACCESS:SECRET@s3.vn-hcm-1.vietnix.cloud

# 3) Mirror to media bucket
mc mirror --overwrite minio/chapmee-local-media vietnix/chapmee-media

# 4) Mirror to text bucket (only story-content, comments-content, etc.)
mc mirror --overwrite \
  --exclude "avatars/*" --exclude "story-covers/*" --exclude "chapter-media/*" \
  --exclude "composer-images/*" --exclude "reel-backgrounds/*" --exclude "temp/*" \
  minio/chapmee-local-media vietnix/chapmee-text

# 5) Verify
mc ls --recursive vietnix/chapmee-media | wc -l
mc ls --recursive vietnix/chapmee-text | wc -l
```

Then update `.env.production` per section 1, redeploy.

---

## 5. Test public object (media)

After `npm run storage:check`:

```bash
curl -sI "https://media.chapmee.com/health/chapmee-storage-test.txt"
```

| Response | Meaning |
|----------|---------|
| **200** | Vietnix S3 + bucket policy + DNS OK |
| **403** | Bucket policy chưa bật public read |
| **404** | Wrong key or wrong URL base |
| **502/SSL error** | DNS chưa trỏ về CDN Vietnix |

---

## 6. Test private object (text)

Text bucket là private. Test qua server (chạy trong container):

```bash
docker compose -f docker-compose.production.yml exec web \
  npx tsx -e "
    import('./lib/storage/s3.js').then(({ getTextS3Bucket, listObjectKeys }) => {
      console.log('Text bucket:', getTextS3Bucket());
      listObjectKeys({ prefix: 'story-content/', maxKeys: 5 }).then(r => console.log(r));
    });
  "
```

---

## 7. Safety

- **Never** `docker compose down -v` on production (deletes `postgres_data`, `caddy_data`, …).
- **Never** set public write (`s3:PutObject` for `Principal: *`) on either bucket.
- **Never** commit `.env.production` or paste secrets into tickets.
- **Rotate** S3 access key periodically (e.g. every 90 days).

---

## 8. Related

- `docs/DEPLOY_VIETNIX_S3_FULL.md` — runbook deploy từng bước
- `docs/PRODUCTION_ENV_GUIDE.md` — `S3_*` variables
- `docs/MEDIA_STORAGE_STANDARD.md` — app media conventions
- `docs/STORAGE_AUDIT_VPS_VS_S3.md` — phân loại nội dung VPS vs S3
- `npm run storage:health` — DB schema + optional S3 sample probe (different from `storage:check`)
