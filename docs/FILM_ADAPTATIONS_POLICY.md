# Phim chuyển thể — Chính sách sản phẩm & vận hành

**Trạng thái:** Schema + settings (PROMPT 2) · UI chưa triển khai  
**Đối tượng:** Product, Admin, Creator, Legal review

---

## 0. Schema & settings (implemented)

### Bảng `story_film_adaptations`

- **Story-level only:** `story_id` NOT NULL, FK → `stories(id)` ON DELETE CASCADE. **Không có** `chapter_id`.
- **YouTube only:** `youtube_url` NOT NULL; `youtube_embed_type` = `video` | `playlist`.
- **Target bắt buộc (DB check):** `youtube_video_id` khi `video`; `youtube_playlist_id` khi `playlist`.
- **MVP free:** `is_free` NOT NULL DEFAULT `true`, CHECK `is_free = true` — không cột `price` / coin.
- **relation_type:** `based_on_story`, `inspired_by_story`, `official_adaptation`, `fan_adaptation`, `trailer`, `short_film`, `animation`, `cinematic_scene`.
- **status:** `draft`, `pending_review`, `published`, `hidden`, `rejected`, `copyright_disputed`, `unavailable`.
- Migration: `drizzle/0022_story_film_adaptations.sql` · Drizzle: `lib/db/schema/film-adaptations.ts`.

### App settings key

`film_adaptation_policy_settings` trong `public.app_settings` (JSONB).

- Module: `lib/settings/film-adaptation-settings.ts` (Zod + `getFilmAdaptationPolicySettings()`).
- Defaults được seed trong migration `0022` (xem file SQL).

| Setting | Default |
|---------|---------|
| `film_adaptations_enabled` | `true` |
| `film_adaptations_youtube_only` | `true` |
| `require_linked_story` | `true` |
| `allow_story_level_only` | `true` |
| `allow_chapter_level_linking` | `false` |
| `allow_youtube_video` / `allow_youtube_playlist` | `true` |
| `film_must_be_free` | `true` |
| `paid_film_enabled` / `coin_unlock_film_enabled` | `false` |
| `default_film_status` | `pending_review` |
| `max_films_per_story` | `20` |
| `show_in_discover_tab` | `true` |
| `discover_tab_label` | `"Phim chuyển thể"` |
| `creative_disclaimer_text` | (xem migration SQL) |
| `youtube_embed_ads_on_film_pages_enabled` | `false` |

---

## 0.1 Shared helper & policy engine (PROMPT 3)

### YouTube helper

File: `src/lib/film-adaptations/youtube.ts`

- `parseYoutubeVideoId(url)`, `parseYoutubePlaylistId(url)`, `parseYoutubeEmbedInput(url)`
- `isYoutubeUrl(url)`
- `buildYoutubeVideoEmbedUrl(videoId)`, `buildYoutubePlaylistEmbedUrl(playlistId)`
- `buildYoutubeWatchUrl(videoId)`, `buildYoutubePlaylistUrl(playlistId)`
- `getYoutubeThumbnailUrl(videoId)`
- `validateYoutubeFilmUrl(url, settings)`

Supported URLs:

- `youtube.com/watch?v=...`
- `youtu.be/...`
- `youtube.com/embed/...`
- `youtube.com/shorts/...`
- `youtube.com/playlist?list=...`
- `youtube.com/watch?v=...&list=...`

Rule xử lý khi có cả video + playlist: mặc định chọn `video`, trừ URL playlist explicit (`/playlist` hoặc `embed/videoseries`).

### Film policy engine

File: `src/lib/film-adaptations/film-policy.ts`

- `getFilmAdaptationCapabilities(story, film?, settings?)`
- `canCreateFilmAdaptation(profile, story, settings)`
- `canPublishFilmAdaptation(profile, story, filmInput, settings)`
- `canShowAdsOnFilmAdaptation(story, film, settings)`
- `canUseYoutubeForFilm(url, settings)`
- `assertFilmMustBeLinkedToStory(input, settings)`
- `assertFilmIsStoryLevelOnly(input, settings)`
- `assertFilmIsFree(input, settings)`
- `assertYoutubeOnly(input, settings)`
- `getFilmRelationLabel(relation_type)`
- `getFilmPublicBadges(story, film, settings)`
- `getFilmStatusLabel(film)`

Engine enforce:

- reject non-YouTube URL
- reject chapter-level link payload
- reject paid/coin fields
- reject audio-only / background playback flags
- translation unverified: ads disabled by default (trừ khi settings cho phép rõ ràng)

