# ChapMee Performance Audit

Last updated: 2026-06-01

## Scope Audited

- App Router routes under `app/admin/**`, `app/studio/**`, public reader/discover/reels paths.
- Client-side async surfaces using `fetch`, Supabase-backed server actions, tab state, search, and pagination.
- Heavy admin/studio components that mount charts, audit panels, Composer preview, or large tables.
- Supabase tables used by story lists, chapter lists, taxonomy, ads, analytics, reports, and comments.

## Architecture Notes

- The project uses Next.js App Router.
- Data fetching is custom `fetch`, server components, server actions, and Supabase helpers.
- No TanStack Query or SWR dependency is currently present, so this pass uses small local hooks instead of adding a large cache library.

## Findings And Fixes

### Stale Client Requests

Problem:
- Client fetches in rankings, notifications, reels pagination, Composer settings, chapter image preview, and taxonomy tables could finish after the user changed route/tab/filter.

Files:
- `hooks/useRankingBoard.ts`
- `components/notifications/NotificationsPage.tsx`
- `components/reels/ReelsFeed.tsx`
- `components/composer/ChapMeeStudioComposer.tsx`
- `hooks/useChapterImagesMap.ts`
- `components/admin/taxonomy/TaxonomyTermsTable.tsx`

Fix:
- Added `useLatestRequestGuard`, `useAbortableAsync`, and safe abort handling.
- Added `AbortController` where browser `fetch` supports it.
- Added request-id guards for server-action/Supabase-style calls that cannot be aborted directly.
- Abort errors are ignored instead of being surfaced as user-visible errors.

Risk:
- Server actions still execute on the server once started, but old responses are ignored on the client.

### Search/Filter Spam

Problem:
- Taxonomy admin search could be triggered repeatedly by quick typing or Enter/search button changes.

Files:
- `components/admin/taxonomy/TaxonomyTermsTable.tsx`

Fix:
- Added 350ms debounce for search input.
- Existing server-side pagination and filters are preserved.
- Old responses are guarded before updating the table.

Risk:
- Debounce only covers this high-impact table. Other admin search boxes should be migrated in follow-up passes.

### Heavy Admin Algorithm Tabs

Problem:
- Admin Algorithm imports many heavy panels up front even though only one tab is visible.

Files:
- `components/admin/algorithm/AdminAlgorithmControlCenterPage.tsx`

Fix:
- Dynamic imported non-overview panels.
- Added lightweight per-panel skeleton.
- Refresh data is guarded so old refreshes do not overwrite newer state.

Risk:
- First open of a heavy tab now loads its chunk on demand. This improves initial page responsiveness but may show a short panel skeleton on first tab visit.

### Composer Preview Cost

Problem:
- Desktop Composer preview and image map resolution could run while the author is typing, even when preview is not needed.

Files:
- `components/composer/ChapMeeStudioComposer.tsx`
- `hooks/useChapterImagesMap.ts`

Fix:
- Desktop preview is opened on demand.
- Preview value is deferred with `useDeferredValue`.
- Preview image map is only requested when desktop/mobile preview is open.
- Composer settings fetch is abortable/stale guarded.

Risk:
- Desktop preview is no longer always visible by default. This is intentional to protect typing performance.

### Loading Boundaries

Problem:
- Several admin/studio routes had no route-level loading boundary, so navigation could feel blank or stuck while server data loaded.

Files:
- `components/ui/navigation-skeletons.tsx`
- `app/admin/loading.tsx`
- `app/admin/algorithm/loading.tsx`
- `app/admin/taxonomy/loading.tsx`
- `app/admin/content-taxonomy-quality/loading.tsx`
- `app/admin/ads/loading.tsx`
- `app/studio/(workspace)/loading.tsx`
- `app/studio/(workspace)/stories/new/loading.tsx`
- `app/studio/(workspace)/stories/[storyId]/chapters/loading.tsx`
- `app/studio/(workspace)/stories/[storyId]/chapters/new/loading.tsx`

Fix:
- Added shared admin/studio skeletons and route loading files.

Risk:
- Skeletons are intentionally generic. Page-specific table skeletons can be added later.

### Basic Instrumentation

Problem:
- There was no small shared helper for measuring slow async work in development.

Files:
- `lib/dev/performance.ts`
- `app/admin/algorithm/page.tsx`

Fix:
- Added `measureAsync(name, fn)` with dev-only timing logs and a >1000ms warning.
- Applied to `/admin/algorithm` server data load.

Risk:
- This is local console instrumentation only, not production monitoring.

### Database Index Support

Problem:
- Several large-list and aggregate paths rely on status/date/target/surface filters that benefit from composite indexes.

Files:
- `db/migrations/legacy/196_performance_support_indexes.sql`

Fix:
- Added targeted indexes for stories, episodes, profiles, taxonomy terms/relations, moderation queues, analytics events, ad placements, ad render events, and ad revenue aggregates.

Risk:
- Indexes improve reads but add write overhead. They should be monitored after migration on production data.

## Already Good / Existing Patterns

- Many admin/studio list functions already use `page` and `pageSize`.
- Taxonomy analytics already has aggregate tables in migration `184_taxonomy_analytics.sql`.
- Ad revenue already has aggregate tables in migration `189_ad_revenue_stats.sql`.
- Reels feed already uses cursor/offset batching and only loads more near the end.

## Not Done Yet

- Full conversion of every admin/studio search box to debounce/stale guard.
- Full route transition timing component across the whole app.
- Production metrics sink for slow queries.
- Job records/polling for every rebuild/simulation action.
- Virtualization for extremely large in-client lists, if any remain after pagination.
- Full lint cleanup across the repo. Current global lint failures include many pre-existing unrelated files.

## Validation Result

- `npm run typecheck`: passed after the performance changes.
- `npm run build`: passed after the performance changes.
- Targeted ESLint for changed performance files: passed.
- `npm run lint`: still fails globally because of unrelated existing lint errors in many files outside this pass.
