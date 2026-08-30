# STORY CATALOG AUDIT PLAN — `/truyen`

> **Ngày audit:** 2026-06-03  
> **Phạm vi:** Route `/truyen`, data/service, filter/sort/search, query params, pagination, story card, cover 3:4, sidebar filter, mobile, SEO heading, cleanup.  
> **Trạng thái:** Audit hoàn tất — **chưa triển khai UI refactor lớn** (chỉ tài liệu + xác nhận build).

---

## 1. Tóm tắt

Trang `/truyen` đã có **kiến trúc catalog khá đầy đủ**: server component fetch qua service layer, filter đọc/ghi URL, phân trang server-side (không infinite scroll), layout desktop/mobile tách riêng, card dùng `ChapMeeStoryCover` 3:4.

Tuy nhiên còn **lệch so với spec mục tiêu** ở:

| Hạng mục | Hiện trạng | Mục tiêu |
|----------|------------|----------|
| Query params | Tên param cũ (`contentOrigin`, `experience`, `presentation`, `hasAudio=yes`) | Chuẩn mới (`origin`, `mood`, `format`, `hasAudio=true`, …) |
| Page size mặc định | 20 mobile / 40 desktop | 24 (tuỳ chọn 24/48) |
| Sort `updated` | Order theo `published_at` | Order theo `updated_at` |
| Summary phân trang | Chỉ “N truyện phù hợp” + “Trang X/Y” | “Hiển thị X–Y trong Z truyện” |
| Cover ảnh thật | Query catalog **không join `current_image`** → hay fallback chữ cái | Portrait variant qua image system |
| `hasVideo` | Chưa có | Filter theo film adaptation |
| SEO metadata | Title/description chưa đúng spec | Theo acceptance criteria |
| Code thừa | `StoryGridCard`, `StoryRowCard` không được import | Xóa hoặc gộp |

**Build:** `npm run build` pass (2026-06-03). `pnpm` không có trong PATH shell hiện tại; script build tương đương qua npm.

---

## 2. Files đã audit

### Route & metadata

| File | Vai trò |
|------|---------|
| `app/truyen/page.tsx` | Entry SSR, parse `searchParams`, gọi service, metadata |
| `app/truyen/loading.tsx` | Skeleton `TruyenPageSkeleton` |
| `app/truyen-dich/page.tsx` | Catalog con — force `contentOrigin=translation` |
| `app/truyen-sang-tac/page.tsx` | Catalog con — force `contentOrigin=original` |

### UI catalog (shared)

| File | Vai trò |
|------|---------|
| `components/stories/StoryCatalogPage.tsx` | Wrapper mobile + desktop + analytics tracker |
| `components/stories/DesktopStoryCatalogLayout.tsx` | Layout desktop: h1, filters, rail, grid, pagination |
| `components/stories/MobileStoryCatalogLayout.tsx` | Layout mobile: h1, filters, list, pagination |
| `components/stories/StoryCatalogFilters.tsx` | Search form, sort, genre chips, mở filter sheet |
| `components/stories/StoryFilterSheet.tsx` | Panel lọc nâng cao (portal/modal) |
| `components/stories/CatalogDesktopFilterRail.tsx` | Sidebar trái sticky (experience/setting/tag/presentation) |
| `components/stories/CatalogActiveFilterChips.tsx` | Chip lọc đang active + reset |
| `components/stories/StorySortControl.tsx` | `<select>` sort → `router.push(buildCatalogHref(...))` |
| `components/stories/StoryPageSizeSelector.tsx` | Chọn 20/40/60 → URL |
| `components/stories/StoryPagination.tsx` | Phân trang link-based (desktop đầy đủ, mobile gọn) |
| `components/stories/StoryCatalogSummary.tsx` | Text count + trang hiện tại |
| `components/stories/StoryCatalogGrid.tsx` | Grid desktop |
| `components/stories/StoryCatalogList.tsx` | List mobile |
| `components/stories/DesktopStoryGridCard.tsx` | Card grid desktop (ChapMeeCover 3:4) |
| `components/stories/MobileStoryListItem.tsx` | Row card mobile (ChapMeeCover 3:4) |

### Card / cover (legacy & thừa)

