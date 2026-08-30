# ChapMee Data, Cache, Database Performance Report

Date: 2026-06-03

## Summary

This audit focused on public list services, media/ranking/discover data paths, reader data shape, cache policy, and database/index planning. The implementation changes in this pass are intentionally small and low-risk:

- Public story catalog now uses a real short-lived `unstable_cache` entry tagged `story-catalog`.
- Media hub stats now use a short-lived `unstable_cache` entry tagged `media-hub`.
- Reader previous/next chapter metadata no longer loads every episode in the story; it uses two bounded adjacent-chapter queries.

No private/user-specific response was put into shared cache.

## Pagination Status

| Surface | Status | Notes |
| --- | --- | --- |
| `/truyen` story catalog | Good for normal date/search sorts | Uses `page`, `pageSize`, `range(offset,to)` for date sorts and search bridge. Some metric/score sorts still assemble candidate IDs then slice in memory when no metric view is available. |
| `/media` audio | Good | Uses `page`, `pageSize`, `range(from,to)` and exact count. Featured audio is capped to 4-6 items. |
| `/media` video | Partial | Base film query uses `range(from,to)`, but some filters (`q`, `origin`, `status`, `chapmee_source`) are applied after the ranged query. This can under-fill pages and report current-page filtered counts. Needs a query-level filter or aggregate/search view. |
| `/bang-xep-hang` ranking | Good primary path | Uses `ranking_snapshots` with count + `range(from,to)`. Live fallback is bounded but should remain fallback-only. |
| Discover | Bounded, not classic pagination | Candidate pool limit is capped (`220`) and sections are capped. Search path uses page 1 + `limit`. Film tab uses paginated film service. |
| Reader comments | Good MVP | `getComments` limits to 30, community post comments limits to 40. |
| Reader chapter | Improved | Current chapter content + story basics + adjacent chapter metadata. Previous/next now use `limit(1)` queries rather than loading all episodes. |
| Admin/Studio tables | Mixed but generally paginated | Many large admin tables expose page/pageSize. A few UI panels intentionally show previews via `slice(0,n)`. |

## Query Issues Found

1. `getPublicStoriesCatalogCached` previously did not actually cache despite its name.
   - Fixed with `unstable_cache`, `revalidate: 60`, tag `story-catalog`.

2. `getEpisodeReaderData` previously fetched all public episodes for a story to compute previous/next links.
   - Fixed with two adjacent queries:
     - previous: `lt("episode_number", current).order(desc).limit(1)`
     - next: `gt("episode_number", current).order(asc).limit(1)`

3. `getMediaHubStats` counted audio/video and sampled up to 5000 story IDs on every request.
   - Fixed with short cache (`revalidate: 300`, tag `media-hub`).
   - Longer-term: replace distinct story sampling with aggregate table/view.

4. `getMediaHubVideoPage` fetches story metadata separately and applies some filters after pagination.
   - Remaining TODO: push filters into SQL via joins or create a materialized/public media catalog view.

5. Story catalog metric sorts can still load candidate ID sets and sort/slice in memory if a metric view is unavailable.
   - Existing code already prefers `getCatalogStoryIdsByMetricView` where available.
   - Remaining TODO: extend metric views to all metric sorts.

6. Ranking primary path is snapshot-based and paginated, which is good.
   - Fallback path fetches up to 500 recent stories and loads aggregated metrics. Keep as fallback, not normal production path.

## Cache Decisions

Implemented:

- `story-catalog`: public catalog only, 60 seconds.
- `media-hub`: public media stats only, 300 seconds.
- Existing reader chapter-content server cache remains access-aware and should not cache locked paid content for unauthorized users.

Safe cache candidates:

- Taxonomy/filter options: 10-30 minutes, tag `taxonomy`.
- Public discover sections for anonymous users: 30-60 seconds, tag `discover`.
- Ranking snapshot results: 30-120 seconds per board/window/genre, tag `ranking`.
- Public story detail shell: 60-300 seconds for non-user-specific story metadata only.

Do not shared-cache:

- User reading progress.
- Unlock/access decisions for paid chapters.
- Fan club membership.
- Comments with delete permissions.
- Admin/Studio dashboards.
- Personalized discover feed.

