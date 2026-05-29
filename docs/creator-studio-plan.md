# Creator Studio — Kiến trúc & kế hoạch triển khai (lịch sử)

> **⚠️ Tài liệu lưu trữ.** Chuẩn hiện hành: **[chapmee-studio-plan.md](./chapmee-studio-plan.md)** — dùng tên **ChapMee Studio**, route **`/studio`**, UI **Studio / Tác giả** (không Creator Studio).

> **Phạm vi gốc:** Rà soát hiện trạng (tháng 5/2026), đề xuất kiến trúc trước khi hợp nhất `/creator` + `/studio`.  
> **Không bao gồm:** Triển khai editor mới, migration lớn, logic thanh toán mới trong prompt này.

---

## 1. Tóm tắt điều hành

ChapMee đang có **hai bề mặt creator song song**:

| Bề mặt | Base path | Vai trò hiện tại |
|--------|-----------|------------------|
| **Creator (legacy hub)** | `/creator` | Dashboard rộng: monetization, fan club, payout, thank-you, analytics; form truyện/chap đầy đủ tính năng (poll, paid chapter, early access). |
| **Studio (writing UX)** | `/studio` | Layout chuyên biệt (sidebar), tập trung viết/soạn; dùng chung server actions & validation với `/creator`; UI gọn hơn (chưa có poll/monetization trên editor chap). |

Luồng onboarding và `/me` **ưu tiên `/studio`** (`createCreatorProfile` redirect → `/studio`, `CreatorStudioEntry` → `/studio`). Header app vẫn trỏ **「Tác giả」→ `/creator`**.

**Kết luận kiến trúc:** Không rewrite app. Hợp nhất dần về **một namespace `/creator/*`** (hoặc alias `/studio` → `/creator` trong Phase 1), giữ route cũ bằng redirect 301/302 nội bộ. Studio layout + sidebar là nền UX đích; `/creator` dashboard thu gọn thành hub + monetization.

---

## 2. Rà soát route

### 2.1. Route đang tồn tại

#### `/creator` (không có `layout.tsx` riêng — dùng `AppShell` mặc định)

| Route | File | Trạng thái | Ghi chú |
|-------|------|------------|---------|
| `/creator` | `app/creator/page.tsx` | **Hoạt động** | Dashboard đầy đủ; một số section **placeholder** (drafts, create-story). UI lẫn EN/VI. |
| `/creator/setup` | `app/creator/setup/page.tsx` | **Hoạt động** | Tạo `creator_profiles`; xong → redirect `/studio`. |
| `/creator/status` | `app/creator/status/page.tsx` | **Hoạt động** | Trạng thái moderation/restriction. |
| `/creator/write` | `app/creator/write/page.tsx` | **Redirect** | → `/creator/stories/new` |
| `/creator/stories` | `app/creator/stories/page.tsx` | **Hoạt động** | Danh sách + filter status; UI một phần EN. |
| `/creator/stories/new` | `app/creator/stories/new/page.tsx` | **Hoạt động** | `StoryForm` + `createStoryAction`. |
| `/creator/stories/[storyId]/edit` | `app/creator/stories/[storyId]/edit/page.tsx` | **Hoạt động** | `StoryForm` + cover `StoryImageUploader`. |
| `/creator/stories/[storyId]/episodes` | `app/creator/stories/[storyId]/episodes/page.tsx` | **Hoạt động** | Quản lý chap (`EpisodeList`). |
| `/creator/stories/[storyId]/episodes/new` | `app/creator/stories/[storyId]/episodes/new/page.tsx` | **Hoạt động** | `EpisodeForm` (đầy đủ monetization/poll). |
| `/creator/stories/[storyId]/episodes/[episodeId]/edit` | `app/creator/stories/[storyId]/episodes/[episodeId]/edit/page.tsx` | **Hoạt động** | `EpisodeForm`. |
| `/creator/stories/[storyId]/episodes/[episodeId]/preview` | `app/creator/stories/.../preview/page.tsx` | **Hoạt động** | Preview reader (không tách swipe mode URL như studio). |
| `/creator/analytics` | `app/creator/analytics/page.tsx` | **Hoạt động** | Dùng `getCreatorAnalytics` + components analytics chung. |

#### `/studio` (có `app/studio/layout.tsx` + `StudioLayout`)

