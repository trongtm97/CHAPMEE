# ChapMee Performance Checklist

Use this checklist after performance changes and before release.

## Automated Checks

Run:

```bash
npm run typecheck
npm run build
npm run lint
```

Expected:
- Typecheck passes.
- Build passes.
- Lint should pass before release. If it fails, separate new failures from existing repo-wide debt.

## Route Transition Checks

Test:
- `/admin/algorithm` -> `/admin/taxonomy` -> `/admin/ads` -> `/admin/ad-revenue-policy`
- `/studio` -> `/studio/stories` -> `/studio/stories/new`
- `/studio/stories/[storyId]/chapters` -> `/studio/stories/[storyId]/chapters/new`
- `/discover` -> `/rankings` -> `/reels` -> `/community`

Expected:
- Active navigation changes immediately.
- A route skeleton appears quickly when server data is still loading.
- No blank screen during normal transitions.
- No old tab data flashes back after a newer tab is selected.

## Request Cancellation And Stale Guard Checks

Open DevTools Network and test:
- Switch ranking tabs quickly.
- Switch notification tabs quickly.
- Type quickly in Admin Taxonomy search.
- Scroll Reels until it loads more, then navigate away.
- Open Composer preview, close it, then navigate away.

Expected:
- Old fetch requests are aborted where supported.
- Supabase/server-action responses that cannot be aborted do not update stale UI.
- Abort errors do not show as red user-facing errors or noisy console errors.

## Admin Table Checks

Test:
- Admin Taxonomy manage table search/filter/sort/page.
- Admin Content Taxonomy Quality table page/filter.
- Admin Ads placements filters.
- Admin reports/comments/messages if available.

Expected:
- Lists use page/pageSize or range-style server pagination.
- Filters/search are sent to backend/server action.
- No table renders thousands of rows at once.
- Header and filters stay visible while table data is loading.

## Composer/Editor Checks

Test:
- Open `/studio/stories/new`.
- Switch between story info, taxonomy, Composer/content, SEO/publish steps.
- Type quickly into Composer or chapter editor.
- Open and close mobile/desktop preview.

Expected:
- Typing remains responsive.
- Preview does not recompute visibly on every keystroke when closed.
- Draft content is not reset by auxiliary fetches.
- Autosave, if active in the editor flow, is debounced and does not fire on every key.

## Analytics/Ads/Algorithm Checks

Test:
- Open `/admin/algorithm` and switch algorithm tabs.
- Open `/admin/taxonomy-analytics`.
- Open `/admin/ads` and ad revenue pages.

Expected:
- Heavy tab content loads only when the tab is opened.
- Analytics dashboards read aggregate tables where available.
- Rebuild/simulation buttons do not freeze the page.
- Audit/log tables are paginated.

## Database Checks

After applying migrations:

```sql
select schemaname, tablename, indexname
from pg_indexes
where indexname like 'idx_%'
order by tablename, indexname;
```

Spot check slow pages with `EXPLAIN` or Supabase query logs:
- Public story catalog by status/visibility/published date.
- Studio story and chapter lists by creator/story/status.
- Taxonomy admin table by type/usage/updated date.
- Analytics event rollups by event/target/created date.
- Ad revenue rebuild by ad event type/date/story/chapter/author.

Expected:
- Query plans use the new composite indexes for common filters.
- No dashboard scans raw event tables when aggregate tables are available.

## Load And Memory Checks

Test with seeded or representative data:
- 10k stories.
- 100k chapters.
- 100k taxonomy relations.
- Large analytics/ad event samples, or aggregate-only seed if raw event volume is too expensive.

Expected:
- Admin tables stay paginated.
- Public lists remain limited/cached.
- Reels/feed batches do not keep unbounded DOM forever.
- Navigating away cleans timers, observers, and subscriptions.

## Production Readiness

Before release:
- Confirm `npm run lint` has no new failures from performance files.
- Confirm `npm run typecheck` passes.
- Confirm `npm run build` passes.
- Apply DB migration in staging first and monitor write overhead.
- Compare slow query logs before and after indexes.
- Confirm no private/admin data is cached as public data.