## Revalidation Plan

MVP hooks to wire after publish/update actions:

- Story create/update/publish/unpublish:
  - `revalidateTag("story-catalog")`
  - `revalidateTag("discover")`
  - `revalidateTag("ranking")` if ranking inputs changed
  - `revalidatePath(getStoryDetailHref(...))`
  - sitemap tags/path if story SEO visibility changed

- Chapter publish/update/delete:
  - invalidate chapter content cache by chapter id/content hash
  - `revalidatePath(chapterHref)`
  - `revalidatePath(storyHref)`
  - `revalidateTag("story-catalog")` if updated chapter affects catalog sort/status

- Media audio/video publish/update:
  - `revalidateTag("media-hub")`
  - `revalidatePath("/media")`
  - `revalidatePath(storyHref)` if story detail shows media sections

- Taxonomy changes:
  - `revalidateTag("taxonomy")`
  - `revalidateTag("story-catalog")`
  - `revalidateTag("discover")`

## Aggregate Metrics Plan

Ranking/discover should not scan raw analytics events during page requests. Current ranking primary path uses `ranking_snapshots`, and fallback uses aggregated story metrics, which is acceptable as a fallback.

Recommended aggregate tables/views:

- `story_daily_metrics`
  - `story_id`, `metric_date`, `reads`, `impressions`, `completions`, `next_chapter_clicks`, `saves`, `follows`, `unlocks`, `reports`, `hides`
  - unique index `(story_id, metric_date)`

- `story_total_metrics`
  - `story_id`, total counters, last activity timestamps
  - unique index `(story_id)`

- `author_daily_metrics`
  - `author_user_id`, `metric_date`, reads/impressions/follows/revenue-like aggregates
  - unique index `(author_user_id, metric_date)`

- `media_daily_metrics`
  - `media_item_id`, `story_id`, `media_type`, `metric_date`, plays/views/completions
  - unique index `(media_type, media_item_id, metric_date)`

- `ranking_snapshots`
  - already used by primary ranking path.
  - keep snapshot generation cron as the normal production path.

## Index Recommendations

Only add after verifying existing migrations/schema do not already include equivalent indexes.

Clearly useful public indexes:

```sql
create index concurrently if not exists idx_stories_public_updated
  on public.stories (visibility, status, updated_at desc)
  where visibility = 'public';

create index concurrently if not exists idx_stories_public_origin_updated
  on public.stories (content_origin, visibility, status, updated_at desc)
  where visibility = 'public';

create index concurrently if not exists idx_episodes_story_status_number
  on public.episodes (story_id, status, episode_number);

create index concurrently if not exists idx_comments_story_episode_visible_created
  on public.comments (story_id, episode_id, status, created_at desc);

create index concurrently if not exists idx_audio_items_status_updated
  on public.audio_items (status, updated_at desc);

create index concurrently if not exists idx_story_film_adaptations_status_published
  on public.story_film_adaptations (status, published_at desc, created_at desc);

create index concurrently if not exists idx_ranking_snapshots_board_window_snapshot_rank
  on public.ranking_snapshots (ranking_type, time_window, taxonomy_term_id, snapshot_at desc, rank_position);
```

Taxonomy/story join tables should have both directions indexed:

```sql
create index concurrently if not exists idx_story_taxonomy_story
  on public.story_taxonomy_terms (story_id);

create index concurrently if not exists idx_story_taxonomy_term
  on public.story_taxonomy_terms (term_id, story_id);
```

No index migration was added in this pass because the current repo already has many migrations and table naming/index coverage should be verified against the live schema before adding concurrent indexes.

## Remaining TODO

- Move `/media` video text/origin/status filters into SQL or a materialized media catalog view.
- Extend catalog metric views to cover `saved`, `chapters`, full-access price, and chapter-price sorts without in-memory sorting over candidate sets.
- Add cache tags for anonymous discover sections once all user-specific branches are isolated.
- Wire revalidation tags from story/chapter/media publish actions.
- Add query log sampling in dev/staging for slow catalog/ranking/media calls.
- Verify DB index coverage in the deployed database before adding migrations.
