# SEO Center — Final Validation Report

**Date:** 2026-06-03  
**Scope:** Prompt 9 — Metadata engine integration + light end-to-end SEO validation  
**Build:** Not run (per project constraint; `npm run typecheck` passed)

---

## 1. Metadata pages integrated

Public routes now use `resolveSeoMetadata()` → `createNextMetadata()` via `lib/seo/public-page-metadata.ts`.

| Route | Page type | Integration |
|-------|-----------|-------------|
| `/` (Reels home) | `reels` | `metadataForStaticRoute` |
| `/discover` | `discover` | `metadataForStaticRoute` (+ noindex when `?q=`) |
| `/truyen` | `story_catalog` | `metadataForStaticRoute` (+ noindex deep filters) |
| `/truyen-sang-tac` | `story_catalog` | `metadataForStaticRoute` |
| `/truyen-dich` | `story_catalog` | `metadataForStaticRoute` |
| `/media` | `media` | `metadataForStaticRoute` |
| `/bang-xep-hang` | `ranking` | `generateMetadata` → engine |
| `/bang-xep-hang/[type]` | `ranking` | `metadataForStaticRoute` |
| `/bai-viet` | `article` | `metadataForStaticRoute` |
| `/bai-viet/[slug]` | `article` | `metadataForContentPost` (async) |
| `/truyen/[slug]` / story detail | `story_detail` | `metadataForStory` |
| `/truyen/.../chuong/...` | `chapter` | `metadataForChapter` |
| `/@username` (`/u/[username]`) | `profile` | `metadataForProfile` |
| Taxonomy landings (`/the-loai/...`, etc.) | `taxonomy` | `metadataForTaxonomyLanding` |

**Override priority:** `seo_overrides` → entity/fallback → template → global settings (unchanged engine behavior).

**Title template fix:** `createNextMetadata` uses `{ absolute: title }` so root layout `%s | ChapMee` does not duplicate suffix.

---

## 2. Private noindex status

| Route | Mechanism | Dev check |
|-------|-----------|-----------|
| `/admin` | `app/admin/layout.tsx` → `STUDIO_NOINDEX_ROBOTS` | Layout metadata |
| `/studio` | `app/studio/layout.tsx` + workspace layout | `noindex, nofollow` |
| `/me` | `app/me/layout.tsx` | `noindex, nofollow` ✓ |
| `/messages` | `app/messages/layout.tsx` | `noindex, nofollow` |
| `/login`, `/register` | Page `metadata.robots` | `noindex, nofollow` ✓ |
| `/checkout` | `app/checkout/layout.tsx` | Payment flow noindex |
| `/creator/*` | `app/creator/layout.tsx` | noindex |
| Draft/preview | Under `/studio` | Inherits studio noindex |

Policy helper: `isNoIndexPath()` in `lib/seo/noindex-policy.ts` (used by sitemap + metadata engine).

---

## 3. SEO content block status

`SeoContentBlockSlot` mounted on:

- `/discover` — `pageType="discover"`, `routePath="/discover"`
- `/truyen` — `pageType="story_catalog"`, `routePath="/truyen"`
- `/media` — `pageType="media"`, `routePath="/media"`
- `/bang-xep-hang` — via `app/rankings/page.tsx`, `pageType="ranking"`

Not mounted on private routes (admin/studio/me).

---

## 4. Redirect status

- **Runtime:** `proxy.ts` → `applySeoRedirect()` before auth/profile rewrite (Prompt 6).
- **Legacy profiles:** `next.config.ts` permanent redirects `/u/:username` → `/@:username`, `/profile/:username` → `/@:username`; `/creator/*` → `/studio`.
- **Admin redirects:** `/admin/seo/redirects` — create/test via UI; 404 monitor pre-fills `source_path`.
- **Loop protection:** `redirect-service` validates destination ≠ source (existing).

---

## 5. Sitemap / robots status

| URL | Result (dev) |
|-----|----------------|
| `/robots.txt` | 200 — Allow public, Disallow private + legacy profiles |
| `/sitemap.xml` | 200 — sitemap index (rewrite → `/internal/sitemap-index`) |
| `/sitemap/static.xml` | 200 — public static URLs |
| Private in sitemap | Excluded via `isNoIndexPath` / `isBlockedSitemapPathname` |

**Production:** Set `NEXT_PUBLIC_SITE_URL` to production domain (dev shows `localhost` in URLs).

---

## 6. OG image / media asset status

- Resolved via `resolveSeoImageUrl()`: `media_assets` / `storage_assets` id → CDN URL → default OG SVG.
- Localhost / raw upload URLs blocked by `isSafeMetadataUrl()`.
- Story/chapter: entity `coverUrl` fallback when no asset id.
- Dev smoke: `/bang-xep-hang` serves `og-default.svg` (default brand asset path).

---

## 7. Heading status

- No automated H1 crawl in MVP (audit dashboard documents TODO).
- SEO content blocks sanitize markdown (no H1 in blocks).
- Public catalog pages use single page-level H1 per existing components.

---

## 8. Validation run (dev)

| Step | Result |
|------|--------|
| `npm run typecheck` | Pass |
| `/discover` | `robots: index, follow`, OG title present |
| `/bang-xep-hang` | Title + description from engine |
| `/login`, `/me` | `noindex, nofollow` |
| `/robots.txt`, `/sitemap.xml` | OK |
| `pnpm build` | **Not run** — metadata changes are route-level; typecheck sufficient for this prompt |

---

## 9. Files changed (Prompt 9)

**New**

- `lib/seo/public-page-metadata.ts`

**Updated**

- `lib/seo/create-next-metadata.ts` — absolute titles
- `lib/seo/build-metadata.ts` — delegates to engine (async)
- `lib/seo/page-metadata.ts` — exports
- `lib/discovery/taxonomy-landing-route.tsx` — taxonomy via engine
- `app/page.tsx`, `app/discover/page.tsx`, `app/truyen/page.tsx`, `app/truyen-sang-tac/page.tsx`, `app/truyen-dich/page.tsx`, `app/media/page.tsx`, `app/rankings/page.tsx`, `app/bang-xep-hang/page.tsx`, `app/bang-xep-hang/[type]/page.tsx`, `app/bai-viet/page.tsx`, `app/u/[username]/page.tsx`, `app/stories/[slug]/page.tsx`, `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`, `app/studio/layout.tsx`

---

## 10. Known remaining TODO

1. **Heading H1 audit** — lightweight HTML fetch not implemented (audit tab TODO).
2. **Production URL** — verify canonical/OG after `NEXT_PUBLIC_SITE_URL` on staging/prod.
3. **Story/chapter smoke** — requires published data in local DB; engine wired, manual check when data exists.
4. **Legacy `/author`, `/creators`** — confirm redirects in `next.config` if still linked externally.
5. **Admin override smoke** — create override for `/discover` in admin and re-fetch page to confirm override wins.

---

## 11. Build decision

**`pnpm build` not executed.** Reason: changes are localized to `generateMetadata` helpers and do not alter layout tree or global CSS; TypeScript check passed. Run full build before deploy.
