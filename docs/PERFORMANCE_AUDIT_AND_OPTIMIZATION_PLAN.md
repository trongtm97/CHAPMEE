# ChapMee Performance Audit and Optimization Plan

Last updated: 2026-06-03

## Scope

Audited surfaces:

- Public home and feed routes: `/`, `/reels`, `/discover`, `/truyen`, `/media`, `/bang-xep-hang`
- Reader surfaces: story detail, chapter reader, next/previous chapter flow
- Public profile routes: `/@username`, `/u/[username]`, `/profile/[username]`
- Private workspaces: `/me`, `/studio`, `/admin`
- Supporting data, image, cache, and database helpers

Constraints honored in this audit:

- No large runtime refactor.
- No app rewrite.
- No `pnpm build`.
- No new heavy package added.
- No Supabase dependency assumed.

## Executive Summary

ChapMee is already using several good performance patterns:

- Public list surfaces are paginated.
- Reels uses dynamic loading and abort/stale-guarded client pagination.
- Many admin and studio surfaces have route-level loading states.
- Reader chapter data is already split from full hydration, so preview/read states can be controlled.
- Some public lists already use cached wrappers and RPC-backed aggregates.

The main performance risks are concentrated in a few places:

- The story detail page is very heavy and issues many serial and parallel queries.
- The chapter reader is the most sensitive route because it mixes reader content, comments, reactions, inline comments, audio, gates, and chapter navigation in one load.
- Public profile hydration fans out into many queries and only paginates some tabs.
- The public home story hero and many card surfaces still use plain `<img>`/background-image patterns instead of `next/image`.
- Analytics dashboards and growth views still read raw `analytics_events` in a few places instead of always using aggregate tables.
- Some reader navigation still lacks explicit next-chapter prefetch logic.

## Route Performance Map

| Route | Likely shape | Risk level | Notes |
| --- | --- | --- | --- |
| `/` | Reels home, server shell + dynamic feed | Medium | Uses `ReelsShell`, dynamic `LazyReelsFeed`, and server-loaded campaign/config data. Good skeleton coverage, but still a media-heavy feed. |
| `/reels` | Same feed, with optional focus reel | Medium | Adds an extra focused-item lookup. Client feed has abort/stale guards and paginated loading. |
| `/discover` | Server-heavy discovery hub with cached payload | Medium | Uses cached discover data, audio policy, and campaign context. Query-filter variants are dynamic and can still be expensive. |
| `/truyen` | Paginated catalog page | Medium | Uses cached catalog page + cached filter options. Good pagination, but search/filter branches can still be costly. |
| `/media` | Mixed audio/video hub | High | Audio branch hydrates queues and continue-listening state; video branch also does extra story metadata lookups. Good pagination, but the page fans out quickly. |
| `/bang-xep-hang` | Ranking hub with RPC + suspense sections | Medium | Uses RPC-backed ranking data and a suspense fallback for supporters. Better than raw scans, but still a list-heavy page. |
| story detail (`/stories/[slug]` and canonical `/truyen/...`) | Very heavy server page | High | Loads story, chapters, comments, fan data, reviews, boost eligibility, audio, film adaptations, sponsor data, and reading progress. |
| chapter reader (`/stories/[slug]/episodes/[episodeNumber]`) | Heaviest public route | Critical | Loads story, episode, gates, comments, reactions, inline comments, chapter list, audio, campaigns, and persists reading progress. |
| `/@username` / public profile | Heavy profile hydration | High | Profile data fans out into creator extras, works, comments, posts, reels, collections, metrics, badges, messaging, and verification. |
| `/me` | Personal dashboard | Medium | Server-heavy but has route skeleton support and a suspended monetization section. |
| `/studio` | Creator dashboard | Medium | Server-heavy dashboard with campaign injection and view tracking. |
| `/admin` | Admin dashboard | High | Server-heavy and broad, but route-level skeleton exists. The content of subroutes varies from moderate to very heavy. |

