# ChapMee — Image System Audit

> Rà soát hiện trạng (2026-05-29). Mục tiêu: chuẩn hóa variant ảnh mà **không phá** `cover_url` và các field hiện có. Bảng `story_images` chưa tồn tại trong codebase — đề xuất dùng ở phase sau.

---

## 1. Tóm tắt executive

| Hạng mục | Hiện trạng |
|----------|------------|
| Nguồn ảnh truyện chính | Một URL: `stories.cover_url` |
| Ảnh nền chương | `episodes.background_image_url` (Swipe + share reader; fallback `cover_url`) |
| Avatar | `profiles.avatar_url` |
| Ảnh tủ/collection | `collections.cover_image_url` (**có trong DB, chưa render UI**) |
| Variant / resize | Không có — client tải URL gốc, `object-cover` crop |
| Component tái sử dụng | `StoryCover` (3/4, 4/5, 16/9), `AvatarFallback`, nhiều `<img>` rời |
| Discover carousel | **Không dùng ảnh** — chỉ gradient + chữ cái đầu |
| Admin/Studio list | **Không hiển thị thumbnail** |

**Vấn đề cốt lõi:** cùng `cover_url` bị ép vào khung 16:9, 3:4, 4:5, ~2:3, full-screen Swipe, thumb ~2:3 nhỏ → méo, crop xấu, hoặc tải file quá lớn.

---

## 2. Bảng chuẩn variant đề xuất (toàn app)

| Variant | Tỉ lệ / kích thước | Mục đích | Ghi chú triển khai |
|---------|-------------------|----------|-------------------|
| `original` | Max cạnh dài **2000px**, đã nén | Upload gốc, OG chất lượng cao, archive | Giữ tương thích `cover_url` trỏ bản gốc hoặc CDN path gốc |
| `landscape` | **16:9**, 1280×720 | Discover card, Story hero ngang, Swipe background, Community banner | Crop center; ưu tiên nội dung ngang |
| `portrait` | **2:3**, 800×1200 | Bìa truyện list/poster, Library, Home `StoryCover` small/medium | Khớp `aspect-[3/4]` UI hiện tại (~0.75) |
| `square` | **1:1**, 600×600 | Collection cover, profile preview grid | `collections.cover_image_url` + preview mosaic |
| `thumb` | Cạnh dài **320** hoặc **480px** | Search/catalog row, admin list, notification thumb | WebP/AVIF; `sizes` nhỏ |
| `blur` | **32** hoặc **64px** | Placeholder LQIP, Swipe/hero blur backdrop | Base64 hoặc URL riêng; không dùng làm ảnh chính |

### Fallback chain (đề xuất)

```
resolveStoryImage(story, variant):
  story_images[variant] ?? cover_url (nếu variant phù hợp) ?? gradient/initials
```

- **Không xóa** `cover_url`.
- Nếu `story_images` chưa có → mọi variant fallback về `cover_url` (hành vi hiện tại).
- Episode Swipe: `episode_images.landscape` ?? `background_image_url` ?? `story.landscape` ?? `story.cover_url` ?? blur/gradient.

---

## 3. Field ảnh trong database / types

| Field | Bảng / nguồn | Map app | UI đang dùng? |
|-------|--------------|---------|---------------|
| `cover_url` | `stories` | `coverUrl` | Có — rộng khắp app |
| `background_image_url` | `episodes` | `backgroundImageUrl` | Swipe, share reader (không hiển thị trong reader body) |
| `avatar_url` | `profiles` | `avatarUrl` | Profile, messages, rankings, me |
| `cover_image_url` | `collections` | `coverImageUrl` | **Chỉ fetch** (`lib/supabase/collections.ts`, `get-public-collections.ts`) — **không component render** |
| `logo_url` | sponsors/campaigns | `logoUrl` | Banner challenge (~32×32) |
| `metadata.thumbnail_url` | notifications | optional | `NotificationItem` 36×36 |
| `story_images` | *(chưa có)* | — | Phase sau |

Migration tham chiếu: `supabase/migrations/001_initial_schema.sql` (`cover_url`), `010_episode_background_image.sql`, `049_collections.sql` (`cover_image_url`).

---

## 4. Ma trận màn hình → variant đề xuất

