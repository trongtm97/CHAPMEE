# Storage audit — VPS (Postgres) vs S3 (Vietnix Object Storage)

> Cập nhật: 2026-06-14 — đổi sang phương án **đẩy tất cả text dài lên S3** (reels/community/comments).
> Bối cảnh: dự kiến **hàng chục nghìn truyện**, ~100–300 chương/truyện.
> Repo: `chapmee` (Next.js + Drizzle/Postgres + MinIO/S3).
> Mục tiêu: quyết định nội dung nào **giữ DB trên VPS**, nội dung nào **đẩy sang S3**, lý do cụ thể.

---

## 1. Nguyên tắc phân loại

| Tiêu chí | **Giữ Postgres trên VPS** | **Đẩy lên S3** |
|---|---|---|
| Kích thước mỗi record | < 1–2 KB (text ngắn) | > 5–10 KB (full body) |
| Số lượng records dự kiến | < 1–2 triệu | > 5–10 triệu |
| Cần FTS / `LIKE` / `ORDER BY` theo nội dung | Có | Không (chỉ cần preview ở DB) |
| Cần trả về cho client kèm danh sách (feed) | Có | Không (chỉ khi mở chi tiết) |
| Access control chặt (paid gate, draft, hidden) | RLS Postgres dễ | Phải qua server-side fetch + cache |
| Backup/restore chập mạng | Row ít, pg_dump nhanh | Backup S3 rẻ, độc lập DB |
| Cần presigned URL/CDN cho client | Không | Có (ảnh) hoặc không (text private) |
| Foreign key / RLS phức tạp | Có | Không (chỉ FK tới bảng gốc) |

> **Quy tắc ngón tay cái:** nếu nội dung dài, đọc ít, không cần FTS-into-body → **S3**. Nếu ngắn, đọc nhiều, cần truy vấn → **DB**.

---

## 2. Bảng phân loại chi tiết (toàn bộ text + image content)

| # | Nội dung | Bảng / field | Kích thước TB | Số lượng dự kiến (10K truyện) | Cần FTS? | Cần hiển thị trong feed/listing? | **Quyết định** | Lý do |
|---|---|---|---|---|---|---|---|---|
| 1 | **Chapter body (full text)** | `episodes.content` / `structured_content` | 5–50 KB | 1M–3M chapters | Không (đã có `plain_text_preview` + `excerpt`) | Không (chỉ khi vào reader) | ✅ **S3** | Đã có sẵn `chapter-content-storage.ts` + `content_object_key`. Chiếm 80%+ dung lượng text. |
| 2 | **Standalone story body** | `stories.standalone_content_json` / `standalone_plain_text` | 10–100 KB | 5K–20K stories | Không (search dùng `hook` + `short_description`) | Không (chỉ reader) | ✅ **S3** | Tương tự chapter, nội dung dài. Cùng prefix `story-content/standalone/...`. |
| 3 | **Reels text** (title/hook/body/cta) | `reels_items` | 0.5–2 KB | 100K–500K reels | Không | **Có** (hiển thị trong feed) | 🟡 **Giữ DB** (lý do bên dưới) | Reels ngắn, **feed luôn cần render nội dung** kèm ảnh. Move S3 → phải N+1 GET mỗi card → latency tệ. |
| 4 | **Community post** | `community_posts.content` (≤ 5000 chars) | 1–3 KB | 500K–2M posts | Có thể sau này (chưa có FTS hiện tại) | **Có** (group feed) | 🟡 **Giữ DB** | Cap 5KB, cần render trong feed. Nếu sau này vượt 5M rows và cần FTS body → mới move S3. |
| 5 | **Episode / chapter comments** | `comments.content` (≤ 2000 chars) | 0.3–1 KB | 10M–50M comments | Không | **Có** (hiển thị trong reader) | 🟡 **Giữ DB + cleanup** | Row nhỏ, cần real-time. **Quan trọng:** cần job xoá/archive sau N tháng để không phình. |
| 6 | **Admin content posts / bài viết editorial** | `admin_content_posts.content` | 2–20 KB | 100–1K bài | Không | Không (chỉ trang `/blog/...`) | 🟡 **Giữ DB** (giới hạn) | Số lượng nhỏ. Nếu lên > 10K bài mới move S3. |
| 7 | **Chat messages (DMs)** | `messages.body` (≤ 1000 chars) | 0.3–1 KB | 10M–100M messages | Không (đã có constraint + Realtime) | **Có** (chat UI) | 🟡 **Giữ DB + TTL** | Real-time, RLS chặt, cần query theo conversation. **Cleanup sau 6–12 tháng** là bắt buộc. |
| 8 | **Notifications** | `notifications.title` / `body` | 0.2–0.5 KB | 50M–500M rows | Không | **Có** (inbox) | ✅ **Giữ DB + partition** | Query theo user, aggregate. Khi lớn → **partition theo tháng** + archive cũ. |
| 9 | **Announcements** | `platform_announcements.*` | 0.5–2 KB | < 1K | Không | Không | ✅ **Giữ DB** | Ít, cần admin CRUD. |
| 10 | **Image media (cover, avatar, chapter-media, composer, reel-bg)** | `storage_assets` + key | 50–500 KB | 5M–20M | Không | **Có** (ảnh render qua CDN) | ✅ **S3** (đã có) | S3 + CDN là bắt buộc. |
| 11 | **SEO content blocks, overrides, taxonomy descriptions** | `seo_*`, `taxonomy_terms.*` | 0.2–2 KB | < 100K | Có thể | Có (render public) | ✅ **Giữ DB** | Ngắn, cần query theo taxonomy + admin edit trực tiếp. |
| 12 | **Profile bio, display_name** | `profiles.*` | < 0.5 KB | 100K–1M | Không | Có | ✅ **Giữ DB** | Ngắn, cần render trong card feed. |
| 13 | **Search vectors** | `episodes.search_vector`, `stories.search_vector` (tsvector) | derived | mirror row | Có | Không | ✅ **Giữ DB** | FTS index bắt buộc nằm cùng DB với search column. |

