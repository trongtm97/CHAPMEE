# Shared Catalog Filter — Audit

Date: 2026-06-03

## Pages

| Page | Entry | Filter UI (before) | Data layer |
|------|--------|-------------------|------------|
| `/truyen` | `app/truyen/page.tsx` | `StoryCatalogFilterCockpit` + story-catalog/* | `getPublicStoriesCatalogCached` |
| `/media` | `app/media/page.tsx` | `MediaHubFilters` (duplicate) | `getMediaHubAudioPage` / `getMediaHubVideoPage` |

## Duplicate / overlap

| Area | /truyen | /media | Shareable? |
|------|---------|--------|------------|
| Search + submit | `StoryCatalogSearch` | Inline in `MediaHubFilters` | Yes → `CatalogSearchBar` |
| Sort | `StoryCatalogSortSelect` (select) | Link chips | Yes → `CatalogSortControl` (both modes) |
| Quick filters | `StoryCatalogTopFilters` | Hard-coded chips | Yes → `CatalogQuickFilters` + config |
| Advanced | `StoryCatalogAdvancedFilters` + dropdowns + sheet | Genre slug input only | Partial — story keeps taxonomy dropdowns; media uses `CatalogAdvancedFilters` |
| Active summary | `StoryCatalogActiveFilters` | Inline “Xóa lọc” chip | Yes → `CatalogActiveFilters` |
| Pagination | `StoryPagination` | `MediaPagination` | Yes → `CatalogPagination` |
| Empty state | `StoryCatalogEmptyState` | `MediaEmptyState` | Yes → `CatalogEmptyState` |
| URL helpers | `catalog-url.ts` + `story-query-params` | `media-query-params.ts` | Separate (different params) |
| Mobile sheet | `StoryCatalogMobileFilterSheet` | None | Yes → `CatalogMobileFilterSheet` |

## Keep separate (business logic)

**Story**

- `getPublicStoriesCatalogCached` / catalog metrics / taxonomy RPC
- `buildActiveCatalogFilterChips` (full facet labels from `CatalogFilterOptions`)
- `StoryCatalogAdvancedFilters` + `StoryCatalogFilterDropdown` (taxonomy DB options)
- Story card grid, tracking, audio badges

**Media**

- Tab `audio` | `video` (`parseMediaTab`, `mediaTabHref`)
- `getMediaHubAudioPage` / `getMediaHubVideoPage` (`getMediaCatalogResults` wrapper)
- Audio queue / global player on cards
- Video YouTube embed cards
- Reader-first copy config (no admin filters)

## Refactor risks

1. **Regression on /truyen** — cockpit is thin wrapper; advanced filters unchanged.
2. **URL bookmarks** — legacy media params (`source`, `source_ok`) still parsed but hidden from UI.
3. **Sort UX change on /truyen** — still uses `select` variant; media uses chips (intentional).
4. **Advanced taxonomy on /media** — slug text fields only until wired to `story_taxonomy` filters in `media-hub-data`.

## Recommended split

- **Shared:** `components/catalog/*`, `lib/catalog/types.ts`, configs, runtime href builders
- **Story-only:** `story-catalog-runtime.ts`, `StoryCatalogAdvancedFilters`, catalog-url
- **Media-only:** `media-catalog-filter-config.ts`, `media-catalog-runtime.ts`, `media-hub-data.ts`