| File | Vai trò | Ghi chú |
|------|---------|---------|
| `components/common/ChapMeeCover.tsx` | Cover 3:4 chung + `ChapMeeStoryCover` | **Giữ — canonical** |
| `components/stories/StoryGridCard.tsx` | Card cũ dùng `StoryImageView` | **Không được import** |
| `components/stories/StoryRowCard.tsx` | Row card cũ | **Không được import** |
| `components/stories/StoryCover.tsx` | Cover detail/hero | Không dùng trên `/truyen` |

### Data & URL layer

| File | Vai trò |
|------|---------|
| `lib/stories/getPublicStoriesCatalogCached.ts` | Cache wrapper → `getStoryCatalogPage` |
| `lib/stories/get-story-catalog-page.ts` | Unified page service + audio enrich |
| `lib/stories/get-public-stories.ts` | Core catalog query, sort branches, eligibility cơ bản |
| `lib/stories/map-catalog-page-result.ts` | Map `PaginatedResult` → props UI legacy |
| `lib/stories/story-catalog-query.ts` | Select projection, clamp page/size, pagination helpers |
| `lib/stories/story-card-projection.ts` | Projection nhẹ (có `updated_at`, chưa dùng đủ ở catalog select) |
| `lib/stories/resolve-story-cover-url.ts` | Resolve `cover_url` legacy |
| `lib/stories/catalog-url.ts` | Re-export + `hasAdvancedCatalogFilters`, `getGenreDisplayName` |
| `lib/discovery/catalog-url.ts` | **Canonical** `parseCatalogSearchParams`, `buildCatalogHref` |
| `lib/discovery/types.ts` | `StoryCatalogFilterParams`, filter options types |
| `lib/discovery/resolve-catalog-story-ids.ts` | Pre-filter taxonomy/monetization/audio/origin |
| `lib/discovery/catalog-filter-options-cached.ts` | Facet options cho UI |
| `lib/discovery/catalog-metrics.ts` | Candidate IDs (limit 5000), save/chapter counts |
| `lib/discovery/enrich-catalog-stories.ts` | Gắn `href` |
| `lib/discovery/catalog-active-filters.ts` | Build chip labels + clear href |
| `lib/shared/pagination.ts` | Page sizes 20/40/60, `buildPaginatedResult` |
| `lib/images/cover-sizes.ts` | `aspect-[3/4]` |
| `lib/images/story-image-usage.ts` | `catalogGrid` → portrait, `catalogRow` → thumb |
| `lib/images/get-story-image.ts` | Variant resolution + placeholder |
| `types/story.ts` | `StoryCatalogSort`, `StoryCatalogStory` |

### Files spec đề xuất nhưng **chưa tồn tại**

| File đề xuất | Thay thế hiện tại |
|--------------|------------------|
| `lib/story/story-service.ts` | `lib/stories/get-story-catalog-page.ts` + `get-public-stories.ts` |
| `lib/story/story-filters.ts` | `lib/discovery/catalog-url.ts` + `resolve-catalog-story-ids.ts` |
| `lib/story/story-origin.ts` | Inline trong `get-public-stories.ts` (`content_origin` mapping) — **cần tạo mới** |
| `lib/story/story-status.ts` | `normalizeStatus` trong `get-public-stories.ts` |
| `components/story-catalog/*` | `components/stories/*` |
| `components/story/StoryCard.tsx` | `DesktopStoryGridCard` + `MobileStoryListItem` |

### Tài liệu liên quan

- `docs/catalog-performance.md` — kiến trúc performance, migrations 178–180, metric views

---

## 3. Luồng data hiện tại

```
app/truyen/page.tsx
  ├─ parseCatalogSearchParams(searchParams)     // lib/discovery/catalog-url.ts
  ├─ clampPage / resolveCatalogPageSize         // UA-based 20 vs 40 nếu không có pageSize
  ├─ getPublicStoriesCatalogCached(filters)     // lib/stories/getPublicStoriesCatalogCached.ts
  │    └─ getStoryCatalogPage()
  │         └─ getPublicStoriesCatalog()        // lib/stories/get-public-stories.ts
  │              ├─ resolvePublicCatalogStoryIds() // taxonomy / access / audio / origin
  │              ├─ branch sort:
  │              │    q → searchStoriesForCatalog (RPC)
  │              │    quick → load candidates + filter + slice
  │              │    hot/reads → ranking scores + filter + slice / metric view
  │              │    saved/chapters/price_* → metric maps + slice
  │              │    updated/new/completed/title → DB range query
  │              └─ hydrate CATALOG_STORY_SELECT + taxonomy + enrich href
  ├─ getCatalogFilterOptionsCached()
  └─ StoryCatalogPage → Desktop + Mobile layouts
```