---

## 3. Top 3 nội dung BẮT BUỘC phải S3 (ưu tiên cao)

### 3.1. Chapter body (đã có sẵn → chỉ cần đổi sang Vietnix S3)
- **Vì sao:** text dài nhất, nhiều nhất. 10K truyện × 100 chương × 20KB = **~20 GB** text thuần. Postgres TOAST vẫn đẩy ra ngoài table nhưng pg_dump, replication, vacuum đều chậm.
- **Hiện trạng:** ✅ `lib/storage/chapter-content-storage.ts` + `drizzle/0008_episode_content_object_storage.sql` đã sẵn sàng.
- **Search:** FTS dùng `title` + `excerpt` + `plain_text_preview` (đã populate), **không cần body trong DB** → move body đi không ảnh hưởng search.
- **Paid gate:** Resolver (`get-chapter-full-content.ts`) đã check `is_paid` + `chapter_unlocks` trước khi GET S3 → an toàn.

### 3.2. Standalone story body (chưa có → cần làm)
- **Vì sao:** 1 standalone có thể 50–100KB, gấp 2–3 lần chapter trung bình.
- **Hiện trạng:** ❌ `lib/creator/persist-standalone-story-content.ts` đang lưu `standalone_content_json` + `standalone_plain_text` vào DB.
- **Kế hoạch:** Tái sử dụng `chapter-content-storage.ts` với prefix `story-content/standalone/{storyId}/canonical.{format}.gz`. Thêm 5 cột: `standalone_content_storage_type`, `standalone_content_object_key`, `standalone_content_hash`, `standalone_content_size_bytes`, `standalone_content_encoding`. Viết `scripts/backfill-standalone-content-s3.ts`.

### 3.3. Image media (đã có sẵn → chỉ cần đổi sang Vietnix S3)
- **Vì sao:** CDNs, transform, browser cache. Không tranh luận.
- **Hiện trạng:** ✅ `lib/storage/media.ts` + `storage_assets` registry. 10K truyện × 1 cover + 10 chapter-media + composer + avatar = **~150K–1M ảnh**.

---

## 4. Top 4 nội dung **KHÔNG** nên đẩy S3 (và cách giữ DB khoẻ mạnh)

> **Cập nhật 2026-06-14:** Sau khi thảo luận với product, user chọn **đẩy reels/community/comments body lên S3 luôn** (triệt để), chấp nhận xoá data cũ. Phần này giữ lại cho phase 2+ nếu cần revisit.

### 4.1. Reels text (`reels_items.title/hook/body/cta`) — **ĐÃ ĐẨY S3**
- Lý do đẩy: triệt để + quy mô lớn, đơn giản hoá schema.
- Cách triển khai: body S3 + `body_preview` 280 chars trong DB để feed render không cần GET S3.
- Read path: feed dùng `body_preview`; detail view GET S3 + cache.
- Trade-off: detail page có thêm 1 S3 GET (cached in Redis, latency < 50ms).

### 4.2. Community posts (`community_posts.content` ≤ 5000 chars) — **ĐÃ ĐẨY S3**
- Lý do đẩy: triệt để, 6GB/2M posts nhỏ nhưng nếu scale 10M sẽ 30GB.
- Cách triển khai: body S3 + `content_preview` 280 chars DB.
- Moderation fields (`hidden_reason`, `rejected_reason`, `public_note`, `comments_locked_reason`) **giữ DB** vì admin query thường xuyên.

### 4.3. Comments (`comments.content` ≤ 2000 chars) — **ĐÃ ĐẨY S3**
- Lý do đẩy: triệt để, 50M comments × 1KB = 50GB dù vẫn trong tầm SSD.
- Cách triển khai: body S3 + `content_preview` 280 chars DB. List view (40 comments) dùng preview; full text chỉ load khi cần (admin moderation, edit).
- Trade-off: rất nhẹ, vì list view dùng preview.