| Khu vực | Variant đề xuất | Ghi chú hiện trạng |
|---------|-----------------|-------------------|
| **Home** — Featured | `landscape` hoặc `featured` (= landscape 16:9) | `StoryCover` `size="featured"` → `aspect-[16/9]` |
| **Home** — StoryCard, Trending, ForYou, Continue, NewChapter | `portrait` / `thumb` | `StoryCover` `size="small"` → `aspect-[3/4]` |
| **Swipe** — full bleed background | `landscape` (episode) | `SwipeBackground` `object-cover` full viewport; nguồn: `background_image_url` → `cover_url` |
| **Discover** — `MobileStoryCard` carousel | `landscape` | **Chưa có ảnh** — chỉ `aspect-video` + gradient |
| **Discover** — list/ranking compact | `thumb` hoặc không ảnh | `MiniRanking`, `UpdatedStoriesCompactList` — chữ cái đầu |
| **Discover** — `DiscoverStoryCard` (desktop text card) | `thumb` (tùy chọn) | Không ảnh |
| **Story detail** `/stories/[slug]` | `portrait` (mobile hero) | `story/StoryHero`: ~84×120px (~0.7:1), `bg-cover` |
| **Story detail** — `stories/StoryHero` | `portrait` | **File tồn tại nhưng không import** — dead code `aspect-[3/4]` |
| **Reader** | Không hero ảnh; share dùng `landscape` | Share: `backgroundImageUrl` ?? `coverUrl` |
| **Catalog** `/truyen` | `landscape` (grid), `thumb` (mobile row) | `DesktopStoryGridCard` 16:9; `MobileStoryListItem` 16:9 thumb |
| **Library** — saved/continue/collections | `thumb` / `portrait` | Thumb ~2.2×3.1rem, `object-cover` |
| **Public profile** — works | `thumb` | 48×64px (`h-16 w-12`) |
| **Public profile** — collections | `square` (tủ) + `thumb` (preview stories) | Preview 40×28 / 28×40 — ép `cover_url` |
| **Community** — story group | `landscape` | Banner `h-28` full width; card `h-20` |
| **Search** | `thumb` | `/truyen?q=` = catalog; không ảnh riêng Discover search |
| **Admin messaging** | `avatar` thumb | Chỉ `avatar_url` |
| **Studio/Creator story list** | `thumb` | **Không ảnh** — text only |
| **Creator/Studio forms** | `original` URL input | Text field `cover_url` — chưa upload pipeline |
| **Share cards** | `landscape` / episode bg | `aspect-[9/16]` — ảnh full bleed `object-cover` |
| **SEO OG** | `landscape` hoặc `original` | Story page: `cover_url`; Episode page: **default OG only** |

---

## 5. Chi tiết theo khu vực (file / tỉ lệ / vấn đề)

### 5.1 Home (`app/page.tsx`, `components/home/*`)

| Component | Field | Render | Tỉ lệ UI | Vấn đề |
|-----------|-------|--------|----------|--------|
| `FeaturedStorySection` | `coverUrl` | `StoryCover` featured | **16:9** | Poster dọc bị crop ngang |
| `StoryCard`, `ForYouSection` | `coverUrl` | `StoryCover` small | **3:4** | OK nếu ảnh portrait |
| `TrendingStoryCard` | `coverUrl` | `StoryCover` small | **3:4** | |
| `ContinueReadingSection` | `coverUrl` | `StoryCover` small | **3:4** | |
| `NewChapterCard` | `coverUrl` | `StoryCover` small | **3:4** | |
| Data | `lib/stories/getHomeStories.ts` | `cover_url` → `coverUrl` | — | Một URL cho mọi size |

### 5.2 Swipe (`app/swipe`, `components/swipe/*`)

| Component | Field | Render | Tỉ lệ UI | Vấn đề |
|-----------|-------|--------|----------|--------|
| `SwipeTextScene` → `SwipeBackground` | `backgroundImageUrl` | `<img>` full inset | **~9:16 viewport**, `object-cover` | Cần landscape/wide; portrait cover crop nặng |
| `SwipeFeed` share | `backgroundImageUrl` ?? `creatorAvatarUrl` | Share modal | 9:16 card | Avatar fallback kỳ khi không có bg |
| Data | `lib/swipe/getSwipeItems.ts` | `background_image_url` ?? `story.cover_url` | — | Không variant; tải ảnh gốc |

