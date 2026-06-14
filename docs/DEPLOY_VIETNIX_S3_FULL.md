# Deploy ChapMee lên VPS Vietnix — Vietnix S3 Object Storage

> Ngày: 2026-06-14
> Áp dụng cho: VPS `14.225.211.205` (user `deploy`)
> Thay đổi lớn: chuyển từ MinIO self-hosted → Vietnix S3 Object Storage, **tách 2 bucket** (ảnh public + text private), đẩy reels/community/comments body lên S3.

## Tóm tắt thay đổi

| Trước | Sau |
|---|---|
| MinIO self-hosted trên VPS | Vietnix S3 Object Storage (2 bucket) |
| 1 bucket duy nhất | `chapmee-media` (public read) + `chapmee-text` (private) |
| Chỉ chapter body trên S3 | chapter body + **reels text + community posts + comments + standalone story** body trên S3 |
| Compose có service `minio` + `minio-init` | Xoá 2 service đó + volume `minio_data` |
| Caddy proxy `media.chapmee.com → minio:9000` | Xoá block đó (ảnh serve thẳng từ Vietnix CDN) |

---

## 0. Điều kiện tiên quyết (panel Vietnix)

Bạn cần đã tạo sẵn trên Vietnix Object Storage panel:

- ✅ Bucket `chapmee-media` — **public read** bật
- ✅ Bucket `chapmee-text` — **private**
- ✅ Access key có quyền `Get/Put/Delete/List` trên cả 2 bucket
- ✅ DNS `chapmee.com` và `www.chapmee.com` trỏ về `14.225.211.205`
- ✅ **Custom domain `media.chapmee.com`** trỏ về bucket `chapmee-media` (Vietnix panel hỗ trợ):
  - Option A (CDN): Bật CDN Vietnix cho bucket, set custom domain `media.chapmee.com`
  - Option B (Direct): Set CNAME `media.chapmee.com` → endpoint Vietnix cấp cho bucket
  - Verify: `curl -sI https://media.chapmee.com/health/test.txt` (sau khi upload 1 object) phải trả 200

### Lưu ý về URL format

**Sau deploy, mọi URL ảnh sẽ có format ngắn:**

```
https://media.chapmee.com/avatars/2026/06/14/<uuid>.jpg
https://media.chapmee.com/story-covers/2026/06/14/<uuid>/portrait.webp
https://media.chapmee.com/composer-images/...
```

KHÔNG có `/chapmee-media/` trong path. Đây là dạng **virtual-host style** với custom domain trỏ thẳng về bucket.

### Setup custom domain `media.chapmee.com` → bucket `chapmee-media`

Có 2 cách. **Cách B (Cloudflare Worker)** chắc chắn work với mọi S3 provider.

#### Cách A: Custom domain trực tiếp trên Vietnix

1. Vào Vietnix S3 panel → bucket `chapmee-media` → tìm mục **Custom Domain** / **CDN Binding**
2. Nhập `media.chapmee.com` → lưu
3. Trên Cloudflare DNS:
   - Type: `CNAME`
   - Name: `media`
   - Target: `chapmee-media.s3.vn-hcm-1.vietnix.cloud` (endpoint bucket riêng)
   - **Proxy: DNS only (xám)** — không proxy qua Cloudflare
4. SSL: Bật Let's Encrypt tự động trên Vietnix panel cho `media.chapmee.com`

#### Cách B: Cloudflare Worker proxy (khuyến nghị nếu Vietnix không hỗ trợ)

**Bước 1:** Trên Cloudflare DNS, tạo CNAME `media` → `chapmee-media.s3.vn-hcm-1.vietnix.cloud` với **Proxy = Proxied (cam)**.

**Bước 2:** Tạo Worker tại Cloudflare Dashboard → Workers & Pages → Create Worker:

Tên: `chapmee-media-proxy`