**Data source:** PostgreSQL qua Supabase public client (`createPublicClient()`). **Không thêm Supabase mới** — chỉ dùng client hiện có.

**Cache:** `revalidate = 60` trên page; service có cache key string (tag `story-catalog` qua `invalidateStoryCatalogCache`).

---

## 4. Filter hiện tại

### Query params đang parse (`lib/discovery/catalog-url.ts`)

| Param hiện tại | Ý nghĩa | Service xử lý |
|----------------|---------|---------------|
| `q` | Full-text / ilike search | `searchStoriesForCatalog` hoặc ilike trên title/hook/description |
| `genre` | Main genre slug | Taxonomy RPC + post-filter |
| `subgenre` | Subgenre slug | Taxonomy |
| `tag` | Trope tag | Taxonomy |
| `character` | Character tag | Taxonomy |
| `relationship` | Relationship tag | Taxonomy |
| `narrativeStyle` | Narrative style | Taxonomy |
| `setting` | Setting tag | Taxonomy |
| `experience` | Reader experience (“mood”) | Taxonomy + desktop rail |
| `presentation` | Presentation mode (“format”) | Taxonomy + `story_presentation_settings` |
| `contentType` | Content type taxonomy | Taxonomy |
| `ageRating` | Age rating | Taxonomy |
| `monetization` | Monetization access taxonomy | Taxonomy |
| `contentWarning` | Content warning taxonomy | Taxonomy |
| `storyStatus` | Story status taxonomy (≠ ongoing/completed) | Taxonomy |
| `contentOrigin` | `original` \| `translation` | DB `stories.content_origin` |
| `access` | `free` \| `paid` \| `free_chapters` \| `full_access` | Monetization join |
| `hasWarning` | `yes` \| `no` | Taxonomy content_warning |
| `hasNewChapter` | `yes` \| `no` | Episodes trong 14 ngày |
| `hasAudio` | `yes` \| `no` | `getStoryIdsWithPublishedAudio()` |
| `status` | `all` \| `ongoing` \| `completed` | `is_completed` |
| `sort` | Xem mục 5 | Nhiều nhánh |
| `page` | Số trang | Server pagination |
| `pageSize` | 20 / 40 / 60 | Clamp qua `CATALOG_PAGE_SIZES` |

### Filter UI

- **Top bar:** search GET form → `/truyen`, genre chips, chip “Có audio”, sort select, nút “Bộ lọc”.
- **Sheet:** toàn bộ taxonomy + status + access + contentOrigin + hasAudio/hasNewChapter/hasWarning.
- **Desktop rail:** subset (experience, setting, tag, presentation) — sticky, `max-h` + `overflow-y-auto` (scroll riêng, UX thô theo feedback).
- **Reset:** `StoryFilterSheet.clearFilters()` → `/truyen` hoặc `/truyen?q=...`; chips “Xóa tất cả lọc” trong `CatalogActiveFilterChips`.

**URL-driven:** Sort/pageSize dùng `router.push(buildCatalogHref(...))`. Search form dùng native GET (không mất filter nếu hidden inputs — **hiện không có hidden inputs**, chỉ submit `q` → **mất filter khi search bằng Enter** nếu không patch form).

---

## 5. Sort hiện tại

### Giá trị `StoryCatalogSort` (`types/story.ts`)

| URL `sort` | Label UI | Implementation |
|------------|----------|----------------|
| `updated` (default) | Mới cập nhật | `getCatalogByDateSort` — **order `published_at` DESC** ⚠️ |
| `new` | Mới đăng | `published_at` DESC |
| `hot` | Đang lên | Ranking scores 7d / metric view `hot` |
| `reads` | Đọc nhiều | Ranking scores / reads metric |
| `saved` | Được lưu nhiều | Save count map / metric view |
| `chapters` | Nhiều chương | Episode count |
| `completed` | Hoàn thành gần đây | `is_completed` + `published_at` |
| `title` | Tên A–Z | `title` ASC |
| `quick` | Đọc nhanh | Filter hook ngắn / genre `truyen-ngan` + slice |
| `price_asc` / `price_desc` | Giá trọn bộ | Monetization prices |
| `chapter_price_*` | Giá chương | Min paid chapter price |