---

## 1. Định nghĩa

**Phim chuyển thể** (trên ChapMee) là video **hosted trên YouTube**, được creator/admin đăng ký như **bản chuyển thể hoặc lấy cảm hứng** từ một **truyện text đã xuất bản** trên nền tảng.

ChapMee **không** là nền tảng phát hành phim. ChapMee là **cầu nối khám phá** giữa truyện đọc và video YouTube chính thức.

---

## 2. Nguyên tắc bất biến (non-negotiable)

| # | Quy tắc |
|---|---------|
| 1 | **Chỉ YouTube** — URL `youtube.com`, `youtu.be`, `m.youtube.com` (parse chuẩn). |
| 2 | **Chỉ iframe/player chính thức** — embed URL `https://www.youtube.com/embed/{videoId}`. |
| 3 | **Không rehost** — không upload video/audio lên MinIO/S3 của ChapMee cho phim. |
| 4 | **Không proxy/download** — không `yt-dlp`, không HLS proxy, không tách audio. |
| 5 | **Không audio-only** — tính năng này là video; audio companion là module khác. |
| 6 | **Không background play** — không Global Player, không hidden iframe phát nền. |
| 7 | **Không bán phim** — không coin, không unlock, không VIP phim. |
| 8 | **Bắt buộc gắn truyện** — mọi bản ghi có `story_id`; không catalog phim mồ côi. |
| 9 | **Không link chương** — không `chapter_id`, không “phim chương 12”. |
| 10 | **Disclaimer sáng tạo** — phim có thể khác plot; UI bắt buộc badge + text. |
| 11 | **Không trở thành aggregator YouTube** — giới hạn discover, moderation, caps. |

---

## 3. Quan hệ với Audio Companion

| | Audio | Phim |
|---|-------|------|
| Mục đích | Nghe truyện / audio book | Xem video chuyển thể |
| Nguồn | External direct + YouTube | **YouTube only** |
| Player | Global Audio + iframe YT | **iframe only** |
| Background | External có thể (policy) | **Cấm** |
| Chapter | Policy cấm khi story-level | **Schema không có chapter** |
| Route public | `/audio`, story tab Audio | Discover tab, story tab Phim |

**Không** dùng chung bảng `audio_items` cho phim.

---

## 4. Liên kết truyện (story-level only)

### 4.1 Eligibility truyện

- Truyện **đã publish** trên ChapMee (`status` phù hợp catalog public).
- Creator phải là owner hoặc role được delegate (studio ownership hiện có).
- Admin có thể thêm: `min_story_published_chapters`, chặn truyện `hidden`, `copyright_disputed`.

### 4.2 Cấm phim độc lập

- Không route `/film/[id]` public không kèm story context.
- Không Discover card thiếu `storyTitle` / `storyHref`.
- API `POST /film` without `story_id` → `403` + `FILM_POLICY_REQUIRE_STORY_ID`.

### 4.3 Cấm liên kết chương

- Payload có `chapter_id` → `FILM_POLICY_CHAPTER_LEVEL_FORBIDDEN`.
- UI Studio không hiển thị picker chương.

---

## 5. Disclaimer sáng tạo

### 5.1 Loại quan hệ (`relation_type`)

| `relation_type` | Badge UI (gợi ý) | Ý nghĩa |
|-----------------|------------------|---------|
| `based_on_story` | **Dựa trên truyện** | Chuyển thể/sát nguồn hơn (default DB) |
| `inspired_by_story` | **Lấy cảm hứng từ truyện** | Sáng tạo tự do hơn |
| `official_adaptation` | Chuyển thể chính thức | Do creator/kênh chính thức |
| `fan_adaptation` | Fan-made | Không chính thức |
| `trailer` | Trailer | Teaser |
| `short_film` | Phim ngắn | |
| `animation` | Hoạt hình | |
| `cinematic_scene` | Cảnh điện ảnh | Clip/scene |

### 5.2 Copy mẫu (admin-configurable)

**Dựa trên truyện (template):**

> Video này được giới thiệu như bản chuyển thể/dựa trên truyện «{storyTitle}» trên ChapMee. Nội dung video do bên thứ ba đăng trên YouTube; có thể khác với bản text.

**Lấy cảm hứng (template):**

> Video này lấy cảm hứng từ truyện «{storyTitle}» trên ChapMee. Không phải bản chuyển thể chính thức từng chương. Nội dung video do bên thứ ba đăng trên YouTube.

