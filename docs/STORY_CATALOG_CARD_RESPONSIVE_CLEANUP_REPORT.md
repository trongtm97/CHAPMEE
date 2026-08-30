# Story Catalog Card — Responsive Cleanup Report

**Date:** 2026-06-03  
**Scope:** `/truyen` catalog — cleanup + validation after mobile card + desktop 4-column upgrade.

---

## 1. Card changes (current architecture)

| Layer | Component | Role |
|-------|-----------|------|
| Entry | `StoryCatalogPage` | Renders mobile + desktop layouts |
| Mobile | `StoryCatalogList` → `StoryCatalogCard` (`layout="row"`) | Row card, cover trái |
| Desktop | `StoryCatalogGrid` → `StoryCatalogCard` (`layout="grid"`) | Grid 4 cột |
| Cover | `StoryCatalogCover` → `ChapMeeStoryCover` | 3:4, overlay badges |
| View model | `lib/stories/story-catalog-card.ts` | Map story → card fields |

**Grid breakpoints:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`

**Mobile cover:** `w-[7.25rem]` (116px), `aspect-[3/4]`, `shrink-0 min-w-[7.25rem]`

---

## 2. Cover / fallback changes

- `ChapMeeCover`: fallback bìa sách (gradient tối, glow, khung inset, initial lớn).
- Catalog: `showFallbackTitle={false}` — không lặp title dài trên fallback (title hiện ở card body).
- Ảnh/fallback **in-flow** (`size-full object-cover`) — fix collapse height trên mobile flex.
- Image source: `currentImage.portrait` → legacy `coverUrl` + aliases (`cover_image_url`, `thumbnailUrl`, …).
- Usage: `catalogRow` + `catalogGrid` → variant `portrait` (800×1200, 3:4).

---

## 3. Desktop 4-column result

- `StoryCatalogGrid`: `xl:grid-cols-4` — 4 cards/row trên viewport ≥1280px (content area với global sidebar).
- Tablet: `md:2`, `lg:3` columns.
- Cover full-width card, `aspect-[3/4]`.

---

## 4. Mobile QA (code review + layout rules)

| Check | Status |
|-------|--------|
| Cover width cố định 116px | ✅ |
| Cover không collapse (in-flow fix) | ✅ |
| Row card gọn (title/author/desc/stats/CTA) | ✅ |
| Overlay: origin, genre, status, media icons | ✅ |
| `pb-24` bottom padding (bottom nav) | ✅ `MobileStoryCatalogLayout` |
| No horizontal overflow (`min-w-0`, `truncate`, `line-clamp`) | ✅ |

---

## 5. Filter / sidebar cleanup

### Grep filter sidebar

```
FilterSidebar | SidebarFilter | StoryCatalogFilterPanel | CatalogFilterSidebar
→ No matches
```

**Also removed earlier in refactor:**
- `CatalogDesktopFilterRail.tsx` (deleted)
- Content-area filter sidebar — **not used** on `/truyen`

**Current filter UI:** `StoryCatalogFilterCockpit` (search + sort + quick chips + advanced sheet).

**Global app nav sidebar:** unchanged (`DesktopSidebar`).

### Files deleted this cleanup

| File | Reason |
|------|--------|
| `components/stories/MobileStoryListItem.tsx` | Replaced by `StoryCatalogCard` row; zero imports |
| `components/stories/StoryCatalogFilters.tsx` | Replaced by `StoryCatalogFilterCockpit`; zero imports |
| `components/stories/StoryCatalogList.tsx` | Duplicate list using old mobile item (deleted prior) |

### Files kept (still used elsewhere)

| File | Reason |
|------|--------|
| `components/stories/StoryFilterSheet.tsx` | Used by `StoryCatalogMobileFilterSheet` |
| `components/stories/CatalogActiveFilterChips.tsx` | May be used by legacy paths — grep before future delete |
| `components/stories/StoryCover.tsx` | Story detail / non-catalog surfaces |

---

## 6. Label audit

### Grep `Sáng tác`

**Before cleanup:** 1 hit — cover overlay mobile shorthand.  
**After cleanup:** 0 user-facing `Sáng tác` — unified **Truyện sáng tác** / **Truyện dịch** on cover overlay.

Filter chips (`StoryCatalogTopFilters`) already use **Truyện sáng tác**.

Route `/truyen-sang-tac` is URL slug — not a display label issue.

---

## 7. Image aspect audit

### `/truyen` + `story-catalog/`

**No `aspect-video`, no landscape cover** — all catalog covers use `aspect-[3/4]`.

### Allowed `aspect-video` (non story-card cover)

| Location | Purpose |
|----------|---------|
| `lib/images/story-image-usage.ts` → `reelsBackground` | Reels full-bleed background |
| `components/films/*` | YouTube / film thumbnails |
| `src/components/audio/YoutubeEmbedPlayer.tsx` | Video embed |
| `components/studio/audio/*`, `studio/films/*` | Studio previews |
| `components/story/StoryImageVariantPreview.tsx` | Admin variant preview (includes landscape label) |

Internal `landscape` variant in `get-story-image.ts` — storage/processing only; catalog uses `portrait`.

---

## 8. Link audit (catalog)

### Catalog components

- Author link: `AuthorNameLink` with `linkToProfile` → `getCreatorPublicHref` → `/@username`.
- No `/author/`, `/tac-gia/`, `/creator/` in `components/story-catalog/*`.

### App-wide note

`/author/[id]`, `/tac-gia/`, `/community/author/` routes still exist for legacy/community — **outside `/truyen` catalog scope**.

---

## 9. Function QA (static verification)

| Feature | Implementation |
|---------|----------------|
| Search | `StoryCatalogSearch` → `buildCatalogHref` |
| Sort | `StoryCatalogSortSelect` |
| Origin / status / audio / video chips | `StoryCatalogTopFilters` |
| Advanced filters | `StoryCatalogAdvancedFilters` + mobile sheet |
| Clear filters | `StoryCatalogActiveFilters` |
| Pagination | `StoryCatalogPagination` preserves filters via `buildCatalogHref` |
| Filter → page reset | `buildCatalogViewHref` defaults `page: 1` when omitted |
| URL params | `lib/stories/story-query-params.ts` + `catalog-url.ts` (canonical + legacy parse) |

Manual browser QA recommended: reload with query string, paginate with filters active.

---

## 10. Dev “Issues” badge

- `next.config.ts`: `devIndicators: false` — Next.js dev overlay disabled.
- Red “N Issues” badge in screenshots = **Cursor/IDE or browser devtools**, not production UI.
- Not rendered by catalog components.

---

## 11. Build result

```
npm run build — PASS (exit 0, Next.js 16.2.6)
```

(`pnpm` not required; project uses `npm run build`.)

---

## 12. Files changed this cleanup pass

- `components/story-catalog/StoryCatalogCover.tsx` — label fix
- `components/story-catalog/StoryCatalogCard.tsx` — format cleanup
- **Deleted:** `MobileStoryListItem.tsx`, `StoryCatalogFilters.tsx`
- **Created:** this report

---

## 13. Remaining TODO

1. **Manual QA** at 390px / 768px / 1280px+ in browser (cover visible, 4-col desktop).
2. **Optional delete:** `CatalogActiveFilterChips.tsx` if confirmed unused repo-wide.
3. **Sort “Được đề cử”** — UI alias `saved`; no separate backend ranking sort.
4. **Cover overlay on very narrow row (116px):** full “Truyện sáng tác” at 7px — monitor readability; may need 2-line wrap if user feedback.
5. **E2E tests** for filter URL + pagination — not in scope.

---

## 14. Acceptance checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Mobile card gọn | ✅ |
| 2 | Cover mobile đồng đều 3:4 | ✅ (post in-flow fix) |
| 3 | Desktop 4 cols @ xl | ✅ |
| 4 | Filter top works | ✅ (static) |
| 5 | No content filter sidebar | ✅ |
| 6 | No user-facing “Sáng tác” | ✅ |
| 7 | No story cover ngang in catalog | ✅ |
| 8 | Profile link `/@username` | ✅ |
| 9 | Report created | ✅ |
| 10 | Build pass | ✅ |