## Core Web Vitals Risk Checklist

### LCP

- Likely LCP candidates:
  - Story hero cover on detail pages
  - Reels top-most visible card
  - Media hero or featured card image
  - Public profile hero avatar/cover
- Main risk:
  - Several cover surfaces still use `img` or CSS `background-image` instead of `next/image`, so the browser gets less help with sizing, priority, and responsive source selection.

### INP

- Highest interaction surfaces:
  - Reader chapter navigation
  - Reader comments and inline comments
  - Story tabs and chapter list filtering
  - Public profile tabs and page/sort filters
  - Admin filters and dashboards
- Main risk:
  - The reader page mounts many client components together, so long hydration or expensive state updates will be felt immediately.

### CLS

- Main risk sources:
  - Fallback images without hard width/height or stable aspect ratio
  - Components that switch between fallback and image content after mount
  - Mixed content blocks in the reader that may expand after async hydration
- Good news:
  - Many cover components already have fixed aspect classes and size wrappers.

### TTFB

- Likely expensive routes:
  - Story detail
  - Chapter reader
  - Public profile
  - Media hub
  - Admin dashboard subroutes that aggregate multiple metrics
- Main risk:
  - Some pages still do several dependent queries after the first story/profile lookup instead of leaning more on pre-aggregated or batched helpers.

### Client JS / Bundle

- Risky client-heavy zones:
  - Reader shell and associated sheets/panels
  - Story detail tab shell
  - Public profile tab shell
  - Admin dashboards with charts/tables/modals
  - Studio editors and admin content tools
- Main risk:
  - Multiple `"use client"` components are necessary, but some of the tab shells and action surfaces are broader than they need to be.

## Reader Audit

### What is already good

- Reader chapter data comes from `lib/episodes/getEpisodeReaderData.ts`, which already separates:
  - core story/episode data
  - previous/next chapter hrefs
  - chapter image map
  - optional full-content hydration
- `components/reader/ReaderPage.tsx` keeps the main content layout stable and isolates comments, settings, episode list, and action sheets.
- `components/reader/ChapterListItem.tsx` disables link prefetch in the chapter list, which prevents an accidental prefetch storm on long stories.
- `components/reader/ReaderEndNavigation.tsx` exposes next/previous chapter navigation cleanly.

### Issues found

1. Reader content load is still too broad.
   - The chapter reader page loads story metadata, episode data, chapter list, comments, reactions, inline comments, audio metadata, campaign data, reward-gate state, early-access state, and reading progress before render.
   - File references:
     - `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`
     - `lib/episodes/getEpisodeReaderData.ts`
     - `components/reader/ReaderPage.tsx`

2. No explicit next-chapter prefetch path was found.
   - The reader has next/previous chapter hrefs, but there is no dedicated `router.prefetch` or effect-driven prefetch for the next and previous chapter.
   - `TrackedNextChapterLink` is a normal `Link`; it does not add special warm-up behavior.

3. Reader chapter list and navigation are missing a unified stale-request strategy.
   - The list is server-provided, but user actions like chapter search/filtering can still churn state.
   - There is no reader-specific abort/prefetch helper analogous to the Reels feed's request guards.

4. Reader route has no obvious dedicated loading boundary.
   - I found route-level loading files for many app areas, but not for the story detail or chapter reader route segments.
   - That makes cold transitions more dependent on the global fallback.

5. Reader comments and sidebar features can delay the main content path.
   - Comments, reactions, inline comments, and sidebar components are coupled into the same page load.
   - This is not incorrect, but it is the first place to split if we need the reader to feel faster.

### Reader optimization target

- Prefetch next and previous chapter details on hover or after idle when the reader is visible.
- Add a reader-specific skeleton/loading boundary.
- Keep chapter content loading separate from comments/reactions/sidebar hydration where possible.
- Cache chapter content and list data more aggressively where the access model allows it.
- Avoid repeated full-list reloads when only navigation state changes.