### Mapping sang spec mục tiêu (đề xuất)

| Spec mới | Map từ hiện tại |
|----------|-----------------|
| `updated` | Fix backend → `updated_at` (giữ alias cũ) |
| `newest` | `new` |
| `popular` | `reads` |
| `saved` | `saved` |
| `recommended` | `saved` hoặc `hot` (cần product decision) |
| `completed` | `completed` |
| `rising` | `hot` |

**Phase 1:** parse alias mới + emit URL mới trong `buildCatalogHref`. **Phase 2:** deprecate tên cũ (redirect 301 optional).

---

## 6. Pagination hiện tại

| Khía cạnh | Hiện trạng |
|-----------|------------|
| Loại | Server-side / service-level — **không infinite scroll** ✓ |
| Default size | **20** (mobile UA) / **40** (desktop UA) nếu không có `pageSize` |
| Tuỳ chọn UI | 20, 40, 60 (`StoryPageSizeSelector`) |
| Hiển thị | `StoryPagination` — link `/truyen?...&page=N` ✓ |
| Summary | `StoryCatalogSummary` — **thiếu** “Hiển thị X–Y trong Z truyện” |
| Ẩn pagination | `totalPages <= 1` → return null (kể cả khi có pageSize selector trên desktop) |

### Nhánh sort có rủi ro scale

- `loadPublicCatalogCandidateIds` + `filterRankedStoryIds`: load tới **5000** IDs, filter chunk 500, **slice in-memory** cho hot/reads/quick/saved khi không dùng metric view.
- `getStoryRankingScores("7d", 2000)` gọi **mỗi request catalog** (kể cả date sort) — overhead không cần thiết cho `updated`/`new`.
- `getCatalogByDateSort` dùng `.range(offset, to)` + `count: exact` — **đúng hướng** cho catalog lớn.

---

## 7. Data eligibility

### Đang lọc

```ts
// applyBaseStoryFilters (get-public-stories.ts)
visibility = 'public'
status IN ('published', 'approved')
// + optional is_completed, content_origin, story id sets
```

### Chưa lọc đồng nhất

| Rule | Hiện trạng |
|------|------------|
| Draft | Loại qua `status` — OK nếu draft không thuộc published/approved |
| Hidden visibility | `visibility = public` — OK |
| Rejected | Không nằm trong `publicContentStatuses` — OK |
| Deleted | Phụ thuộc DB (soft delete column nếu có) — **chưa thấy explicit filter** |
| Low quality hidden | `quality_status != permanently_hidden` trong `loadPublicCatalogCandidateIds` và taxonomy joins — **thiếu** trong `applyBaseStoryFilters` / `getCatalogByDateSort` ⚠️ |

### Story origin

- DB: `content_origin` → `"original"` | `"translation"`.
- Map trong `mapStoryRow`: non-translation → `"original"`.
- URL: `contentOrigin=original|translation` (không phải `origin=translated`).
- Trang con: `/truyen-dich`, `/truyen-sang-tac` inject origin server-side.

**Đề xuất:** tạo `lib/stories/story-origin.ts`:

```ts
export type StoryOriginFilter = "all" | "original" | "translated";
export function parseOriginParam(raw?: string): StoryOriginFilter;
export function toDbContentOrigin(origin: StoryOriginFilter): "original" | "translation" | undefined;
export function toOriginQueryValue(db: string | null): "original" | "translated";
```

---

## 8. Story card & cover 3:4

### Đang dùng trên `/truyen`

- Desktop: `DesktopStoryGridCard` → `ChapMeeStoryCover` `usage="catalogGrid"` → variant **portrait**, `aspect-[3/4]`, `size="full"`.
- Mobile: `MobileStoryListItem` → `usage="catalogRow"` → variant **thumb** (vẫn 3:4 box).

### Vì sao vẫn giống placeholder chữ cái

1. **`CATALOG_STORY_SELECT` không select `current_image` / story_images join** — chỉ `cover_url`.
2. Nhiều truyện mới dùng image system (`currentImage`) mà `cover_url` rỗng → `getStoryImageForUsage` → placeholder gradient + initial.
3. Catalog row dùng **thumb** thay vì portrait — ảnh nhỏ, dễ cảm giác “thumbnail generic”.

### Kế hoạch cover

