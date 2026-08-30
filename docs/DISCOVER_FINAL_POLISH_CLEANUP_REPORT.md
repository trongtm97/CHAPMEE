# Discover final polish — cleanup report

**Date:** 2026-06-02  
**Scope:** Cleanup + validation only (`/discover` refactor follow-up). No new product features.

---

## Summary

Removed unused discover components that duplicated shortcuts/featured UI, unified **Hot** badge styling via `HotBadge`, fixed remaining user-facing **「Sáng tác」** labels, and validated structure, covers, links, and headings. **`npm run build`** completed successfully (exit 0).

---

## Files changed

| Action | Path |
|--------|------|
| Added | `components/common/HotBadge.tsx` |
| Added | `docs/DISCOVER_FINAL_POLISH_CLEANUP_REPORT.md` |
| Updated | `components/discover/DiscoverHero.tsx` |
| Updated | `components/discover/DiscoverQuickAccessGrid.tsx` |
| Updated | `components/layout/DesktopHeader.tsx` |
| Updated | `components/story/StoryOriginBadge.tsx` |
| Updated | `components/search/SearchPageView.tsx` |
| Updated | `components/reels/ReelsCard.tsx` |
| Deleted | `components/discover/DiscoverFeaturedGrid.tsx` |
| Deleted | `components/discover/DiscoverFeatureCard.tsx` |
| Deleted | `components/discover/DiscoverMediaShortcuts.tsx` |
| Deleted | `components/discover/DiscoverTabs.tsx` |
| Deleted | `components/discover/MobileStoryCard.tsx` |
| Deleted | `components/discover/UpdatedStoriesCompactList.tsx` |
| Deleted | `components/discover/DiscoverArticlesBlock.tsx` |
| Deleted | `components/discover/DiscoverArticlesSection.tsx` |

**Unchanged (already correct from prior refactor):** `DiscoverFeed.tsx`, `DiscoverLatestUpdates.tsx`, `DiscoverStoryCard.tsx`, `StoryCarouselSection.tsx`, `ChapMeeCover.tsx`, `lib/discover/discover-shortcuts.ts`, `lib/discover/latest-updates.ts`.

---

## Issues found → fixed

### 1. Duplicate sections / dead components

| Issue | Resolution |
|-------|------------|
| `DiscoverFeaturedGrid` + `DiscoverFeatureCard` overlapped **Lối tắt nhanh** / hero chips | Deleted (no imports) |
| `DiscoverMediaShortcuts` duplicated Audio/Video shortcuts | Deleted |
| `DiscoverTabs` legacy tab UI | Deleted |
| `MobileStoryCard`, `UpdatedStoriesCompactList` unused after card refactor | Deleted |
| `DiscoverArticlesBlock` + `DiscoverArticlesSection` duplicated **Bài viết** shortcut | Deleted; shortcut lives in `DISCOVER_SHORTCUT_ITEMS` |

**Kept feed order:** Hero → Search + quick chips → Lối tắt nhanh → Cập nhật mới → Boosted → Mood → Taxonomy → story sections (+ ads/ranking as before).

### 2. Search width

Already **`w-full`** on `AppSearchBar` in `DiscoverHero` with `variant="discover"`. No change required.

### 3. Shortcut order

Defined in `lib/discover/discover-shortcuts.ts`: Truyện sáng tác (Hot) → Danh mục → Mới → Hoàn thành → BXH → Dịch → Thể loại → Cảm giác → Được đề cử → Audio → Video → Bài viết → Taxonomy. Verified; no change.

### 4. HOT badge spacing

| Location | Fix |
|----------|-----|
| Desktop nav **Truyện sáng tác** | Replaced absolute superscript with `inline-flex gap-1.5` + `HotBadge` |
| Hero quick chip | `HotBadge` inline (`gap-2` on chip) |
| Shortcut card | `HotBadge variant="corner"` |

Shared component: `components/common/HotBadge.tsx` (`inline` | `corner`).

### 5. Story cover size (3:4)

- `DiscoverStoryCard` uses `ChapMeeStoryCover` with `discover` / `discoverLg` sizes (`aspect-[3/4]` in `cover-sizes.ts`).
- No `display: none` on covers in discover story sections.
- **Cập nhật mới** remains text-only by design.

### 6. Cập nhật mới scroll

`DiscoverLatestUpdates.tsx`: `max-h-[min(20rem,42vh)]` mobile, `md:max-h-[22.5rem]`, `overflow-y-auto`, thin scrollbar, single column, limit 20 in data layer.

