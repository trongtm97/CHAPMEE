# SEO Audit Report

## Executive Summary

ChapMee now has a much cleaner SEO foundation after this pass:

- Reels has a single page-level `h1` and repeated reel titles were downgraded to `h2`.
- Private and transactional routes were marked `noindex`.
- `/about` and `/contact` were added with canonical metadata.
- `localhost` fallback leakage was removed from canonical/metadata generation.
- Search pages are now `noindex`.
- A reusable heading helper layer was added so future pages can separate semantics from styling.

Remaining risk is mostly content completeness:

- `/privacy`, `/terms`, `/content-policy`, and the `/legal/*` policy pages are still placeholder pages and are intentionally `noindex` for now.
- Some reusable components outside the public SEO surface still hard-code headings; those are low risk and mostly internal.

## Critical Issues

1. Reels had multiple `h1` elements in the feed DOM.
   - Fixed by adding one hidden page heading in `ReelsShell` and downgrading item-level titles to `h2`.
2. Canonical/metadata code could fall back to `http://localhost:3000`.
   - Fixed in [`lib/seo/metadata.ts`](./lib/seo/metadata.ts).

## High Priority Issues

1. Private/transactional routes were missing reliable `noindex`.
   - Fixed for `login`, `register`, `wallet`, `coin`, `checkout`, `creator`, `write`, `vip`, `onboarding`, and `search`.
2. Placeholder legal pages had no clear heading/metadata strategy.
   - Fixed by giving them `h1` content and `noindex` metadata until real policy copy exists.
3. The reusable `SectionHeader` component hard-coded a heading level.
   - Fixed by making the heading tag configurable.

## Heading Structure Issues

### Fixed

- [`components/reels/ReelTextOverlay.tsx`](./components/reels/ReelTextOverlay.tsx): `h1` -> `h2` for reel item titles.
- [`components/reels/ReelsCard.tsx`](./components/reels/ReelsCard.tsx): `h1` -> `h2` for reel episode title.
- [`components/reels/ReelsShell.tsx`](./components/reels/ReelsShell.tsx): added a single visually hidden `h1` for the page.
- [`components/ui/SectionHeader.tsx`](./components/ui/SectionHeader.tsx): now supports semantic heading level via `as`.

### Still Worth Watching

- Some internal cards and dialogs use headings for hierarchy, but they are not part of the public crawl surface.
- [`components/profile/PublicProfileHeader.tsx`](./components/profile/PublicProfileHeader.tsx) still contains an `h1`, but it is unused in the current route tree.

## Route Metadata Matrix

| Route | Index? | Canonical | Current Title | Current `h1` | Notes | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Yes | `/` | `Reels | ChapMee` via template | Hidden `Reels ChapMee` | Feed home is now semantically valid without UI disruption | High |
| `/reels` | Yes | `/reels` | `Reels | ChapMee` via template | Hidden `Reels ChapMee` | Public feed route is crawlable; item titles are `h2` | High |
| `/discover` | Yes | `/discover` | `Khám phá truyện` | Visible page heading in layout | Query/filter variants are `noindex` | High |
| `/community` | Yes | `/community` | `Cộng đồng` | `Cộng đồng` | Public community landing is fine | High |
| `/stories/[slug]` | Yes if public/published | Canonical story URL | Story title | Story title | Uses story metadata + JSON-LD | Critical |
| `/stories/[slug]/episodes/[episodeNumber]` | Yes if free/public/published | Canonical chapter URL | Chapter metadata title | Reader chapter heading in reader UI | Uses chapter metadata + JSON-LD | Critical |
| `/@username` | Yes if active public profile | `/@username` | `Display Name (@username)` | Profile hero heading | Internally rewritten from `/u/[username]` / `/profile/[username]` / `/tac-gia/[username]` | Critical |
| `/about` | Yes | `/about` | `Giới thiệu ChapMee` | `Giới thiệu ChapMee` | Added in this pass | Medium |
| `/contact` | Yes | `/contact` | `Liên hệ ChapMee` | `Liên hệ ChapMee` | Added in this pass | Medium |
| `/community-guidelines` | Yes | `/community-guidelines` | `Quy định cộng đồng` | `Quy định cộng đồng` | Metadata added; safe to index | Medium |
| `/privacy` | No for now | `/privacy` | `Chính sách quyền riêng tư` | `Chính sách quyền riêng tư` | Placeholder content, intentionally `noindex` | Medium |
| `/terms` | No for now | `/terms` | `Điều khoản sử dụng` | `Điều khoản sử dụng` | Placeholder content, intentionally `noindex` | Medium |
| `/content-policy` | No for now | `/content-policy` | `Chính sách nội dung` | `Chính sách nội dung` | Placeholder content, intentionally `noindex` | Medium |
| `/login` | No | `/login` | Private auth page | `Đăng nhập để tiếp tục` | `noindex` added | High |
| `/register` | No | `/register` | Private auth page | `Create your reader account` | `noindex` added | High |
| `/wallet` | No | `/wallet` | Private wallet page | `Ví coin & giao dịch` | `noindex` layout added | High |
| `/coin` | No | `/coin` | Private coin entry page | Redirect | `noindex` layout added | High |
| `/checkout/[id]` | No | `/checkout/[id]` | Private checkout detail | `Checkout` | `noindex` layout added | High |
| `/creator/*`, `/write`, `/vip`, `/onboarding` | No | Canonical app route | Private/internal | Varies | `noindex` layout added | High |
| `/search` | No | `/search` | `Tìm kiếm` | Search page view | Search pages are now always `noindex` | High |