| Bước | Việc làm |
|------|----------|
| 1 | Mở rộng select hydrate: join lightweight `current_image` (id, variants JSON) hoặc dùng `STORY_CARD_LIST_SELECT` pattern |
| 2 | Map vào `StoryCatalogStory.currentImage` trước khi render |
| 3 | `catalogGrid` giữ portrait; cân nhắc `catalogRow` → portrait với `size="sm"` thay thumb |
| 4 | Không dùng `landscape` cho card catalog (chỉ reels) |
| 5 | Card UX phase 2: hover subtle scale, progress badge, chapter count, “mới cập nhật” — **sau** khi ảnh ổn |

---

## 9. SEO & heading

### `/truyen` hiện tại

| Item | Hiện tại | Spec |
|------|----------|------|
| h1 | “Danh mục truyện” (desktop + mobile layout) ✓ một h1/page | ✓ |
| Section rail | h2 “Cảm giác đọc”, … ✓ | ✓ |
| Card title | h3 ✓ | ✓ |
| metadata.title | “Danh mục truyện ChapMee” | “Danh mục truyện \| ChapMee” |
| metadata.description | Mô tả generic khác spec | Theo spec prompt |
| Deep filter indexing | `robots: noindex` khi deep filters ✓ | Giữ |
| canonical | `/truyen` ✓ | Giữ |

### Vấn đề trên trang con

- `/truyen-dich`, `/truyen-sang-tac`: page có **h1 riêng** + `StoryCatalogPage` vẫn render h1 “Danh mục truyện” → **2 h1** ⚠️  
  Fix: truyền `hideCatalogHeader` hoặc `title` custom + suppress default h1.

---

## 10. Mobile responsive

- `StoryCatalogPage` render **cả hai** layout; CSS `lg:hidden` / `hidden lg:block` — pattern ổn.
- Filter sheet full-width mobile, desktop centered modal — OK functionally.
- Pagination mobile: prev/next + số trang compact — OK.
- Grid desktop 2→3→4 cột; card `flex-col` với cover full width — cân đối tạm ổn nhưng card chưa “premium”.

---

## 11. Lỗi / gap UI & logic

### Logic

1. **`sort=updated` không dùng `updated_at`** — lệch label “Mới cập nhật”.
2. **Search form GET chỉ gửi `q`** — reset mất filter/sort (bug share link).
3. **`quality_status` không filter ở date-sort path** — có thể lộ story permanently hidden.
4. **`hasVideo` chưa implement** — bảng `story_film_adaptations` đã có (film feature).
5. **Ranking scores fetch mọi request** — performance thừa.
6. **Metric/quick sort slice in-memory** trên tập 5000 IDs — chấp nhận tạm nhưng không scale vô hạn.
7. **Default page size UA-dependent** — URL share khác kết quả mobile/desktop nếu không có `pageSize`.

### UI

1. Filter rail sticky + scroll riêng — chiếm width, visual nặng.
2. `StoryCatalogSummary` thiếu range text bắt buộc.
3. Pagination ẩn khi 1 trang — desktop vẫn có page size selector nhưng nav null.
4. Placeholder cover dominant — xem mục 8.
5. Genre chip + rail + sheet **trùng facet** — cognitive load cao.

### Duplicate / dead code

| File | Trạng thái |
|------|------------|
| `components/stories/StoryGridCard.tsx` | Dead — 0 imports |
| `components/stories/StoryRowCard.tsx` | Dead — 0 imports |
| `lib/stories/catalog-url.ts` | Thin re-export — OK giữ |
| `lib/discovery/catalog-url.ts` vs imports rải rác | Consolidate import path khi refactor |

---

## 12. Kế hoạch query params chuẩn

### Target schema

```
/truyen?q=&origin=all|original|translated&genre=&category=&tag=&mood=&format=
&status=all|ongoing|completed&hasAudio=true|false&hasVideo=true|false
&sort=updated|newest|popular|saved|recommended|completed|rising&page=1&pageSize=24
```

### Migration plan (backward compatible)

**File trung tâm:** mở rộng `lib/discovery/catalog-url.ts` (+ optional `lib/stories/story-filters.ts` wrapper).