| Route | File | Trạng thái | Ghi chú |
|-------|------|------------|---------|
| `/studio` | `app/studio/page.tsx` | **Hoạt động** | `StudioOverview` — stats gọn, recent stories/episodes. |
| `/studio/stories` | `app/studio/stories/page.tsx` | **Hoạt động** | Bảng truyện (`StudioStoriesTable`). |
| `/studio/stories/new` | `app/studio/stories/new/page.tsx` | **Hoạt động** | `StudioStoryForm` (side panel). |
| `/studio/stories/[storyId]/edit` | `app/studio/stories/[storyId]/edit/page.tsx` | **Hoạt động** | `StudioStoryForm` + ảnh. |
| `/studio/stories/[storyId]/episodes` | `app/studio/stories/[storyId]/episodes/page.tsx` | **Hoạt động** | `StudioEpisodeTable`. |
| `/studio/stories/[storyId]/episodes/new` | `app/studio/stories/[storyId]/episodes/new/page.tsx` | **Hoạt động** | `StudioEpisodeEditor` (Textarea, checklist). |
| `/studio/stories/[storyId]/episodes/[episodeId]/edit` | `app/studio/stories/[storyId]/episodes/[episodeId]/edit/page.tsx` | **Hoạt động** | `StudioEpisodeEditor` + preview `?mode=reader\|swipe`. |
| `/studio/stories/.../preview` | `app/studio/stories/.../preview/page.tsx` | **Hoạt động** | `StudioEpisodePreview` / swipe panel. |
| `/studio/analytics` | `app/studio/analytics/page.tsx` | **Hoạt động** | **Trùng logic** với `/creator/analytics`. |
| `/studio/settings` | `app/studio/settings/page.tsx` | **Hoạt động** | Hồ sơ creator (`updateCreatorProfileAction`). |

#### Route liên quan khác

| Route | Trạng thái | Ghi chú |
|-------|------------|---------|
| `/write` | Redirect → `/creator/stories/new` | Entry viết nhanh. |
| `/me/creator` | **Hoạt động** | Mobile-oriented `CreatorDashboardClient`; không trùng `/creator` page. |
| `/creators/[creatorId]` | Public profile creator | Đọc, không phải studio. |
| `/tac-gia`, `/tac-gia/[username]` | Catalog tác giả | Đọc. |
| `/stories/[slug]`, `/stories/.../episodes/[episodeNumber]` | Reader công khai | Không dùng cho sửa. |
| `/admin/content/stories/[storyId]` | Moderation queue | Staff duyệt story/episodes. |
| `/api/story-images/upload`, `/regenerate` | API ảnh truyện | Revalidate cả `/creator` và `/studio` edit paths. |
| `/api/creator/finance/statement` | Sao kê creator | Monetization. |

### 2.2. Route user đề xuất — chưa có / khác tên

| Đề xuất | Hiện trạng | Đề xuất xử lý |
|---------|------------|----------------|
| `/me/stories` | Không có | Không cần; dùng `/creator/stories` hoặc alias từ `/me`. |
| `/stories/new`, `/stories/[slug]/edit` | Chỉ catalog reader | Creator dùng `/creator/stories/*` hoặc `/studio/stories/*`. |
| `/admin/stories` | `/admin/content/...` | Giữ admin path; không đổi. |
| `.../chapters/*` | Codebase dùng **`episodes`** (DB `episodes`, UI label "chap") | Route đích: alias `chapters` → `episodes` (optional) hoặc giữ `episodes` nội bộ, label UI「chương/chap」. |
| `/creator/calendar` | Không | Phase 1 — lịch đăng. |
| `/creator/drafts` | Placeholder trên `/creator` | Phase 1 — hub nháp. |
| `/creator/templates` | Không | Phase 2. |
| `/creator/comments` | Không | Phase 3 (community tools). |
| `/creator/monetization` | Rải trên `/creator` dashboard | Phase 3 tách module; hiện dùng cards + `/creator` hub. |
| `/creator/settings` | Chỉ `/studio/settings` | Phase 1 — redirect hoặc move settings. |

### 2.3. Route nên giữ / hợp nhất / đổi (không xóa đột ngột)

| Quyết định | Route |
|------------|-------|
| **Giữ (redirect)** | `/creator/*`, `/studio/*`, `/write`, `/creator/write` — thêm redirect dần `/studio` → `/creator` khi layout thống nhất. |
| **Hợp nhất UX** | `/creator` + `/studio` → một shell Creator Studio; monetization/comments tách tab. |
| **Canonical mới (đề xuất)** | `/creator` = dashboard; `/creator/stories/...` = quản lý nội dung; `/studio` alias tạm. |
| **Không đổi** | Reader routes, admin content queue, API ảnh. |