## Image and Media Audit

### What is already good

- `lib/images/get-story-image.ts` already carries variant-aware sizing metadata and `sizes` guidance.
- `components/common/ChapMeeCover.tsx` has fixed aspect and width/height props in the wrapper.
- `components/reels/ReelsBackground.tsx` uses explicit `loading` and `fetchPriority` for the active item.
- Media and story cards generally set stable layout wrappers.

### Issues found

1. Public story hero still uses a CSS background image.
   - `components/story/StoryHero.tsx` renders the cover via `backgroundImage` inside a fixed box.
   - That avoids layout shift, but it gives up `next/image` features like responsive source selection, priority handling, and explicit image optimization.

2. Several card surfaces still use raw `<img>`.
   - `components/stories/StoryCover.tsx`
   - `components/common/ChapMeeCover.tsx`
   - `components/media/MediaVideoCard.tsx`
   - `components/reels/ReelsBackground.tsx`
   - This is workable, but it means the image system is only partly unified.

3. I did not find `next/image` usage in the public app surface.
   - That means the codebase is not yet taking advantage of Next image optimization anywhere I checked.

4. Fallback cover behavior is mostly stable, but some surfaces still depend on client-side state to reveal the final image.
   - That can be fine, but it should be watched for hero/LCP surfaces.

### Image optimization target

- Keep stable aspect ratios everywhere.
- Use the `story-images` variant metadata already present in `lib/images/get-story-image.ts`.
- Promote hero/LCP surfaces to `next/image` first.
- Keep list/card images lazy and bounded.
- Avoid shipping original-size imagery into repeating list surfaces.

## Data, Cache, and Fetch Audit

### What is already good

- `lib/discover/getDiscoverHomeData.ts` uses `unstable_cache` with a 60-second window for the common anonymous surface.
- `lib/stories/getPublicStoriesCatalogCached.ts` routes catalog work through a unified cached helper.
- Reels pagination uses a client-side fetch path with stale-response guards and abortable fetches.
- Public rankings lean on RPC helpers rather than raw event scans in the page layer.

### Issues found

1. Some high-value surfaces still fan out into many queries.
   - Story detail and public profile are the biggest examples.

2. Raw event scans are still present in analytics/growth code.
   - `lib/data/growth-dashboard.ts` reads from `analytics_events` directly for counts, distinct users, and top stories.
   - That is acceptable for internal dashboards at smaller scale, but it should not be the long-term shape for the busiest analytics views.

3. Discover caching is effective only on the common anonymous path.
   - Query/search and some tab variants intentionally bypass cache.
   - That is correct behavior, but it means those paths should be watched as data volume grows.

4. Media hub audio/video pages still do per-page hydration work that scales with the number of featured items and story IDs.
   - `lib/media/media-hub-data.ts`
   - In the audio branch, queue hydration is repeated story-by-story.

5. Public profile hydration is conditionally paginated, but still broad.
   - `lib/profile/get-public-profile.ts`
   - Good pagination exists for tabs, but the first render still fetches many helper datasets.

### Cache target

- Keep cached wrappers for public catalog/discover surfaces.
- Move analytics dashboards to aggregate tables or RPCs where available.
- Keep raw event reads out of top-level public or interactive surfaces.
- Revisit media hub and profile hydration once route performance work begins.

## Bundle and Client JS Audit

### What is already good

- Reels uses a dynamic import boundary for the feed.
- Many admin and studio routes already have loading boundaries and suspense islands.
- Some heavy client workflows already use request guards and deferred loading patterns.

### Issues found

1. `"use client"` is broader than ideal in a few public surfaces.
   - `components/story/StoryDetailPage.tsx`
   - `components/story/StoryTabs.tsx`
   - `components/profile/PublicProfilePage.tsx`
   - `components/profile/PublicProfileTabs.tsx`
   - `components/reader/ReaderPage.tsx`
   - `components/reader/ReaderHeader.tsx`
   - These are justified today, but they represent the biggest bundle surface for public routes.