Code:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const objectKey = url.pathname.replace(/^\/+/, "");

    if (!objectKey) {
      return new Response("ChapMee Media Worker is running.", { status: 200 });
    }

    const targetUrl = `https://s3.vn-hcm-1.vietnix.cloud/chapmee-media/${objectKey}${url.search}`;

    const newHeaders = new Headers(request.headers);
    newHeaders.set("Host", "s3.vn-hcm-1.vietnix.cloud");

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "follow"
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set(
      "Cache-Control",
      responseHeaders.get("Cache-Control") ?? "public, max-age=3600"
    );

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  }
};
```

Save and Deploy.

**Bước 3:** Trong Worker → Settings → Triggers → Add route:
- Route: `media.chapmee.com/*`
- Service: `chapmee-media-proxy`

**Bước 4:** Verify:
```bash
curl -sI https://media.chapmee.com/<object-key>
# Mong đợi: 200 OK
```

**Lưu ý bucket policy:**

Cả 2 cách đều cần bucket `chapmee-media` có **public read** policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::chapmee-media/*"
    }
  ]
}
```

Mỗi object upload qua Vietnix web UI mặc định có ACL `private` — cần set **Default Object ACL = public-read** trên bucket (nếu panel hỗ trợ), hoặc set public-read từng object qua UI. Khi deploy app thật, upload qua presigned URL sẽ tự động theo policy.

**Bucket `chapmee-text` PHẢI private** — không cần public read.

---

## 1. Backup trước khi deploy

```bash
ssh deploy@14.225.211.205

# Backup Postgres
sudo mkdir -p /opt/backups/chapmee-pre-s3
cd /opt/chapmee/app
docker compose -f docker-compose.production.yml exec postgres \
  pg_dump -U chapmee -d chapmee --no-owner --no-acl \
  | gzip > /opt/backups/chapmee-pre-s3/chapmee-$(date +%Y%m%d-%H%M%S).sql.gz

# Backup MinIO volumes (nếu còn data cũ)
docker run --rm \
  -v chapmee_minio_data:/data:ro \
  -v /opt/backups/chapmee-pre-s3:/backup \
  alpine tar czf /backup/minio-data-$(date +%Y%m%d-%H%M%S).tar.gz /data
```

---

## 2. Cập nhật `.env.production`

```bash
ssh deploy@14.225.211.205
cd /opt/chapmee/app
nano .env.production
```

Thay thế block S3 cũ bằng:

```env
# === S3-compatible storage (Vietnix Object Storage) ===
S3_ENDPOINT=https://s3.vn-hcm-1.vietnix.cloud
S3_REGION=vn-hcm-1
S3_FORCE_PATH_STYLE=true
S3_ACCESS_KEY_ID=<paste từ panel>
S3_SECRET_ACCESS_KEY=<paste từ panel>

# Bucket ảnh — public read, short URL qua custom domain
S3_MEDIA_BUCKET=chapmee-media
S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com
NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL=https://media.chapmee.com

# Bucket text — private, server GET only
S3_TEXT_BUCKET=chapmee-text
```

> ⚠️ KHÔNG commit file này. Không paste secret vào ticket/chat không mã hoá.
>
> ⚠️ URL `https://media.chapmee.com` **KHÔNG** chứa `/chapmee-media` trong path. Phải set custom domain trên Vietnix panel trỏ thẳng về bucket root.

Xoá các biến cũ nếu còn:
```bash
grep -E "^(S3_BUCKET|S3_PUBLIC_BASE_URL|NEXT_PUBLIC_S3_PUBLIC_BASE_URL|MINIO_ROOT_)" .env.production
# Nếu còn, xoá thủ công.
```

Validate:
```bash
npm run env:validate -- --file .env.production
```

---

## 3. Pull code mới + chạy migrations

```bash
cd /opt/chapmee/app
git pull origin main

# Verify compose file mới đã bỏ MinIO
grep -E "minio|minio-init" docker-compose.production.yml
# Mong đợi: không có kết quả nào.

# Chạy migrations (thêm cột S3 cho reels / community / comments)
npm run db:legacy
# Hoặc chỉ chạy 3 migrations mới:
psql "$DATABASE_URL" -f drizzle/0034_reels_content_s3.sql
psql "$DATABASE_URL" -f drizzle/0035_community_posts_content_s3.sql
psql "$DATABASE_URL" -f drizzle/0036_comments_content_s3.sql
```

Verify schema:
```bash
psql "$DATABASE_URL" -c "\d reels_items" | grep -E "content_storage|content_object_key|body_preview"
psql "$DATABASE_URL" -c "\d community_posts" | grep -E "content_storage|content_object_key|content_preview"
psql "$DATABASE_URL" -c "\d comments" | grep -E "content_storage|content_object_key|content_preview"
```

Mong đợi: mỗi bảng có các cột `content_storage_type`, `content_blob_format`, `content_object_key`, `content_hash`, `content_size_bytes`, `content_encoding`, `*_preview`, `content_updated_at`.

---

## 4. (Tuỳ chọn) Backfill data cũ lên S3

> **Bước này KHÔNG bắt buộc** nếu bạn OK xoá content cũ (đã xác nhận trước đó).
> Nếu muốn giữ data cũ: chạy backfill trước. Nếu không, nhảy sang bước 5.

```bash
# Backfill chapter body (script có sẵn)
docker compose -f docker-compose.production.yml run --rm web \
  npx tsx scripts/backfill-chapter-content-s3.ts --limit=200

# Verify
docker compose -f docker-compose.production.yml run --rm web \
  npx tsx scripts/check-media-integrity.ts --check-s3
```

Hiện tại chỉ có chapter body có backfill script. Reels/community/comments body cũ sẽ bị xoá ở bước 5 (user re-upload).

---

## 5. Xoá content text cũ (reels/community/comments body)

```bash
# Dry-run trước
docker compose -f docker-compose.production.yml run --rm web \
  npx tsx scripts/clear-old-text-content.ts --dry-run

# Xoá thật (chỉ chạm rows đã có content_object_key — idempotent)
docker compose -f docker-compose.production.yml run --rm web \
  npx tsx scripts/clear-old-text-content.ts
```

Sau bước này:
- Rows có `content_storage_type = 'db'` và `content_object_key IS NULL` → giữ nguyên (backfill sau nếu cần)
- Rows có `content_object_key IS NOT NULL` → inline `body/hook/cta/title/content` NULL, set `content_storage_type = 's3'`

---

## 6. Khởi động lại stack (đã bỏ MinIO)

```bash
cd /opt/chapmee/app
docker compose -f docker-compose.production.yml --env-file .env.production build web
docker compose -f docker-compose.production.yml --env-file .env.production up -d

# Verify
docker compose -f docker-compose.production.yml ps
# Tất cả services: running, không có "minio" hay "minio-init"
docker compose -f docker-compose.production.yml logs web | head -50
# Không thấy lỗi kết nối S3
```

---

## 7. Verify end-to-end

### 7.1. Test ảnh (bucket media)
```bash
# Lấy một ảnh bất kỳ trong DB
ASSET_KEY=$(psql "$DATABASE_URL" -t -c \
  "select path from public.storage_assets where status = 'active' limit 1;" | tr -d ' ')

# Test public read — URL ngắn, không có /bucket trong path
curl -sI "https://media.chapmee.com/$ASSET_KEY"
# Mong đợi: 200 OK
```

### 7.2. Test text (bucket private)
```bash
# Trong container web, kiểm tra có thể ghi/đọc S3
docker compose -f docker-compose.production.yml exec web \
  npx tsx -e "
    const { getTextS3Bucket } = require('./lib/storage/s3');
    console.log('Text bucket:', getTextS3Bucket());
  "
# Mong đợi: chapmee-text
```

### 7.3. Upload reel mới
- Mở `https://chapmee.com/studio/reels/new`
- Tạo reel mới với text → publish
- Verify `reels_items.content_storage_type = 's3'`, `content_object_key` có giá trị, `body_preview` có 280 chars đầu

### 7.4. Comment mới
- Mở 1 chapter, gửi comment
- Verify `comments.content_storage_type = 's3'`, `content_object_key` có giá trị

### 7.5. Community post mới
- Mở `/community/new`, tạo post
- Verify `community_posts.content_storage_type = 's3'`, `content_object_key` có giá trị

### 7.6. Re-read text từ S3
- Vào trang reel vừa tạo → text hiển thị đầy đủ (server GET từ S3)
- Mở chapter → comments hiển thị
- Mở community post → content hiển thị

### 7.7. Storage integrity
```bash
docker compose -f docker-compose.production.yml run --rm web \
  npx tsx scripts/check-media-integrity.ts --check-s3
```

---

## 8. Rollback (nếu có sự cố)

### Rollback nhanh: revert code + dùng lại MinIO

```bash
cd /opt/chapmee/app
git checkout HEAD~1  # hoặc tag trước đó

# Khôi phục compose file có MinIO
git checkout HEAD~1 -- docker-compose.production.yml Caddyfile.production

# Khôi phục env cũ (S3_BUCKET=chapmee-media, MINIO_ROOT_*)
# (giữ backup .env.production.bak ở bước 2)

docker compose -f docker-compose.production.yml --env-file .env.production up -d --build
```

### Rollback schema: xoá cột S3 mới

```bash
psql "$DATABASE_URL" <<'SQL'
alter table public.reels_items
  drop column content_storage_type,
  drop column content_blob_format,
  drop column content_object_key,
  drop column content_hash,
  drop column content_size_bytes,
  drop column content_encoding,
  drop column body_preview,
  drop column content_updated_at;
alter table public.community_posts
  drop column content_storage_type,
  drop column content_blob_format,
  drop column content_object_key,
  drop column content_hash,
  drop column content_size_bytes,
  drop column content_encoding,
  drop column content_preview,
  drop column content_updated_at;
alter table public.comments
  drop column content_storage_type,
  drop column content_blob_format,
  drop column content_object_key,
  drop column content_hash,
  drop column content_size_bytes,
  drop column content_encoding,
  drop column content_preview,
  drop column content_updated_at;
SQL
```

> **Lưu ý:** nếu user đã tạo reel/comment/post MỚI sau khi deploy, các object S3 của chúng sẽ bị mồ côi (vẫn trong bucket nhưng DB không có key). Có thể chạy cleanup job sau.

### Restore DB từ backup
```bash
gunzip < /opt/backups/chapmee-pre-s3/chapmee-YYYYMMDD-HHMMSS.sql.gz | \
  docker compose -f docker-compose.production.yml exec -T postgres \
  psql -U chapmee -d chapmee
```

---

## 9. Monitoring & maintenance

### Xem usage S3
- Đăng nhập Vietnix panel → Object Storage → Usage
- Theo dõi: storage GB, requests, egress bandwidth

### S3 lifecycle (khuyến nghị)
Trên Vietnix panel, set lifecycle cho bucket `chapmee-text`:
- Chuyển objects không truy cập > 90 ngày sang `STANDARD_IA` (rẻ hơn ~40%)

### DB maintenance
- Xem size `reels_items` / `community_posts` / `comments` — sẽ giảm rõ rệt sau khi xoá inline content
- Set cron archive comments > 12 tháng (xem `docs/BACKUP_RESTORE_GUIDE.md`)

### Cron backup
```cron
# /etc/cron.d/chapmee-backup
0 2 * * * cd /opt/chapmee/app && bash scripts/deploy/backup-postgres.sh >> /var/log/chapmee-backup.log 2>&1
0 3 * * * /usr/local/bin/mc mirror --remove --overwrite vietnix/chapmee-text /opt/backups/chapmee-s3/text/ 2>>/var/log/chapmee-backup.log
0 4 * * * /usr/local/bin/mc mirror --remove --overwrite vietnix/chapmee-media /opt/backups/chapmee-s3/media/ 2>>/var/log/chapmee-backup.log
```

---

## 10. Bảo mật

- **Rotate access key** sau khi deploy xong (tạo key mới trên panel, set vào `.env.production`, restart, sau đó xoá key cũ trên panel).
- **Không commit** `.env.production` hoặc secret vào git.
- **Không bật public write** trên `chapmee-text` (chỉ cần public read nếu có CDN riêng, nhưng ở đây text là private).
- **Không xuất bản** S3 secret ra ngoài.

---

## 11. Troubleshooting

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Error: NoSuchBucket` | Bucket name sai hoặc chưa tạo | Verify trên panel |
| `403 SignatureDoesNotMatch` | Sai access key/secret, hoặc thiếu `S3_FORCE_PATH_STYLE=true` | Double-check env, verify path style |
| 404 khi truy cập ảnh | Sai `S3_MEDIA_PUBLIC_BASE_URL` hoặc bucket chưa public | Test `curl -sI https://<base>/<key>` |
| Upload reel thành công nhưng text trống | Lỗi S3 write → row rollback | Check log: `docker logs chapmee-web | grep "S3"` |
| 500 lúc render reel detail | S3 fetch fail | Check `getReelsContentObject` log, fallback `body_preview` |

---

## 12. Liên hệ hỗ trợ

- Docs Vietnix S3: https://docs.vietnix.vn/object-storage (hoặc URL panel)
- Repo docs: `docs/STORAGE_PRODUCTION_GUIDE.md`, `docs/STORAGE_AUDIT_VPS_VS_S3.md`
- Slack: #chapmee-ops