Hiển thị trên: `FilmCard`, `StoryFilmSection`, modal xem phim (trên iframe).

### 5.3 Trách nhiệm creator

Studio form bắt buộc checkbox (khi `require_rights_declaration`):

- Creator xác nhận có quyền **giới thiệu** link YouTube (không claim ChapMee host video).
- Video không vi phạm điều khoản YouTube / bản quyền biết rõ.

---

## 6. YouTube safety rules

### 6.1 URL validation

- HTTPS only.
- Parse `v=`, `/embed/`, `/shorts/`, `youtu.be/{id}`.
- Video ID: 11 ký tự `[a-zA-Z0-9_-]`.
- Từ chối playlist-only URLs không resolve được single video.

### 6.2 Playback

- Embed domain: `www.youtube.com` only (không thay bằng custom player).
- Query params khuyến nghị: `rel=0`, `modestbranding=1`.
- **Không** `autoplay=1` mặc định trên mobile (policy `autoplay_film_embed_enabled: false`).
- Click-to-load iframe (khuyến nghị performance + consent).

### 6.3 Không bypass YouTube

| Hành vi | Trạng thái |
|---------|------------|
| Tải video về server ChapMee | **Cấm** |
| Stream qua MinIO | **Cấm** |
| Tách audio ra Audio Player | **Cấm** |
| Picture-in-Picture programmatic ChapMee | **Cấm** (browser PiP native OK) |
| Re-upload cùng video ID dưới tên khác để spam | Moderation + cap/story |

### 6.4 Link health

- Periodic check: video public / not removed (oEmbed or Google API — server cron).
- `broken` → ẩn khỏi Discover; story tab hiện “Video không khả dụng”.
- Admin broken-links page (mirror audio).

### 6.5 Channel governance (anti-aggregator)

Admin settings:

- `max_films_per_story` (default 5)
- `max_films_per_creator_per_day` (rate limit)
- `discover_films_max_daily_featured` (editorial cap)
- `blocklist_youtube_channel_ids`
- Không full-text search YouTube trong app — chỉ catalog đã duyệt

---

## 7. Content origin & rights

### 7.1 Story `content_origin`

| Origin | Publish film | Ads near player |
|--------|--------------|-----------------|
| `original` | Allowed (policy) | Usually off for YT embed |
| `translation` | Allowed; có thể cần `rights_status=verified` | Stricter |

Mirror logic `audio-ads-guard.ts`:

- `translated_story_film_ads_requires_verified_rights`
- Item-level `ads_policy: ads_disabled` respected

### 7.2 Film `rights_status`

Enum giống audio: `self_declared`, `verified`, `disputed`, `rejected`, `pending_review`.

Admin có thể `copyright_disputed` → auto-hide public.

### 7.3 Không monetization phim

- `film_must_be_free: true` (hardcode v1).
- UI: **không** hiển thị giá, coin, “Mở khóa”.
- Studio: **không** field monetization.

---

## 8. Admin policy controls

Tất cả threshold/toggle trong `film_adaptation_policy_settings` — **không hard-code** trong component.

### 8.1 Nhóm settings

Key: `film_adaptation_policy_settings` (Zod: `lib/settings/film-adaptation-settings.ts`).

1. **Feature flags** — `film_adaptations_enabled`, `show_in_discover_tab`
2. **Linkage** — `require_linked_story`, `allow_story_level_only`, `allow_chapter_level_linking` (must stay `false` in MVP)
3. **YouTube** — `film_adaptations_youtube_only`, `allow_youtube_video`, `allow_youtube_playlist`
4. **Moderation** — `default_film_status`, `require_admin_review_for_youtube`, `auto_publish_for_trusted_creators`
5. **Limits** — `max_films_per_story`
6. **Ads** — `film_ads_enabled`, `original_story_film_ads_allowed`, `youtube_embed_ads_on_film_pages_enabled`
7. **Copy** — `show_creative_disclaimer`, `creative_disclaimer_text`, `discover_tab_label`
8. **Safety** — `broken_youtube_check_enabled`, `hide_unavailable_films_automatically`

### 8.2 Admin UI

- `/admin/films/policy` — form Zod-validated (pattern `app/admin/audio/policy`)
- Changes → `logAdminAction('update_app_settings', { key: 'film_adaptation_policy_settings' })`

### 8.3 Moderation queue