2. Some rich media/editor/player/admin blocks should remain dynamic imports where possible.
   - Reels already does this well.
   - The same approach should be preserved for admin charts, editors, and media players.

3. Third-party/script surfaces were not the primary bottleneck in this audit.
   - I did not see a new obvious script regression.

### Bundle target

- Keep public page shells server-first whenever possible.
- Push truly interactive subpanels behind dynamic imports.
- Avoid promoting utility tabs and read-only sections into giant client islands.

## Database and Index Audit

### Good existing signals

- `analytics_events` already has indexes in the legacy migration set.
- Many public list queries already apply `limit`, `offset`, and `status` filters.
- Several ranking surfaces use RPCs designed for aggregated access.

### Issues found

1. Raw analytics reads are still used in dashboards.
   - `lib/data/growth-dashboard.ts`
   - This is the main place where a future aggregate table would pay off.

2. Story detail still combines several independent queries that could benefit from targeted RPCs or denormalized summary rows.

3. Reader navigation needs fast access to adjacent chapter metadata.
   - Current implementation already returns previous/next chapter hrefs, which is good.
   - The next step is to make that information cheaper to obtain on the critical path.

4. Media hub queries may need additional composite support if volume grows.
   - Especially the combinations around published status, visibility, origin, sort order, and paging.

### DB target

- Keep using RPCs and aggregates for ranking/analytics surfaces.
- Add or validate composite indexes for the busiest public list filters before adding more query fanout.
- Avoid broad full-table scans in any route that a user can hit repeatedly.

## Mobile UX Audit

### What is already good

- Mobile bottom navigation is fixed and compact.
- Reader mobile controls are dense but usable.
- Reels uses a dedicated mobile-first feed experience.
- Public profiles and catalogs already have mobile-friendly list pagination.

### Issues found

1. Reader transition experience can feel heavy on mobile.
   - The route is dense and loads many interactive pieces at once.

2. Search/filter flows on long lists still need care.
   - Story chapter search and profile page tab switching are the most sensitive mobile interactions.

3. The chapter list and media hubs should continue to prefer explicit pagination over endless scroll.
   - This is already the direction of the codebase, and it should stay that way.

## Cleanup Code Rubbish

This audit did not find "delete this feature" style cleanup opportunities.

What does look worth trimming later:

- Over-wide client boundaries in read-only page shells
- Repeated image fallback logic that could share one component path
- Duplicate analytics reads that could become aggregate-backed helpers
- Reader-side coupling between content, comments, reactions, and sidebar hydration

## Quick Wins

1. Add dedicated loading boundaries for story detail and chapter reader routes.
2. Prefetch next/previous chapter on reader hover or idle.
3. Promote public hero/LCP images to `next/image` first.
4. Keep chapter list pagination and search bounded.
5. Move the busiest growth/admin analytics views away from raw `analytics_events` reads.
6. Split any reader-side optional panels into later hydration where safe.

## High-Impact Refactors

1. Create a reader prefetch helper that warms adjacent chapter data and chapter list metadata.
2. Introduce a small story summary source for the story detail page so the first render does not need to fan out so widely.
3. Move profile tab hydration into smaller server queries or suspense-backed sections.
4. Replace the most visible public cover/image surfaces with `next/image` and variant-aware sizes.
5. Formalize aggregate-backed analytics helpers for growth/admin dashboards.

## Risky Changes To Avoid

- Rewriting the reader into a fully client-rendered experience.
- Replacing bounded pagination with unbounded infinite scroll.
- Removing server-side cache layers before a replacement exists.
- Moving admin analytics back to raw event scans on the public request path.
- Adding a heavy cache/query library just to solve a few well-scoped pages.

## Proposed Implementation Order