### 4.4. Chat messages + Notifications — **giữ DB** (vẫn)
- **Lý do giữ DB:**
  - Real-time (Supabase Realtime / WS), RLS per-conversation, cần query sắp xếp.
  - Move S3 → phá vỡ flow chat.
  - 100M messages × 1KB = 100GB — **partition + TTL** là đủ.
- **Tối ưu (bắt buộc):**
  - **Partition `messages` theo `created_at` (monthly)**.
  - **Partition `notifications` theo `created_at` (monthly)**.
  - Job giữ 12 tháng gần nhất trong table chính, cũ hơn → archive hoặc xoá.
  - Khi > 500M rows → cân nhắc **ClickHouse / TimescaleDB** riêng cho analytics, Postgres giữ 90 ngày.

---

## 5. Thứ tự triển khai đề xuất

### Phase 1 (1–2 tuần) — Nền tảng S3 Vietnix
- [ ] Mua Vietnix S3, tạo bucket `chapmee-media`, policy public read.
- [ ] Sửa `.env.production` (4 biến `S3_*`).
- [ ] Xoá service `minio` + `minio-init` khỏi `docker-compose.production.yml`.
- [ ] Xoá block `media.chapmee.com` khỏi `Caddyfile.production`.
- [ ] `mc mirror` toàn bộ bucket MinIO → Vietnix S3 (giữ nguyên key — DB zero-downtime).
- [ ] Run `npm run storage:check` để xác nhận.

### Phase 2 (1–2 tuần) — Standalone story → S3
- [ ] Migration: thêm 5 cột `standalone_content_*` vào `stories`.
- [ ] Refactor `persist-standalone-story-content.ts` gọi `saveChapterContentObject` với prefix `story-content/standalone/...`.
- [ ] Refactor reader path (`getStoryBySlug.ts`/standalone reader) → dùng `loadChapterContentObject`.
- [ ] Viết `scripts/backfill-standalone-content-s3.ts` (dry-run trước).
- [ ] Run backfill production, set `standalone_content_storage_type = 's3'`.

### Phase 3 (ongoing) — DB hardening cho content giữ lại
- [ ] Partition `comments` theo `created_at` monthly.
- [ ] Partition `messages` theo `created_at` monthly.
- [ ] Partition `notifications` theo `created_at` monthly.
- [ ] Cron `archive_old_content.sh` giữ 12 tháng.
- [ ] Index audit: `EXPLAIN` các query feed/community/reader hàng tuần.
- [ ] Cấu hình S3 lifecycle: chuyển object > 90 ngày không truy cập sang `STANDARD_IA` (rẻ hơn 40%).

### Phase 4 (chỉ khi > 5M comments hoặc > 2M reels) — Re-evaluate
- [ ] Nếu comments phình quá 100GB → cân nhắc move `comments.content` sang S3 với `content_preview` 200 chars trong DB.
- [ ] Nếu reels > 2M → archive cũ sang `reels_items_archive`.

---

## 6. Cảnh báo vận hành

| Rủi ro | Cách tránh |
|---|---|
| Tưởng "S3 = infinite, cứ đẩy hết" → chi phí tăng, latency tăng | Move S3 chỉ khi: dài + nhiều + không cần FTS body. Reels/comments KHÔNG move. |
| `pg_dump` vẫn chậm dù đã move S3 | Partition + archive DB song song. Move S3 **không** thay thế việc dọn DB. |
| Backup VPS lưu cả Postgres volume | Sau khi move S3, **rclone sync** bucket S3 sang bucket backup riêng (Vietnix hỗ trợ cross-region). |
| Comments/messages phình vì giữ DB | Partition + TTL là **bắt buộc**, không phải tùy chọn. |
| Truy cập S3 từ app container chậm (qua public endpoint) | Nếu Vietnix có private endpoint trong cùng region → dùng; nếu không thì Redis cache chapter body (TTL 15–60 phút) là đủ. |
| Quên set `S3_FORCE_PATH_STYLE=true` | Bắt buộc với Vietnix (và mọi S3-compatible). Nếu sai → 403 SignatureDoesNotMatch. |

---

## 7. Tổng kết 1 câu

> **Sau quyết định 2026-06-14:** Tất cả text content dài (chapter body, standalone body, reels text, community posts, comments) **đẩy lên S3 bucket `chapmee-text`** (private, server GET only). Ảnh ở `chapmee-media` (public read). Chat messages + notifications **giữ DB** với partition + TTL. DB vẫn giữ preview 280 chars + metadata + moderation fields cho tất cả nội dung.

Vì sao OK triệt để:
- **Preview 280 chars** trong DB → feed render nhanh, không N+1 S3 GET
- **Detail view** có 1 S3 GET thêm (cached Redis, < 50ms)
- **Read path** dùng fallback `body_preview` nếu S3 fail → không vỡ UI
- **Write path** rollback row nếu S3 fail → DB consistency
