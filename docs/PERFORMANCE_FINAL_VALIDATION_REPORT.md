# ChapMee Final Performance Validation Report

Date: 2026-06-03

Scope: lightweight validation after the reader prefetch, route transition, image/font/script, and data/cache/database optimization passes. This pass intentionally avoids large feature work and does not run `pnpm build` by default.

## Summary

- Dev server was already running on `localhost:3000`.
- Main public routes were checked with a mix of in-app browser QA and HTTP smoke checks.
- `npm run typecheck` passed.
- Follow-up completion added a client-side timeout guard for reader content prefetch so a slow background request cannot stay pending indefinitely.
- No hard-coded story/media image URLs using `localhost`, `127.0.0.1`, or `/public/uploads` were found in the checked app/component/lib/source areas.
- Public route import grep did not find obvious Admin/Studio imports in `/discover`, `/truyen`, `/media`, or `/bang-xep-hang` public surfaces.
- `pnpm build` was not run because this was validation-only work, typecheck passed, and this prompt did not introduce global layout/routing/font/Next config changes requiring a production build.

## Routes Tested

| Route | Result | Notes |
| --- | --- | --- |
| `/` | Partial pass | Browser opened successfully with title `Reels | ChapMee` and no console errors. HTTP smoke timed out at 45s, so home/Reels remains a dev-performance risk. |
| `/discover` | Partial pass | HTTP returned 200 with title `Khám phá truyện, audio, video và cộng đồng | ChapMee` in about 23.5s. Browser navigation timed out in one batch, so discover remains a server/query/render bottleneck candidate. |
| `/truyen` | Pass | Browser and HTTP checks passed. HTTP returned 200 in about 1.5s. No console errors observed. |
| `/media` | Pass | Browser and HTTP checks passed. HTTP returned 200 in about 1.1s. No YouTube iframes rendered in the initial list state. |
| `/bang-xep-hang` | Pass with caution | Browser opened with title `Bảng xếp hạng truyện và tác giả | ChapMee`; no console errors observed. Browser route took about 45.7s once, while a warmed HTTP check returned 200 in about 0.9s. |
| Story detail | HTTP pass | `/truyen/group-chat-khong-co-toi-s.5000000004` returned 200 in about 3.8s. Browser CDP navigation timed out during batch QA. |
| Chapter reader | Pass with prefetch caveat | Chapter 1 and chapter 2 opened successfully, no console errors observed. Chapter navigation links were present. Prefetch logs were not reliably observed in the browser console. |
| `/@thaiminhtrong` | HTTP pass | Returned 200 in about 2.0s. |
| `/me` | HTTP pass with caution | Returned 200 in about 18.6s. This route remains a personal dashboard data/render risk. |

## Reader Prefetch Status

Validated sample:

- Story: `Group Chat Không Có Tôi`
- Chapter 1: `/truyen/group-chat-khong-co-toi-s.5000000004/chuong/group-chat-khong-co-toi-chuong-1-c.6000000010`
- Chapter 2: `/truyen/group-chat-khong-co-toi-s.5000000004/chuong/group-chat-khong-co-toi-chuong-2-c.6000000011`

Observed:

- Chapter 1 loaded with title `Tên ghim đầu tiên - Group Chat Không Có Tôi`.
- Chapter 1 exposed a next chapter link to chapter 2.
- Chapter 2 loaded with title `Ảnh tập thể bị che - Group Chat Không Có Tôi`.
- Chapter 2 exposed a previous chapter link to chapter 1.
- No production console errors were observed during reader checks.
- Follow-up HTTP checks against `/api/reader/chapter-content?...&prefetch=1` returned 200 for chapter 1 and chapter 2. After the route warmed, both calls completed in about 1.4s.
- `src/lib/reader/reader-prefetch.ts` now aborts background prefetch fetches after 8s. This keeps reader navigation/content responsive if a dev rebuild, network issue, storage fetch, or access check stalls the prefetch request.

Caveat:

- The browser console did not show `[reader-prefetch]` logs during this validation run. The hook/import wiring exists in `hooks/useChapterPrefetch.ts` and `components/reader/ReaderPage.tsx`, but prefetch cache-hit behavior should still be verified once with DevTools Network or Lighthouse user-flow tooling in a stable browser session.
- A direct HTTP probe to `/api/reader/chapter-content?...&prefetch=1` timed out once during the earlier run, and the first call after a code rebuild took about 19.9s. Warm checks were much faster, so this currently looks like dev cold/rebuild cost rather than a consistent endpoint failure.

## Image And CLS Checks

- `ChapMeeCover` / story cover surfaces remain the expected 3:4 story/chapter cover pattern.
- `aspect-video` grep hits were limited to video/film/studio/preview contexts, including YouTube/video card components. No suspicious story catalog cover misuse was found in the checked output.
- `/media` initial browser state reported no bulk YouTube iframe rendering.
- Grep found no hard-coded content image URLs containing `localhost`, `127.0.0.1`, or `/public/uploads` in the checked `app`, `components`, `lib`, and `src` TypeScript/CSS files.
- Image layout shift was not visually obvious in browser checks, but no Lighthouse CLS run was performed in this pass.