1. Reader route loading and prefetch.
2. Public image/LCP upgrades.
3. Story detail query trimming.
4. Public profile hydration trimming.
5. Analytics raw-scan reduction.
6. Media hub follow-up if load tests still show pressure.

## Validation Plan Without Default `pnpm build`

1. `git status`
2. Search codebase for:
   - `"use client"`
   - `next/image`
   - `fetch(`
   - `dynamic(`
   - `loading.tsx`
   - `router.prefetch`
   - `prefetch=`
   - `analytics_events`
   - raw `count(*)` or event scan patterns
3. Run the app locally with `pnpm dev` or the existing dev server and inspect:
   - `/`
   - `/reels`
   - `/discover`
   - `/truyen`
   - `/media`
   - `/bang-xep-hang`
   - a story detail page
   - a chapter reader page
   - `/@username`
   - `/me`
   - `/studio`
   - `/admin`
4. Use browser screenshots for reader/media/profile transitions if visual QA is needed.
5. Use `EXPLAIN` or server logging for any query that looks suspiciously broad.
6. Do not run `pnpm build` as the default validation step for this pass.

## Files Inspected

- `app/page.tsx`
- `app/reels/page.tsx`
- `app/discover/page.tsx`
- `app/truyen/page.tsx`
- `app/media/page.tsx`
- `app/bang-xep-hang/page.tsx`
- `app/stories/[slug]/page.tsx`
- `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`
- `app/profile/[username]/page.tsx`
- `app/u/[username]/page.tsx`
- `app/me/page.tsx`
- `app/studio/(workspace)/page.tsx`
- `app/admin/page.tsx`
- `lib/episodes/getEpisodeReaderData.ts`
- `lib/stories/get-story-chapters.ts`
- `components/reader/ReaderPage.tsx`
- `components/reader/ReaderHeader.tsx`
- `components/reader/ReaderEndNavigation.tsx`
- `components/reader/ChapterListItem.tsx`
- `components/reader/EpisodeListSheet.tsx`
- `components/story/StoryDetailPage.tsx`
- `components/story/StoryHero.tsx`
- `components/story/StoryChaptersTab.tsx`
- `components/story/StoryTabs.tsx`
- `components/profile/PublicProfilePage.tsx`
- `components/profile/PublicProfileTabs.tsx`
- `components/common/ChapMeeCover.tsx`
- `components/stories/StoryCover.tsx`
- `components/media/MediaVideoCard.tsx`
- `components/media/MediaAudioCard.tsx`
- `components/reels/ReelsFeed.tsx`
- `components/reels/ReelsBackground.tsx`
- `components/reels/ReelsShell.tsx`
- `components/ui/navigation-skeletons.tsx`
- `lib/discover/getDiscoverHomeData.ts`
- `lib/discover/getDiscoverDataCached.ts`
- `lib/stories/getPublicStoriesCatalogCached.ts`
- `lib/media/media-hub-data.ts`
- `lib/reels/getReelsItems.ts`
- `lib/data/growth-dashboard.ts`
- `lib/profile/get-public-profile.ts`
- `SEO_AUDIT_REPORT.md`
- `docs/performance-audit.md`
- `docs/performance-checklist.md`

## Issues Found

- Story detail is query-heavy and likely one of the top TTFB contributors.
- Chapter reader is the highest-risk route for latency and hydration cost.
- Reader next/previous chapter prefetch is not explicitly implemented.
- Story hero and several image surfaces still use non-`next/image` rendering.
- Public profile hydration is broad and should be trimmed if that route starts to dominate.
- Growth dashboards still scan raw `analytics_events`.
- Story detail and chapter reader do not have a clearly dedicated route-level loading skeleton in the route tree I inspected.

## Suggested Next Prompt

`Implement the first performance pass: add reader route loading/prefetch improvements, then trim the public story detail and profile pages only where the audit identified the highest TTFB and hydration risk. Keep the existing UX, do not add heavy packages, and verify with targeted route checks instead of pnpm build.`