### 2.4. Mock / placeholder / lỗi tiềm ẩn

- **`/creator` sections `#drafts`, `#create-story`:** copy EN, chưa có danh sách draft thật — **mock UX**.
- **`SwipePreview` (creator):** preview tĩnh, không gắn `background_image_url` — **mock**.
- **Studio `StoryFormSidePanel` / `EpisodeWritingChecklist`:** một phần label EN ("Writing checklist", "Visibility").
- **Không có Rich Text Editor:** chap = `Textarea` thuần — không crash nhưng chưa「professional editor」.
- **Không có scheduled publish:** `published_at` set khi admin **approve** (`lib/admin/contentActions.ts`), creator chỉ `draft` → `pending`.
- **Hai analytics URL:** trùng data, dễ lệch nav nếu sửa một nơi.

---

## 3. Rà soát component

### 3.1. Có sẵn & tái sử dụng

| Component | Path | Tái sử dụng |
|-----------|------|-------------|
| `StoryForm` | `components/creator/stories/StoryForm.tsx` | Core form truyện; age rating, tags, draft/review intent, `StoryCoverField`. |
| `StudioStoryForm` | `components/studio/stories/StudioStoryForm.tsx` | Wrapper layout 2 cột + `StoryFormSidePanel`; **nên merge vào StoryForm** với prop `variant="studio"`. |
| `EpisodeForm` | `components/creator/episodes/EpisodeForm.tsx` | Editor chap đầy đủ: poll, monetization, early access, guidelines. |
| `StudioEpisodeEditor` | `components/studio/episodes/StudioEpisodeEditor.tsx` | Editor gọn + side panel; **chia sẻ body form với EpisodeForm**. |
| `StoryImageUploader` | `components/story/StoryImageUploader.tsx` | Upload + focal point; dùng qua `StoryCoverField`. |
| `CreatorDashboardClient` | `components/creator/CreatorDashboardClient.tsx` | `/me/creator`. |
| `CreatorQuickActions` | `components/creator/CreatorQuickActions.tsx` | CTA; hỗ trợ `basePath`. |
| `CreatorStoryList/Card/Filters` | `components/creator/stories/*` | Story manager. |
| `EpisodeList/Card` | `components/creator/episodes/*` | Chapter manager. |
| Analytics suite | `components/creator/analytics/*` | Dùng chung studio + creator. |
| `GuidelinesSubmitAcknowledgement` | `components/creator/GuidelinesSubmitAcknowledgement.tsx` | Bắt buộc khi gửi duyệt. |
| `StoryContentClassification` | `components/creator/StoryContentClassification.tsx` | Age rating + sensitive flags. |
| `ChapterMonetizationSettings`, `EarlyAccessSettings` | `components/creator/*` | Chỉ trên `/creator` episode form. |
| `PollEditor` | `components/polls/PollEditor.tsx` | Gắn episode (creator path). |
| `StudioLayout`, `StudioSidebar` | `components/studio/*` | Shell đích cho Creator Studio. |
| Preview | `ReaderPreview`, `SwipePreview`, studio preview panels | Mở rộng cho Swipe generator Phase 2. |

### 3.2. Không tồn tại (cần build mới)

| Tên trong brief | Hiện trạng |
|-----------------|------------|
| `StoryEditor` | Không — `StoryForm` đảm nhiệm metadata. |
| `ChapterEditor` | Không — `EpisodeForm` / `StudioEpisodeEditor`. |
| `RichTextEditor` | Không. |
| `DraftEditor` | Không — draft = `content_status` trên `stories`/`episodes`. |
| `SchedulePicker` | Không. |
| `SEOFields` | Một phần: `hook`, `short_description`, `long_description`, `slug` trong story form; chưa module SEO/meta OG riêng. |
| `SwipeGenerator` | Không — swipe feed build từ episode **đã publish** (`lib/swipe/getSwipeItems.ts`). |

### 3.3. Thư mục `components/editor/`

**Chưa có.** Editor chuyên nghiệp Phase 1 nên đặt tại `components/editor/` (TipTap/Novel hoặc markdown — quyết định prompt sau).

---

## 4. Database & schema

### 4.1. Bảng / enum liên quan creator (đã có)

