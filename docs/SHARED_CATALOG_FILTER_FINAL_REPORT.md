# Shared Catalog Filter — Final Report

Date: 2026-06-03

## Summary

Extracted a **config-driven catalog filter shell** used by `/truyen` and `/media`. UI and query-param navigation are shared; story and media **data fetching stay separate**.

## Shared components

| Component | Role |
|-----------|------|
| `CatalogSearchFilterShell` | Layout: search, sort, quick filters, advanced slot, active chips |
| `CatalogSearchBar` | Search input + Tìm (uses `AppSearchField`) |
| `CatalogSortControl` | Chips or `<select>` sort |
| `CatalogQuickFilters` | Horizontal quick filter links |
| `CatalogAdvancedFilters` | Desktop form + mobile bottom sheet |
| `CatalogActiveFilters` | “Đang lọc” pills + Xóa tất cả |
| `CatalogMobileFilterSheet` | Mobile drawer (no sidebar) |
| `CatalogPagination` | Prev/next + page numbers + range text |
| `CatalogEmptyState` | Reader-first empty CTA block |

## Config modules

| Module | Purpose |
|--------|---------|
| `lib/catalog/story-catalog-filter-config.ts` | Placeholder, sort, quick filter definitions for stories |
| `lib/catalog/media-catalog-filter-config.ts` | Tab-aware media config + active chip labels |
| `lib/catalog/story-catalog-runtime.ts` | Story href/active state → `buildCatalogViewHref` |
| `lib/catalog/media-catalog-runtime.ts` | Media href/active state → `buildMediaHubHref` |

## /truyen integration

- `StoryCatalogFilterCockpit` now composes `CatalogSearchFilterShell` + existing `StoryCatalogAdvancedFilters`
- `getPublicStoriesCatalogCached` unchanged
- Sort: **select** (desktop-friendly, same as before)
- Mobile: existing `StoryFilterSheet` via advanced filters (unchanged)

## /media integration

- **Removed** `MediaHubFilters.tsx` (duplicate)
- **Added** `MediaCatalogFilterShell` → shared shell + `CatalogAdvancedFilters` (genre, mood, setting, format slugs)
- **Added** `getMediaCatalogResults()` wrapper over audio/video page loaders
- Pagination: `CatalogPagination` (`itemLabel="media"`)
- Empty: `MediaEmptyState` → `CatalogEmptyState`
- Reader-first filters only (no External audio, source_ok, Studio CTA, policy note)

## Query params

### Common (both surfaces via URL)

- `q`, `sort`, `page`, `pageSize`, `origin`, `genre`, `status`

### /truyen additional

- `hasAudio`, `hasVideo`, `tag`, taxonomy facets (`experience`, `setting`, `presentation`, …) — via `catalog-url.ts`

### /media additional

- `tab=audio|video`
- `continuous=1` (Nghe liên tục)
- `mood`, `setting`, `format` (advanced slug fields; wire-up in hub-data TODO)
- Legacy (parsed, not in UI): `source`, `source_ok`, `chapmee_source`, `youtube`, `relation`

## Components removed

| File | Reason |
|------|--------|
| `components/media/MediaHubFilters.tsx` | Replaced by `MediaCatalogFilterShell` + shared catalog components |

## Components kept (and why)

| File | Reason |
|------|--------|
| `StoryCatalogAdvancedFilters` | Story taxonomy dropdowns + mobile sheet — story-specific |
| `StoryCatalogFilterDropdown` | Used by advanced filters |
| `StoryPagination` | Story page size selector + layout variants — not merged yet |
| ~~`MediaPagination.tsx`~~ | Removed; page uses `CatalogPagination` |
| `StoryCatalogSearch.tsx` | Legacy export; cockpit no longer uses it directly |
| `media-hub-data.ts` | Media query logic |

## Mobile QA checklist

- [ ] `/truyen`: search full width, quick filters scroll, advanced opens sheet
- [ ] `/media`: search full width, sort + quick chips scroll, “Lọc nâng cao” opens bottom sheet
- [ ] Bottom nav: Reels · **Media** · Khám phá · Cộng đồng · Tôi (unchanged in `nav-items.ts`)

## Desktop QA checklist

- [ ] `/truyen`: filter cockpit one card; grid 4 columns via existing layout
- [ ] `/media`: compact filter card; audio/video grids unchanged
- [ ] Active filter row shows removable pills

## Build result

```
npm run build — (run after changes)
```

## Remaining TODO

1. ~~Wire `mood` / `setting` / `format` in `media-hub-data`~~ — done via `lib/media/resolve-media-taxonomy-story-ids.ts` (mood→`reader_experience`, setting→`setting_tag`, format→`story_presentation_settings.mode`).
2. Optionally refactor `StoryPagination` to wrap `CatalogPagination`.
3. ~~Delete `MediaPagination.tsx`~~ — done.
4. Add `CatalogResultsToolbar` shared wrapper if story toolbar should align with media.
5. Media advanced filters: optional taxonomy dropdowns (currently slug text inputs; data layer wired).
6. Admin policy pages: optional `MediaSourcePolicyNote` reuse (already in Studio).
