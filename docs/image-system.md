# ChapMee — Hệ thống ảnh truyện

Tài liệu vận hành cho pipeline ảnh bìa truyện (`story_images`, storage `story-images`, helper `getStoryImage`).

> Rà soát ban đầu: [`image-system-audit.md`](./image-system-audit.md)

---

## 1. Vì sao 1 ảnh gốc + nhiều variant?

Người đọc xem cùng một truyện trên nhiều khung hình khác nhau (carousel 16:9, poster 2:3, thumb nhỏ, nền Swipe full màn hình). Một URL `cover_url` duy nhất dẫn tới:

- Tải file quá nặng trên list.
- Crop `object-cover` méo hoặc mất chi tiết quan trọng.
- Layout không ổn định.

**Giải pháp:** upload một lần → nén gốc → sinh nhiều file WebP theo tỉ lệ → UI chọn đúng variant. `stories.cover_url` vẫn được giữ (sync `portrait`) cho code cũ.

---

## 2. Kích thước variant

| Variant | Kích thước | WebP quality | Mục đích |
|---------|------------|--------------|----------|
| `original` | Cạnh dài tối đa 2000px (sau nén upload) | ~82 | Archive, tái sinh variant; **không dùng trong list** |
| `portrait` | 800×1200 (2:3) | 80 | Bìa dọc, library poster, story detail (layout poster) |
| `landscape` | 1280×720 (16:9) | 80 | Discover, catalog grid, community banner, Swipe (ưu tiên) |
| `square` | 600×600 | 80 | Preview tủ truyện (mosaic) |
| `thumb` | 480×480 | 75 | List dày, search, admin row |
| `blur` | 64×64 | 45 | Placeholder LQIP khi tải ảnh chính |

Focal point (`focal_x`, `focal_y`) điều chỉnh vùng crop cho portrait / landscape / square / thumb.

---

## 3. Vị trí dùng variant (usage)

Định nghĩa trong `lib/images/story-image-usage.ts`:

| Usage | Variant | Màn hình |
|-------|---------|----------|
| `discoverCard` | landscape | Discover carousel |
| `catalogGrid` | landscape | `/truyen` lưới desktop |
| `catalogRow` | thumb | `/truyen` hàng mobile, library row nhỏ |
| `libraryCard` | portrait | Poster tủ / bookshelf |
| `storyHero` | landscape | Hero ngang (khi dùng) |
| `swipeBackground` | landscape → blur | Swipe (`getSwipeBackgroundSrc`) |
| `searchResult` | thumb | Tìm kiếm, profile works |
| `adminList` | thumb | Admin list (khi có thumb) |
| `collectionPreview` | square | 3 ảnh preview tủ |
| `communityCard` | landscape | Thẻ nhóm truyện |

**Quy tắc vàng:** list/card **không** resolve `original`. Chuỗi fallback trong `get-story-image.ts` bỏ `original` cho landscape/portrait/thumb.

---

## 4. Quy trình upload / nén

1. Creator chọn file (JPG/PNG/WebP, ≤ 8MB, ≥ 600×600).
2. Chọn focal trên preview local.
3. `POST /api/story-images/upload` (Node runtime, Sharp).
4. `processUploadedStoryImage`: xoay EXIF, strip metadata, max cạnh 2000px, WebP.
5. `generateStoryImageVariants`: crop focal → 5 file derived.
6. Upload storage: `{storyId}/{imageId}/{variant}.webp`.
7. Insert `story_images` (`is_current = true`); trigger demote bản cũ.
8. Sync `stories.cover_url` = URL `portrait`.
9. **Cleanup:** xóa storage các bản `is_current = false` (sau khi bước 7–8 thành công).

Nếu bước 4–7 lỗi: xóa thư mục storage của `imageId` mới (best-effort), **không** đụng ảnh current cũ.

---

## 5. Fallback

`getStoryImage(story, variant)`:

1. URL variant từ `story.currentImage` (chuỗi fallback nội bộ, không gồm `original` cho list).
2. `stories.cover_url` (legacy, truyện chưa migrate).
3. Placeholder gradient + chữ cái đầu (`lib/images/placeholders.ts`).

`blurSrc` trên descriptor: dùng `blur_url` hoặc `thumb` cho skeleton khi load (`StoryImageMedia`).

Không crash khi thiếu variant; `onError` trên `<img>` chuyển về placeholder.

---

## 6. Cleanup storage

| Thời điểm | Hành vi |
|-----------|---------|
| Upload lỗi giữa chừng | `removeStoryImageStorageFolder` cho `imageId` mới |
| Upload thành công | `cleanupSupersededStoryImageStorage`: xóa file các hàng `is_current = false` |
| DB | Giữ hàng cũ để audit; URL trong DB có thể dead |

**Chưa làm (TODO):** job quét orphan folder trong bucket không còn hàng `story_images`.

---

## 7. Debug / admin

- Server log: `[story-images] Story image variants missing: {storyId} …` (`logStoryImageVariantGap`).
- Form sửa truyện: `StoryImageVariantWarning` khi thiếu portrait/landscape/square/thumb/blur.
- Regenerate focal: `POST /api/story-images/regenerate`.

---

## 8. UX lỗi upload

Thông báo tiếng Việt qua `mapStoryImageUploadError`:

- Định dạng / kích thước / quyền / mạng / xử lý ảnh / lưu storage.
- Trạng thái UI: `Đang xử lý ảnh…` (không chờ vô hạn).
- Lỗi giữa chừng: ảnh cũ vẫn hiển thị (current row không đổi).

---

## 9. Kiểm tra performance (manual)

1. DevTools → Network → Img.
2. **Discover / catalog / library list:** URL chứa `landscape.webp`, `thumb.webp`, `portrait.webp` — không `original.webp`.
3. **Swipe:** `landscape` hoặc `blur` (64px), không full original.
4. **Story detail (poster):** `portrait` hoặc legacy `cover_url`.
5. Lazy: `loading="lazy"` trên list; hero có thể `priority` / `eager`.

---

## 10. Nâng cấp sau (ngoài MVP)

- AVIF song song WebP.
- Background queue (upload async) nếu Vercel timeout.
- Join `story_images` sẵn trên list API (tránh chỉ fallback `cover_url`).
- CDN transform (Cloudinary / imgproxy) thay variant tĩnh.
- Job dọn orphan storage + retention policy.

---

## 11. File tham chiếu

| File | Vai trò |
|------|---------|
| `lib/images/get-story-image.ts` | Resolve URL + descriptor |
| `lib/images/complete-story-image-upload.ts` | Pipeline upload |
| `lib/images/cleanup-story-images.ts` | Dọn storage bản cũ |
| `lib/images/story-image-health.ts` | Thiếu variant |
| `lib/images/map-upload-error.ts` | Message lỗi |
| `components/common/StoryImageMedia.tsx` | Blur + fade-in + onError |
| `db/migrations/legacy/070_story_images.sql` | Schema + RLS |