### 7. Label audit — 「Sáng tác」

```text
grep "Sáng tác" app components lib src → 0 user-facing standalone 「Sáng tác」 after fix
```

| File | Before | After |
|------|--------|-------|
| `StoryOriginBadge.tsx` | Sáng tác | Truyện sáng tác |
| `SearchPageView.tsx` (origin filter) | Sáng tác | Truyện sáng tác |
| `ReelsCard.tsx` | Sáng tác | Truyện sáng tác |

**Internal (not UI):** `getStoryOriginBadge()` in `lib/content-origin/content-origin-policy.ts` returns ASCII `"Truyen Sang Tac"` / `"Truyen Dich"` for policy strings — not rendered as discover labels.

**Allowed phrasing elsewhere:** 「Người sáng tác」, 「quyền sáng tác」, studio copy 「Truyện Sáng Tác」 (title case on dedicated pages).

### 8. Image aspect audit

**`components/discover/**`:** no `aspect-video`, `16/9`, or landscape cover classes.

**Remaining allowed `aspect-video` (non–story-card):**

| Area | Usage |
|------|--------|
| YouTube / film | `YoutubeEmbedPlayer`, `YoutubeFilmEmbed`, `FilmAdaptationCard`, studio film/audio forms |
| Reels background | `lib/images/story-image-usage.ts` → `reelsBackground` |
| Studio admin preview | `StoryImageVariantPreview` landscape option (editor only) |

Story/chapter covers on discover use **3:4** via `ChapMeeCover` / `cover-sizes.ts`.

### 9. Link audit

```text
grep 'href="/(creator|author|tac-gia)/' → no public href matches
```

- Author links on discover cards: `@username` / story detail (existing patterns).
- Latest updates: audio/video → `/media?tab=audio|video` (not chapter).
- Search: `AppSearchBar` `catalogNavigation` → `/search`.
- Shortcuts: paths from `DISCOVER_SHORTCUT_ITEMS` (e.g. `/truyen-sang-tac`, `/media?tab=audio`).

**Note:** Many `lib/creator/*` imports are server/studio modules — not discover nav links.

### 10. Heading audit (`/discover`)

| Level | Where |
|-------|--------|
| **h1** (one) | `DiscoverHero` — 「Khám phá」 |
| **h2** | Section titles: shortcuts, latest updates, carousels, boosted, mood, taxonomy, mini ranking |
| **h3 / text** | Card titles inside `DiscoverStoryCard`, latest-update rows |

Header/sidebar/footer: no extra h1 on discover route.

---

## Build result

```text
npm run build  →  exit 0
Next.js 16.2.6 — compiled, TypeScript OK, static generation OK
```

(`pnpm` was not required; build ran via `npm run build`.)

---

## Manual QA checklist

- [ ] Desktop `/discover`: full-width search, HOT spacing on chip + shortcut + header nav
- [ ] Mobile `/discover`: horizontal chip scroll, shortcuts grid, footer not excessively long
- [ ] Story sections: large portrait covers, no broken images
- [ ] Cập nhật mới: scroll inside panel, ~20 items max
- [ ] No duplicate featured grid / double audio blocks in feed

---

## Remaining TODO (optional, out of scope)

1. **MiniRanking** row badge uses separate rose **HOT** styling (ranking context, not origin) — could adopt `HotBadge` with a `ranking` variant if full visual unification is desired.
2. **Mobile header** nav: confirm mobile top bar uses same Hot spacing if a separate hot markup exists outside `DesktopHeader`.
3. **`DiscoverFeed.tsx`** has extra blank lines from earlier edits — cosmetic normalize only.
4. **Studio / catalog pages** (`truyen-sang-tac` h1 「Truyện Sáng Tác」 title case) — intentional page titles, not discover chips.

---

## Acceptance criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | No large duplicate sections | Pass |
| 2 | Lối tắt nhanh priority order | Pass |
| 3 | HOT spacing | Pass (shared `HotBadge`) |
| 4 | Story cards 3:4 covers | Pass |
| 5 | Cập nhật mới max-height + scroll | Pass |
| 6 | No wrong user-facing 「Sáng tác」 | Pass |
| 7 | No horizontal story/chapter covers on discover | Pass |
| 8 | Main links correct | Pass |
| 9 | Single h1 on `/discover` | Pass |
| 10 | This report | Pass |
| 11 | Build pass | Pass |