## Canonical / URL Issues

- Fixed:
  - `buildCanonicalUrl()` no longer falls back to localhost.
  - Public profile canonical remains `/@username`.
  - Legacy profile routes are still rewrite-compatible and should not be canonical.
- Good:
  - Story and chapter canonical URLs use public-code routes.
  - Search and query/filter pages canonicalize clean URLs.
- Good:
  - `/legal/[slug]` now resolves policy and footer namespaces cleanly.

## Index / Noindex Issues

### Fixed

- Auth pages: `/login`, `/register`.
- Private areas: `/wallet`, `/coin`, `/checkout`, `/creator`, `/write`, `/vip`, `/onboarding`.
- Search: `/search` is now always `noindex`.
- Placeholder legal pages: `/privacy`, `/terms`, `/content-policy`.

### Fixed

- `/legal/privacy`
- `/legal/terms`
- `/legal/content-policy`
- `/legal/copyright`
- `/legal/dmca`
- `/legal/advertising-policy`
- `/legal/community-guidelines`

## Sitemap / Robots

- `robots.txt` already exists and is wired through `app/robots.ts`.
- `sitemap.ts` already exists and uses segmented sitemap generation.
- Sitemap builders already exclude private routes and canonical duplicates.
- Safe note: the sitemap generator depends on site URL configuration being valid, which is now cleaner because the code no longer hardcodes localhost.

## Internal Linking Issues

### Fixed or Validated

- Public profile links resolve to `/@username` through `lib/profile/profile-url.ts`.
- Story/chapter links use canonical story/chapter route helpers.
- Footer/legal link surfaces remain crawlable through `<a>`/`Link`.

### Deferred

- I did not rewrite the entire internal-link graph.
- I did not replace every legacy profile path in the codebase; the canonical profile helper already points to `/@username`.

## Structured Data

### Safe and Present

- Story detail: `Book` + `BreadcrumbList`
- Chapter reader: `Article` + `BreadcrumbList`

### Safe and Present

- `WebSite` / `Organization` JSON-LD at the global layout level
- `Person` JSON-LD for public profiles

### Safe Opportunities Not Added

- `BreadcrumbList` for `/about`, `/contact`, and taxonomy pages

## Image SEO

- Story and chapter OG image handling is already in place.
- `resolvePublicUrl()` continues to sanitize media URLs.
- No fake image data was introduced.
- I did not bulk-edit every avatar/cover alt string because the current public surfaces already have sane fallbacks and that would be a broader content pass.

## Pagination / Indexability

- Story/profile list pagination remains crawlable through normal URLs.
- Search pages are noindex.
- Discover query/filter variants are noindex when they represent thin duplicates.

## Legal / AdSense Pages

### Fixed

- `/about`
- `/contact`
- `/community-guidelines`

### Fixed

- Full `/legal/*` route coverage for the current policy namespaces

## Accessibility Notes

- Reels now has a legitimate page heading for screen readers.
- Section headings are no longer tied to a fixed semantic tag.
- The app still uses correct landmarks in the shell layout.

## Performance SEO Notes

- No risky rendering rewrite was introduced.
- The changes stayed semantic and metadata-focused.
- Build completed successfully after the fixes.

## Fixed in This Pass

- Added `components/seo/*` heading helpers.
- Updated `SectionHeader` to support semantic heading levels.
- Added hidden `h1` to Reels shell.
- Downgraded repeated Reels item headings from `h1` to `h2`.
- Added `noindex` coverage for private/transactional routes.
- Added `/about` and `/contact`.
- Added metadata for `/community-guidelines`.
- Removed localhost fallback from SEO URL generation.
- Added `Organization` and `WebSite` JSON-LD at the root layout.
- Added `Person` JSON-LD for public profiles.
- Added `/legal/[slug]` support for policy and footer routes.
- Expanded footer legal link defaults to cover the policy set.
- Added placeholder noindex pages for `/privacy`, `/terms`, and `/content-policy`.

## Deferred TODO

- Replace the placeholder `/legal/*` bodies with verified policy content.
- Review internal legacy route usage and move all public links to canonical helpers consistently.
- Optionally extend semantic heading helpers to more reusable sections outside the SEO-critical paths.

## Validation Checklist

- [x] `git status`
- [x] Search headings
- [x] Search metadata / canonical / robots / sitemap
- [x] Search bad profile routes
- [x] Search localhost leaks in SEO code
- [x] `npm run build`
- [x] Reels / Discover / Community / Story / Profile semantics checked in code

## Build Result

- `npm run build` succeeded.
- `pnpm` was not available as a local command in this environment, so the build validation was completed with `npm run build`.