| Bảng / khái niệm | Migration / ghi chú |
|------------------|---------------------|
| `profiles` | `001_initial_schema.sql` — `role` enum legacy + RBAC mới. |
| `creator_profiles` | `001`, unique `user_id` (`002`). |
| `stories` | Metadata truyện; `status` (`content_status`), `visibility`, `published_at`. |
| `episodes` | Chapters; `content`, `excerpt`, `word_count`, `status`, `published_at`. |
| `episodes.background_image_url` | `010_episode_background_image.sql` — swipe background. |
| `stories.age_rating`, `sensitive_flags` | `058_moderation_enforcement.sql`. |
| `story_tags`, `genres`, `tags` | Phân loại. |
| `story_images` | `070_story_images.sql` — variants + focal; thay/thu hẹp `cover_url`. |
| `polls`, `poll_options`, `poll_votes` | `016_polls.sql` — `chapter_id` → `episodes.id`. |
| `chapter_monetization_settings` | `032_paid_chapters_unlocks.sql`. |
| `chapter_early_access_settings` | `033_early_access.sql`. |
| `creator_monetization_profiles` | `030_creator_monetization_profiles.sql`. |
| `analytics_events` | `023` + RLS creator `006`. |
| `comments`, `reports`, `moderation_*` | Community/moderation. |
| `notifications` | `024`, preferences `025`. |

**Draft:** Không có bảng `drafts` riêng — draft = `status IN ('draft','pending')` trên `stories` / `episodes`.

**Scheduled posts:** Không có `scheduled_posts` — cần bảng mới (đề xuất §6).

**Swipe items:** Không có bảng `swipe_items` — feed query động từ episodes published + engagement.

**Creator stats:** Không có `creator_stats` — aggregate từ `analytics_events`, bookshelf, follows, comments.

**Chapter images:** Không có `chapter_images` — chỉ `background_image_url` trên episode + `story_images` cấp truyện.

### 4.2. Luồng trạng thái nội dung

```
Creator lưu:
  story:  intent draft → status draft | intent review → status pending
  episode: intent draft → draft | intent review → pending

Admin duyệt (lib/admin/contentActions.ts):
  pending → approved (+ published_at nếu chưa có)
  (published có thể là bước riêng tùy policy hiện tại)

Creator KHÔNG tự set published trực tiếp qua form (RLS + workflow).
```

### 4.3. Đề xuất bảng mới (chưa tạo — các prompt sau)

| Bảng | Mục đích |
|------|----------|
| `content_drafts` (optional) | Autosave snapshot JSON (story_id/episode_id, payload, version) nếu cần tách khỏi row chính. |
| `scheduled_publications` | `target_type`, `target_id`, `publish_at`, `status`, `created_by`. |
| `creator_templates` | `owner_id`, `type` (story_outline \| chapter \| swipe_card), `payload` jsonb. |
| `episode_content_blocks` (optional) | Swipe scenes / structured blocks nếu không chỉ markdown. |
| `creator_seo_suggestions` (optional cache) | Lưu gợi ý AI đã generate cho story. |

Ưu tiên Phase 1: **`scheduled_publications`** + autosave có thể dùng **cột `draft_payload jsonb`** trên `episodes` trước khi tách bảng.

---

## 5. Quyền & bảo mật

### 5.1. RBAC (`types/permissions.ts`, migration `052`)

Role **`creator`** nhận:

- `story.create`, `story.update.own`, `story.delete.own`, `story.publish.own`
- `chapter.create`, `chapter.update.own`, `chapter.delete.own`, `chapter.publish.own`
- `creator.dashboard.view.own`, `creator.revenue.view.own`, `creator.payout.request`

**`verified_creator`** thêm: `chapter.set_vip`, `creator.payout.view.own`

Server actions gọi `assertActionAccess(...)` — ví dụ `createStoryAction` → `story.create`, `updateEpisodeAction` → `chapter.update.own`.

### 5.2. Ownership

- `assertCreatorOwnsStory` / `assertCreatorOwnsEpisode` → `lib/auth/ownership.ts`
- RLS: creator chỉ sửa story/episode `draft` hoặc `pending` (`003`, `005`)

### 5.3. Studio access

- `getStudioAccess()` = login + có `creator_profiles` → else `/creator/setup`

---

## 6. Luồng tạo / sửa / xuất bản (hiện tại)