## Route Transition And Loading State

- Direct navigation among `/`, `/truyen`, `/media`, and `/bang-xep-hang` showed stable shell behavior where browser checks completed.
- Skeleton/loading files from the previous optimization passes are present for the public heavy routes and reader surfaces.
- No stale-data race condition was observed in this validation pass, but fast filter typing/clicking was not exhaustively load-tested with artificial latency.
- Browser automation was flaky on some heavy routes, which matches the remaining performance risk rather than a confirmed functional break.

## Bundle And Client Scope

- Public route import grep did not find obvious Admin/Studio module imports in the checked public route/component areas.
- Dynamic/lazy loading from the prior passes is still wired for reader prefetch and heavy public interactive surfaces.
- Remaining `"use client"` usage is concentrated in interactive reader, ranking, media, and filter controls. `components/reader/ReaderPage.tsx` is still a relatively large client component and remains a future bundle-splitting candidate.

## Data And Cache Status

- Story catalog cache helper uses `unstable_cache` with a short public revalidate window and `story-catalog` tag.
- Media hub stats use `unstable_cache` with a longer public revalidate window and `media-hub` tag.
- Ranking reads snapshots and aggregate metrics before live fallback paths, reducing the chance of raw event scans on every request.
- Reader data shape was previously reduced by fetching previous/next chapter links with targeted `limit(1)` queries rather than loading all chapters.
- Pagination smoke checks on `/truyen`, `/media`, and ranking routes did not show empty or broken responses.

## Core Web Vitals Risk Checklist

| Area | Status | Risk |
| --- | --- | --- |
| LCP | Needs follow-up | `/`, `/discover`, `/me`, and one `/bang-xep-hang` browser run were slow in dev. Confirm LCP candidates with Lighthouse before deploy. |
| CLS | Mostly OK | Fixed aspect-ratio cover/media containers are in place. Need real Lighthouse/browser Performance panel confirmation for footer/ad slots. |
| INP | Mostly OK | Filters and route transitions use transition/abort patterns from earlier passes. Heavy reader/Reels interactions still need user-flow testing. |
| TTFB | Needs follow-up | Discover and `/me` timings suggest server data or render work remains heavy. |
| JS bundle | Mostly OK | No obvious Admin/Studio public imports found. Large reader client shell remains a future optimization target. |
| Third-party scripts | Mostly OK | YouTube iframe bulk rendering was not observed on `/media`; reader content is not blocked by iframes in the tested flow. |

## Commands Run

```powershell
git status --short
Get-NetTCPConnection -LocalPort 3000
npm run typecheck
rg -n "/public/uploads|public/uploads|localhost.*(jpg|jpeg|png|webp|gif)|127\.0\.0\.1.*(jpg|jpeg|png|webp|gif)" app components lib src -g "*.tsx" -g "*.ts" -g "*.css"
rg -n "aspect-video" app components src -g "*.tsx"
rg -n "@/components/(admin|studio)|@/lib/(admin|studio)|components/(admin|studio)|lib/(admin|studio)" app/discover app/truyen app/media app/bang-xep-hang components/discover components/story-catalog components/media components/rankings -g "*.tsx" -g "*.ts"
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/api/reader/chapter-content?chapterId=60000000-0000-0000-0000-000000000011&prefetch=1"
Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:3000/api/reader/chapter-content?chapterId=60000000-0000-0000-0000-000000000010&prefetch=1"
```

Additional validation:

- In-app browser checks for `/`, `/truyen`, `/media`, `/bang-xep-hang`, and reader chapters.
- HTTP smoke checks for `/discover`, `/truyen`, `/media`, `/bang-xep-hang`, story detail, reader, `/@thaiminhtrong`, and `/me`.
- Local DB lookup was used only to find a real public story/chapter/profile route for validation.

## Build Decision

`pnpm build` was not run.

Reason:

- This prompt requested lightweight validation.
- No large global layout/routing/font/Next config changes were made in this pass.
- `npm run typecheck` passed.
- Known remaining risks are performance/runtime observation risks better checked with Lighthouse or deployment-like profiling, not necessarily by a full build during this validation pass.

## Remaining TODO

- Run Lighthouse or Web Vitals user-flow checks for `/truyen` and a reader chapter in a stable browser session.
- Investigate slow dev timings on `/`, `/discover`, `/me`, and the one slow `/bang-xep-hang` browser navigation.
- Re-test reader prefetch in DevTools Network and confirm the browser sees the `prefetch=1` request/cache behavior. HTTP warm checks are now passing, but browser automation still did not surface the info logs.
- Continue reducing `components/reader/ReaderPage.tsx` client surface if reader bundle size remains high.
- Consider targeted query logging/profiling for Discover and Me dashboard data loading.