### 5.3 Discover (`app/discover`, `components/discover/*`)

| Component | Field | Render | Tỉ lệ UI | Vấn đề |
|-----------|-------|--------|----------|--------|
| `MobileStoryCard` | *(không fetch cover)* | Gradient + initial | **16:9** placeholder | Thiếu ảnh thật — gap lớn vs đề xuất product |
| `StoryCarouselSection` | — | Dùng `MobileStoryCard` | 16:9 | |
| `DiscoverStoryCard` | — | Text only | — | |
| `MiniRanking`, `UpdatedStoriesCompactList` | — | Initial 40×40 | ~1:1 box | |
| `DiscoverFeed` data | `lib/discover/getDiscoverData.ts` | **Không select `cover_url`** | — | Cần thêm field + `landscape` khi implement |

### 5.4 Story detail (`app/stories/[slug]`, `components/story/*`)

| Component | Field | Render | Tỉ lệ UI | Vấn đề |
|-----------|-------|--------|----------|--------|
| `StoryHero` (active) | `coverUrl` | `bg-cover` div | **~5.25:7.5 rem** (~0.7:1) | Khác `StoryCover` 3:4 — không thống nhất |
| `StoryDetailPage` share | `coverUrl` | `ShareCard` | 9:16 | |
| `DesktopStoryDetail` | — | Layout only | — | |
| SEO | `coverUrl` | `resolvePublicUrl` OG | arbitrary | OK nếu ảnh đủ lớn |
| JSON-LD | `coverUrl` | `lib/seo/structured-data.ts` | — | |

**Dead code:** `components/stories/StoryHero.tsx` — `aspect-[3/4]`, không được import.

### 5.5 Reader (`app/stories/[slug]/episodes/[episodeNumber]`)

| Component | Field | Render | Tỉ lệ UI | Vấn đề |
|-----------|-------|--------|----------|--------|
| `ReaderPage` | `backgroundImageUrl`, `coverUrl` | Chỉ share payload | — | Không hiển thị ảnh trong UI đọc |
| Episode OG metadata | — | `getDefaultOgImage()` | — | **Không dùng** story/episode image |
| Data | `lib/episodes/getEpisodeReaderData.ts` | both URLs | — | |

**Chapter editor:** không tìm thấy form `background_image_url` trong `components/creator` / `components/studio` — field DB có, UI upload có thể thiếu.

### 5.6 Catalog / Search (`app/truyen`, `components/stories/*`)

| Component | Field | Render | Tỉ lệ UI | Vấn đề |
|-----------|-------|--------|----------|--------|
| `DesktopStoryGridCard` | `coverUrl` | `<img>` | **16:9** | |
| `MobileStoryListItem` | `coverUrl` | `<img>` | **16:9**, w 7.25rem | |
| `StoryCatalogPage` | via layouts | — | — | Search = query `q` on same page |
| Data | `lib/stories/get-public-stories.ts` | `cover_url` | — | |

### 5.7 Library / Tủ truyện (`components/library/*`, `app/me/library`)

| Component | Field | Render | Kích thước ~ | Vấn đề |
|-----------|-------|--------|--------------|--------|
| `SavedStoriesList` | `coverUrl` | img | 2.2×3.1rem | Gốc full res |
| `LibraryContinueCard` | `story.coverUrl` | img | 2.2×3.1rem | |
| `StoryCollectionsList` | preview `coverUrl` | img | 2.5×3.5rem | |
| `PublicCollectionCard` | preview `coverUrl` | img | 1.75×2.5rem | |
| `FollowingLibraryTab` | story/group `coverUrl`, `avatarUrl` | img | 9×7 / 36×36 | Group thumb gần portrait |
| `CollectionCard` | preview `coverUrl` | img | 3×4rem | `coverImageUrl` không dùng |

### 5.8 Me / Profile