| Filter | Use |
|--------|-----|
| `status=pending_review` | Review queue |
| `content_origin=translation` | Rights-sensitive |
| `rights_status=disputed` | Escalation |
| `broken=true` | Broken links |

Pagination: `page`, `pageSize` 10–100, component `AdminListPagination`.

---

## 9. Ads policy

### 9.1 Nguyên tắc

- YouTube embed pages: **mặc định không** ChapMee display ads **adjacent** to iframe (`youtube_ads_on_embed_pages_enabled: false`).
- Tránh “double monetization” perception và policy conflict với Google embed rules.
- Discover **list** cards (thumbnail only): có thể dùng `discover_films_in_feed` placement **giữa** hàng card, không phủ lên thumbnail/player.

### 9.2 Placements đề xuất

| Placement key | Vị trí | Default |
|---------------|--------|---------|
| `discover_films_in_feed` | Giữa pagination pages | off until stable |
| `story_films_section_bottom` | Dưới disclaimer, trên comments | off |
| `discover_in_feed_mobile` | Tab “Tất cả” only | existing |

### 9.3 Khi ads allowed

Chỉ khi:

- `films_enabled` && `original_story_film_ads_allowed` (hoặc translation verified)
- Item `ads_policy != ads_disabled`
- Không trong modal đang mở iframe (optional guard)

---

## 10. Creator Studio policy

1. Chọn truyện (context từ URL `/studio/stories/{id}/films`).
2. Nhập title + YouTube URL + inspiration type.
3. Validate URL (client preview + server authoritative).
4. Submit → `pending_review` unless trusted auto-publish.
5. Không upload file video.
6. Edit: không đổi `story_id` (immutable after create).
7. Delete: soft-hide `hidden` preferred; hard delete admin-only.

---

## 11. Discover policy

- Tab chỉ là **view** trong `/discover`, không mobile nav mới.
- Sort: `published_at DESC`, optional boost editorial (future).
- Search trong tab: theo film title + story title (không scrape YouTube).
- Empty state: “Chưa có phim chuyển thể” + CTA đọc truyện.

---

## 12. SEO & legal surfacing

- Trang Discover tab films: meta description nhấn mạnh “giới thiệu video YouTube liên kết truyện”.
- Không claim ChapMee sở hữu video.
- Footer link: bổ sung mục trong Content Policy (phase legal) — “Phim chuyển thể là liên kết YouTube…”

---

## 13. Risk register

| Risk | Mức | Mitigation |
|------|-----|------------|
| Vi phạm YouTube ToS (download/rehost) | Cao | Code review + no media pipeline + lint CI |
| ChapMee thành YouTube aggregator | Cao | Caps, moderation, no search API, story-only |
| Nhầm với Audio (background play) | Trung bình | Bảng riêng, UI iframe-only |
| Bản quyền phim lậu | Cao | Review queue, report, blocklist channels |
| User hiểu nhầm “phim chính thức” | Trung bình | Disclaimer bắt buộc, badge inspiration |
| Ads + embed conflict | Trung bình | Default ads off near iframe |
| Translation chưa verified | Trung bình | Policy gate publish/ads |
| Broken YouTube links | Thấp | Cron + auto-hide |
| SEO thin content | Thấp | Index chỉ khi có corpus; noindex empty tab |

---

## 14. Enforcement (runtime)

Policy engine throws stable codes:

- `FILM_POLICY_DISABLED`
- `FILM_POLICY_REQUIRE_STORY_ID`
- `FILM_POLICY_CHAPTER_LEVEL_FORBIDDEN`
- `FILM_POLICY_YOUTUBE_ONLY`
- `FILM_POLICY_YOUTUBE_URL_INVALID:{reason}`
- `FILM_POLICY_MUST_BE_FREE`
- `FILM_POLICY_MAX_FILMS_EXCEEDED`
- `FILM_POLICY_STORY_NOT_PUBLISHED`
- `FILM_POLICY_TRANSLATION_RIGHTS_UNVERIFIED`

Map codes → Vietnamese messages trong Studio/Admin.

---

## 15. Acceptance checklist (policy)

- [ ] Docs nêu rõ story-level only, no chapter
- [ ] Docs nêu rõ YouTube iframe only
- [ ] Docs nêu rõ no paid/coin/background
- [ ] Docs nêu rõ creative disclaimer
- [ ] Docs nêu rõ anti-aggregator controls
- [ ] Admin settings schema documented
- [ ] Ads defaults conservative near embed