| Phase | Việc |
|-------|------|
| A | `parseCatalogSearchParams`: đọc param mới **và** alias cũ (`contentOrigin` → `origin`, `experience` → `mood`, `presentation` → `format`, `subgenre` → `category`, `hasAudio=yes` → `true`) |
| B | `buildCatalogHref`: **chỉ emit param mới** (clean share URL) |
| C | Map sort aliases (`newest`↔`new`, `popular`↔`reads`, `rising`↔`hot`) |
| D | Default `pageSize=24`; allowed `[24, 48]` — cập nhật `lib/shared/pagination.ts` + selector UI |
| E | Bỏ UA-based default page size trong `app/truyen/page.tsx` — luôn 24 unless query |
| F | Search form: hidden fields hoặc chuyển sang `router.push(buildCatalogHref({...filters, q}))` client-side |

### Rules

- Single source of truth: URL.
- Reset: `buildCatalogHref({})` hoặc giữ `q` only.
- Sub-routes `/truyen-dich`, `/truyen-sang-tac`: có thể giữ path-based origin **hoặc** redirect về `/truyen?origin=translated` (product decision — không bắt buộc phase 1).

---

## 13. Kế hoạch pagination

1. **Default `pageSize = 24`**; selector **24 / 48** (giữ max 100 guard server-side).
2. **`StoryCatalogSummary`**:  
   `Hiển thị {(page-1)*pageSize+1}–{min(page*pageSize, totalCount)} trong {totalCount} truyện`
3. Hiển thị summary **trên và dưới** list (ít nhất dưới — đã có; thêm trên optional).
4. Luôn show page size selector; show page nav khi `totalPages > 1` hoặc `totalCount > pageSize`.
5. Ưu tiên metric view / DB pagination cho sort phổ biến — giảm in-memory slice (đã có `story_catalog_metrics` — xem `docs/catalog-performance.md`).

---

## 14. Kế hoạch refactor (phased)

### Phase 0 — Audit (done)

- Tài liệu này.
- Build verify.

### Phase 1 — Param & service (low UI risk)

- [ ] `lib/stories/story-origin.ts`
- [ ] Extend parse/build catalog URL + sort aliases
- [ ] Fix `updated` sort → `updated_at`
- [ ] Add `quality_status` to `applyBaseStoryFilters`
- [ ] Default pageSize 24; remove UA split
- [ ] Fix search form filter preservation
- [ ] Metadata `/truyen` theo spec
- [ ] `StoryCatalogSummary` range text
- [ ] Hydrate `currentImage` in catalog select

### Phase 2 — Filter UX

- [ ] Gộp rail + sheet — rail compact hoặc collapsible sections
- [ ] `hasVideo` filter via film adaptations
- [ ] Reset filter button rõ ràng trên desktop
- [ ] Fix double h1 on `/truyen-dich`, `/truyen-sang-tac`

### Phase 3 — Card polish

- [ ] Unified `StoryCatalogCard` (desktop grid + mobile row props)
- [ ] Visual hierarchy: cover lớn hơn, meta gọn, CTA rõ
- [ ] Xóa dead components

### Phase 4 — Cleanup

- [ ] Xóa `StoryGridCard`, `StoryRowCard` sau confirm không dùng taxonomy landing
- [ ] Consolidate imports → `@/lib/discovery/catalog-url`
- [ ] Optional rename folder `components/stories` → `components/story-catalog` (chỉ khi team muốn — **không bắt buộc**)

---

## 15. Component: giữ / xóa / tạo mới

### Giữ (core)

- `StoryCatalogPage`, `DesktopStoryCatalogLayout`, `MobileStoryCatalogLayout`
- `StoryCatalogFilters`, `StoryFilterSheet`, `CatalogActiveFilterChips`
- `StorySortControl`, `StoryPagination`, `StoryPageSizeSelector`
- `StoryCatalogGrid`, `StoryCatalogList`
- `DesktopStoryGridCard`, `MobileStoryListItem`
- `ChapMeeCover` / `ChapMeeStoryCover`
- `get-story-catalog-page`, `get-public-stories`, `catalog-url`, `resolve-catalog-story-ids`

### Xóa (sau verify grep toàn repo)

- `components/stories/StoryGridCard.tsx`
- `components/stories/StoryRowCard.tsx`

### Tạo mới (đề xuất)

- `lib/stories/story-origin.ts`
- `lib/stories/story-catalog-params.ts` (optional — tách parse/normalize khỏi discovery)
- `lib/stories/story-status.ts` (optional — normalize status)
- `components/story-catalog/StoryCatalogCard.tsx` (phase 3 — gộp desktop/mobile)