| Component | Field | Render | Tỉ lệ |
|-----------|-------|--------|-------|
| `ProfileHero`, `EditProfileForm` | `avatarUrl` | `AvatarFallback` | 1:1 (sm–xl) |
| `BookshelfPreview` | `coverUrl` | img | **3:4** |
| `ContinueReadingCard` | `coverUrl` | img | ~2.35:3.25 |
| `CollectionsPreview` | `coverUrl` | img | small thumb |
| `PublicProfileHeader` | `avatarUrl` | Avatar lg | 1:1 |
| `PublicWorksTab` | `coverUrl` | next/image fill | ~3:4 |
| `EarlyFanSection` | `coverUrl` | bg-cover | **3:4** |
| `app/profile/.../collections/[id]` | item `coverUrl`, owner `avatarUrl` | Image 40px | thumb |

### 5.9 Community

| Component | Field | Render | Tỉ lệ |
|-----------|-------|--------|-------|
| `StoryGroupCard` | `group.coverUrl` (= story) | img h-20 | wide strip |
| `GroupListItem` | `coverUrl` | img | small |
| `app/community/story/[storyId]` | `story.coverUrl` | banner h-28 | **landscape strip** |
| Post cards | — | **Không ảnh truyện** | text-first |

### 5.10 Creators public (`components/creators/CreatorStoriesGrid.tsx`)

| Component | Field | Render | Tỉ lệ |
|-----------|-------|--------|-------|
| Local `StoryCover` | `coverUrl` | img | **4:5** (khác `StoryCover` shared 3:4) |

### 5.11 Admin / Studio / Creator

| Khu vực | Ảnh story? | Field form |
|---------|------------|------------|
| `StudioStoriesTable`, `CreatorStoryList` | Không | — |
| `StudioStoryForm`, `StoryForm` | URL text | `cover_url` |
| Admin moderation messaging | Avatar only | `avatar_url` |

### 5.12 Share & misc

| Component | Field | Tỉ lệ |
|-----------|-------|-------|
| `ShareCard` | `backgroundUrl` ?? `coverUrl` | **9:16** |
| `ShareProfileCard` | `avatarUrl` | 4:5 / 9:16 |
| `NotificationItem` | `metadata.thumbnail_url` | 36×36 |
| Rankings | supporters — avatar, không story cover | — |

### 5.13 Shared: `StoryCover` (`components/stories/StoryCover.tsx`)

| `size` | CSS aspect | Đề xuất variant |
|--------|------------|-----------------|
| `small` | **3:4** | `portrait` hoặc `thumb` |
| `medium` | **4:5** | `portrait` |
| `featured` | **16:9** | `landscape` |

Dùng `<img>` native, lazy/eager, gradient fallback khi lỗi — **không** next/image optimization.

---

## 6. Vấn đề hiện tại (tổng hợp)

1. **Một URL, nhiều khung** — `cover_url` + `object-cover` trên 16:9, 3:4, 4:5, full-screen, thumb nhỏ.
2. **Discover thiếu ảnh** — carousel 16:9 nhưng không load `cover_url` / landscape.
3. **Swipe vs bìa** — nền full màn cần landscape; fallback `cover_url` thường portrait.
4. **Hai StoryHero** — `story/StoryHero` vs `stories/StoryHero` (unused); tỉ lệ khác nhau.
5. **Creator grid 4:5** vs **StoryCover 3:4** — cùng data, khác aspect.
6. **`cover_image_url`** — đã có DB, chưa UI → tủ dùng mosaic `story.cover_url`.
7. **Không resize/CDN** — bandwidth & LCP; hầu hết `<img src={url gốc}>`.
8. **Episode OG** — không dùng ảnh story/episode.
9. **Không editor UI** cho `background_image_url` (cần xác nhận khi làm phase upload).
10. **`story_images` chưa có** — cần migration + resolver + fallback `cover_url`.

---

## 7. Backward compatibility (bắt buộc)

- Giữ nguyên cột `stories.cover_url` và mọi API trả `coverUrl`.
- Resolver mới (ví dụ `getStoryImageUrl(story, 'landscape')`) **mặc định** trả `cover_url` khi chưa có row `story_images`.
- Không đổi contract TypeScript public trừ khi thêm field optional (`coverLandscapeUrl?`).
- Upload pipeline phase sau: ghi variant mới **và** có thể cập nhật `cover_url` = `original` hoặc `portrait` để app cũ vẫn chạy.
- `episodes.background_image_url` giữ nguyên; variant episode có thể mirror pattern `episode_images`.