```mermaid
flowchart TD
  A[User đăng nhập] --> B{Có creator_profiles?}
  B -->|Không| C[/creator/setup]
  B -->|Có| D[/studio hoặc /creator]
  D --> E[Tạo story]
  E --> F{intent}
  F -->|draft| G[stories.status = draft]
  F -->|review| H[stories.status = pending]
  G --> I[Thêm episodes]
  H --> I
  I --> J[Lưu chap draft hoặc gửi pending]
  J --> K[Admin /admin/content]
  K --> L[approved + published_at]
  L --> M[Reader / Swipe feed]
```

**Ảnh truyện:** Sau khi có `story.id`, upload qua `StoryImageUploader` → API → `story_images` + cập nhật `cover_url`.

**Monetization chap:** Chỉ trên `EpisodeForm` (`/creator/.../edit`); lưu `chapter_monetization_settings`, `chapter_early_access_settings`.

---

## 7. Đề xuất routes (mục tiêu)

Namespace **`/creator`** là canonical. `/studio/*` giữ redirect tương thích.

| Route đích | Ghi chú |
|------------|---------|
| `/creator` | Dashboard: tổng quan, quick actions, link monetization. |
| `/creator/stories` | Story manager (merge UI studio table + creator filters). |
| `/creator/stories/new` | Tạo truyện. |
| `/creator/stories/[storyId]/edit` | Metadata + ảnh + SEO. |
| `/creator/stories/[storyId]/episodes` | Chapter manager (giữ tên `episodes` trong code). |
| `/creator/stories/[storyId]/episodes/new` | Viết chap mới. |
| `/creator/stories/[storyId]/episodes/[episodeId]/edit` | Editor chính. |
| `/creator/calendar` | Lịch scheduled (Phase 1). |
| `/creator/drafts` | Tất cả draft/pending (Phase 1). |
| `/creator/templates` | Phase 2. |
| `/creator/analytics` | Giữ; `/studio/analytics` → redirect. |
| `/creator/comments` | Moderation comment theo story (Phase 3). |
| `/creator/monetization` | Tách từ dashboard (Phase 3). |
| `/creator/settings` | Hợp nhất `/studio/settings` (Phase 1). |

**Alias tương thích:**

- `/studio` → `/creator` (sau khi có layout chung)
- `/write`, `/creator/write` → `/creator/stories/new`

---

## 8. Modules Creator Studio

| Module | Hiện trạng | Hướng triển khai |
|--------|------------|------------------|
| **Creator Dashboard** | `/creator` + `/studio` + `/me/creator` | Một dashboard; `/me/creator` embed hoặc deep-link. |
| **Story Manager** | Có | Table studio + filters creator. |
| **Chapter Manager** | Có (`episodes`) | Bulk actions, reorder (future). |
| **Draft System** | DB có `draft`; UI placeholder | `/creator/drafts` + autosave Phase 1. |
| **Schedule Publishing** | Không | `scheduled_publications` + calendar UI Phase 1. |
| **Professional Editor** | Textarea | `components/editor` Phase 1 basic (markdown/toolbar). |
| **Image Insert/Manager** | Story cover có; chap chưa chèn ảnh inline | Inline images Phase 1–2; episode background Phase 2 swipe. |
| **Template Library** | Không | Phase 2. |
| **SEO Assistant** | Fields thủ công | Auto-fill từ title/hook Phase 2. |
| **Swipe Content Generator** | Feed tự động từ excerpt | Editor tạo `background_image_url` + scene text Phase 2. |
| **Batch Import** | Không | Phase 2 (docx/txt). |
| **Analytics** | Có (`analytics_events`) | Giữ; thêm funnel Phase 3. |
| **Community Tools** | Thank-you, fan club trên `/creator` | Comments hub Phase 3. |
| **Monetization Settings** | Rải rác | `/creator/monetization` Phase 3. |
| **Publishing Checklist** | `EpisodeWritingChecklist` studio | Mở rộng checklist + pre-flight trước gửi duyệt. |

---

## 9. MVP theo phase

### Phase 1 — Nền tảng sáng tác (ưu tiên cao)

1. **Shell thống nhất:** `app/creator/layout.tsx` dùng `StudioLayout`; redirect `/studio` → `/creator`.
2. **Dashboard** gọn (stats + recent + quick actions); monetization → tab/link riêng (không xóa logic).
3. **Story/chapter manager** — một UI list (studio table).
4. **Draft hub** `/creator/drafts` — query `stories`/`episodes` status draft|pending.
5. **Autosave** — debounce save `episodes.content` (draft only) hoặc `draft_payload`.
6. **Schedule publishing** — bảng + `/creator/calendar`; cron/job publish (hoặc admin auto-approve rule sau).
7. **Editor cơ bản** — markdown toolbar hoặc TipTap minimal; vẫn lưu `content` text/html thống nhất.
8. **Settings** `/creator/settings` ← move từ studio.
9. **Việt hóa** — loại bỏ copy EN trên creator/studio surfaces.