### Giữ nhưng refactor

- `CatalogDesktopFilterRail` — UX polish, không scroll aggressive
- `StoryCatalogSummary` — thêm range + optional page size mobile

---

## 16. Rủi ro build

| Rủi ro | Mức | Ghi chú |
|--------|-----|---------|
| Đổi tên query params | Trung bình | Cần alias đọc URL cũ; sitemap/SEO links ngoài app |
| Đổi page size default | Thấp | Ảnh hưởng cache key + UX |
| Join `current_image` | Trung bình | Tăng payload select; test query timeout |
| Xóa dead components | Thấp | Grep trước khi xóa |
| Fix `updated_at` sort | Thấp | Cần index `updated_at` (đã có trong perf doc) |
| `hasVideo` filter | Trung bình | Join film table + index |
| Double h1 sub-pages | Thấp | Prop-only fix |

**Validation đã chạy:** `npm run build` — pass (Next.js 16.2.6).

---

## 17. Recommended next changes (ưu tiên)

1. **Fix cover hydrate** — impact cao nhất lên “muốn bấm đọc”.
2. **Query param migration + search form** — share link & SEO.
3. **`updated_at` sort + quality filter** — correctness.
4. **Summary “Hiển thị X–Y trong Z” + pageSize 24/48**.
5. **Remove dead cards + double h1 sub-routes**.
6. **Filter rail UX** — phase 2.

---

## 18. Acceptance checklist (prompt)

| # | Tiêu chí | Trạng thái |
|---|----------|------------|
| 1 | `docs/STORY_CATALOG_AUDIT_PLAN.md` | ✅ |
| 2 | Xác định data/filter/sort/pagination | ✅ |
| 3 | Kế hoạch query params | ✅ §12 |
| 4 | Kế hoạch pagination | ✅ §13 |
| 5 | Kế hoạch cover 3:4 | ✅ §8 |
| 6 | Không triển khai UI lớn trước audit | ✅ |
| 7 | Build pass | ✅ (`npm run build`) |

---

## 20. Phase 3 — Hoàn thiện backend & URL (2026-06-03)

### Đã triển khai

| Hạng mục | File / ghi chú |
|----------|----------------|
| URL params chuẩn (`origin`, `mood`, `format`, `category`, `hasAudio`) | `lib/stories/story-query-params.ts`, `lib/discovery/catalog-url.ts` |
| Parse alias sort (`newest`, `popular`, `rising`, …) | `parseCatalogSortParam` + `normalizeSort` trong `get-public-stories.ts` |
| Sort `updated` → cột `updated_at` | `applyDateSort` |
| Lọc `quality_status != permanently_hidden_low_quality` | `applyBaseStoryFilters` |
| Default page size **24**, tùy chọn **24/48** | `story-catalog-query.ts`, `StoryPageSizeSelector` |
| Hydrate `current_image` cho cover | `attach-catalog-story-images.ts` → `get-story-catalog-page.ts` |
| Ranking scores chỉ khi sort cần | `get-public-stories.ts` (`isScoreSortedCatalog`) |
| Filter `hasVideo` | `film-card-summary.ts`, `story-filters.ts` |
| UI catalog cockpit (không sidebar filter) | `components/story-catalog/*`, layouts |
| Grid 3:4, `2xl:grid-cols-4` | `StoryCatalogGrid`, `ChapMeeCover` |
| Xóa dead code | `StoryGridCard`, `StoryRowCard`, `StoryCatalogResultsSummary`, `stories/StoryCatalogGrid` |

### Validation

- `npm run build` — pass (Next.js 16.2.6, sau Phase 3).

---

## 19. Phụ lục — so sánh nhanh param cũ → mới

| Cũ | Mới |
|----|-----|
| `contentOrigin=original` | `origin=original` |
| `contentOrigin=translation` | `origin=translated` |
| `experience=slug` | `mood=slug` |
| `presentation=slug` | `format=slug` |
| `subgenre=slug` | `category=slug` (hoặc giữ subgenre nội bộ) |
| `hasAudio=yes` | `hasAudio=true` |
| `sort=new` | `sort=newest` |
| `sort=reads` | `sort=popular` |
| `sort=hot` | `sort=rising` |
| `pageSize=20` | `pageSize=24` |