---

## 8. Đề xuất variant theo màn hình (checklist implement)

| Màn hình | Variant chính | Fallback |
|----------|---------------|----------|
| Discover `MobileStoryCard` | `landscape` | `cover_url` + blur |
| Swipe background | `episode.landscape` → `story.landscape` | `cover_url` → gradient |
| Story detail hero | `portrait` (thống nhất 3:4) | `cover_url` |
| Home featured | `landscape` | `cover_url` |
| Home lists | `portrait` / `thumb` | `cover_url` |
| Catalog grid | `landscape` | `cover_url` |
| Catalog mobile row | `thumb` | `cover_url` |
| Library rows | `thumb` | `cover_url` |
| Collection card header | `square` (`cover_image_url`) | gradient |
| Collection preview chips | `thumb` | `cover_url` |
| Community group banner | `landscape` | `cover_url` |
| Search/admin list | `thumb` | initials |
| OG story | `landscape` hoặc `original` | default image |
| OG episode | `landscape` từ episode bg | story landscape → default |
| Share swipe | `landscape` / episode bg | `cover_url` |
| Avatar mọi nơi | `avatar` 128–256 (riêng profile) | initials |

---

## 9. Module / file liên quan (index nhanh)

**UI — story cover**

- `components/stories/StoryCover.tsx`
- `components/stories/DesktopStoryGridCard.tsx`
- `components/stories/MobileStoryListItem.tsx`
- `components/story/StoryHero.tsx`
- `components/stories/StoryHero.tsx` *(unused)*
- `components/home/*` (StoryCard, Featured, Trending, Continue, NewChapter)
- `components/discover/MobileStoryCard.tsx`
- `components/library/*`, `components/me/*`, `components/profile/*`
- `components/community/StoryGroupCard.tsx`, `groups/GroupListItem.tsx`
- `components/collections/CollectionCard.tsx`, `library/PublicCollectionCard.tsx`
- `components/creators/CreatorStoriesGrid.tsx`

**UI — episode / swipe**

- `components/swipe/SwipeBackground.tsx`, `SwipeTextScene.tsx`, `SwipeFeed.tsx`
- `components/reader/ReaderPage.tsx`
- `components/share/ShareCard.tsx`

**UI — avatar**

- `components/ui/AvatarFallback.tsx`
- `components/profile/PublicProfileHeader.tsx`
- `components/messages/*`
- `lib/profile/uploadAvatar.ts`

**Data layer**

- `lib/stories/getStoryBySlug.ts`, `getHomeStories.ts`, `get-public-stories.ts`
- `lib/swipe/getSwipeItems.ts`
- `lib/episodes/getEpisodeReaderData.ts`
- `lib/discover/getDiscoverData.ts` *(no cover today)*
- `lib/library/*`, `lib/profile/*`, `lib/supabase/collections.ts`, `public-content.ts`
- `lib/creator/createStory.ts`, `updateStory.ts`, `storyFormValidation.ts`

**Forms**

- `components/creator/stories/StoryForm.tsx`
- `components/studio/stories/StudioStoryForm.tsx`

**SEO**

- `app/stories/[slug]/page.tsx`
- `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`
- `lib/seo/structured-data.ts`

---

## 10. Gợi ý prompt tiếp theo (không làm trong audit này)

1. Migration `story_images` (story_id, variant, url, width, height, blur_hash).
2. `lib/images/resolveStoryImage.ts` + fallback `cover_url`.
3. Supabase Storage + edge resize (hoặc imgproxy) cho 6 variant.
4. Cập nhật từng surface theo bảng §8 — ưu tiên Discover, Swipe, StoryCover sizes.
5. Hiển thị `cover_image_url` trên `CollectionCard`.
6. Episode editor: upload `background_image_url` + variant landscape.
7. `next/image` + `sizes` cho thumb paths.

---

## 11. Validation (đã / cần làm)

- [x] Rà soát codebase — chỉ thêm doc, không đổi runtime.
- [ ] Chạy app local — xác nhận không regression (không có thay đổi code UI).
- [ ] Review doc với team trước migration `story_images`.

---

*Tài liệu này đủ để mở phase implement: schema → resolver → từng màn theo ma trận §4, luôn fallback `cover_url`.*