**Không làm Phase 1:** payment mới, rewrite reader, xóa `/creator` monetization cards (chỉ di chuyển).

### Phase 2 — Năng suất

- Template library (`creator_templates`)
- SEO assistant (generate slug, meta description, OG từ hook)
- Swipe generator (preview + `background_image_url` workflow)
- Batch import chapters
- Inline image trong chap
- Gộp `EpisodeForm` + `StudioEpisodeEditor` (feature parity: poll, monetization trên studio path)

### Phase 3 — Tăng trưởng & cộng đồng

- Analytics nâng cao (cohort, retention theo chap)
- `/creator/monetization` hub
- Community tools (comment moderation, announcements per story)
- Collaboration / co-author (bảng `story_collaborators` — chưa có)

---

## 10. Cấu trúc file đề xuất (incremental)

```
app/creator/
  layout.tsx              # NEW — StudioLayout
  page.tsx                # Thu gọn dashboard
  drafts/page.tsx         # Phase 1
  calendar/page.tsx       # Phase 1
  settings/page.tsx       # Move from studio
  stories/...             # Giữ paths hiện tại

app/studio/               # Giữ — mỗi page redirect sang /creator tương ứng

components/editor/        # Phase 1
  ChapterEditor.tsx       # Wrap EpisodeForm body + rich text

lib/creator/
  autosave.ts             # Phase 1
  schedule.ts             # Phase 1
  templates.ts            # Phase 2
  seo-assistant.ts        # Phase 2
  swipe-generator.ts      # Phase 2

types/creator.ts          # Dashboard, draft, schedule types (NEW)
```

**Server actions:** Tiếp tục `lib/creator/createStory.ts`, `updateEpisode.ts`, v.v. — tránh duplicate `lib/studio` trừ `updateCreatorProfile` (merge vào `lib/creator`).

---

## 11. Swipe & ảnh (liên kết `docs/image-system.md`)

- **Swipe feed:** `lib/swipe/getSwipeItems.ts` — published episodes, excerpt, `background_image_url`, story cover variants.
- **Creator responsibility Phase 2:** UI gợi ý đoạn「scene」ngắn + upload background 9:16 cho chap.
- **Story images:** Đã chuẩn hóa `story_images`; creator edit dùng `StoryImageUploader`.

---

## 12. Rủi ro & ràng buộc

| Rủi ro | Giảm thiểu |
|--------|------------|
| Hai route gây lệch tính năng | Feature matrix: mọi tính năng chap phải có trên canonical editor. |
| Đổi `episodes` → `chapters` URL | Chỉ alias Next.js, DB giữ `episodes`. |
| Autosave ghi đè pending | Chỉ autosave khi `status = draft`. |
| Schedule vs moderation | Scheduled chỉ apply khi đã approved hoặc kèm auto-approve policy rõ. |
| UI tiếng Anh | Checklist i18n pass trước ship Phase 1. |

---

## 13. Checklist validation (prompt này)

- [x] Rà soát route `/creator`, `/studio`, liên quan
- [x] Rà soát component & lib
- [x] Rà soát schema Supabase
- [x] Tài liệu `docs/creator-studio-plan.md`
- [ ] Chạy manual: `npm run dev` → mở `/creator`, `/studio`, `/creator/stories/new` với tài khoản creator (khuyến nghị trước prompt implement)

**Lệnh gợi ý:**

```bash
npm run dev
# Đăng nhập creator → thử:
# /creator, /creator/stories, /creator/stories/new
# /studio, /studio/stories/new
# /creator/setup (user chưa có profile)
```

---

## 14. Prompt tiếp theo (gợi ý thứ tự)

1. `creator/layout.tsx` + redirect `/studio` + Việt hóa copy.
2. `/creator/drafts` + autosave episode.
3. `scheduled_publications` migration nhỏ + `/creator/calendar`.
4. `components/editor/ChapterEditor` Phase 1.
5. Feature parity monetization/poll trên editor canonical.

---

*Tài liệu sinh từ rà soát codebase ChapMee — không thay đổi runtime.*
