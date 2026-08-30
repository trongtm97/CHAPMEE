# SEO Center — Audit hiện trạng & Kế hoạch triển khai

**Ngày audit:** 2026-06-03  
**Phạm vi:** Audit code + thiết kế. Không triển khai feature lớn trong prompt này.  
**Stack:** Next.js App Router, TypeScript, DB tự quản (PostgREST client qua `lib/data/server` + migrations trong `db/migrations/legacy/`).

---

## 1. Executive summary

ChapMee **đã có nền SEO khá đầy đủ** — không phải greenfield:

| Khối | Trạng thái |
| --- | --- |
| Metadata helpers (`lib/seo/*`) | ✅ Có (~38 file) |
| SEO Control Center admin (`/admin/seo`) | ✅ Có (rules, templates, audit, sitemap/robots preview, redirects) |
| DB: `seo_rules`, `url_redirects`, templates, audit logs | ✅ Có (migrations 134, 137, 141, 158…) |
| Segmented sitemap + `robots.ts` | ✅ Có |
| JSON-LD (Organization, WebSite, Book, Article, Person, Breadcrumb) | ✅ Một phần |
| Redirect Manager (DB + admin UI) | 🟡 MVP |
| SEO Content Blocks (chèn trước footer) | ❌ Chưa có |
| 404 Monitor | ❌ Chưa có |
| Per-page metadata override (từng URL) | 🟡 Chỉ theo `page_type` / entity fields |
| OG image qua `media_assets` | 🟡 Story cover có; default `/og-default.svg`; nhiều trang thiếu OG |
| Heading governance | 🟡 Chuẩn + audit; vài trang lệch |

**Kết luận:** Mục tiêu không phải “xây SEO Center từ zero”, mà **hoàn thiện RankMath-style layer** trên nền hiện có: bổ sung Content Blocks, 404 Monitor, per-page overrides, đồng bộ sitemap/robots/redirect, và gom metadata về một pipeline (`buildSeoMetadata`).

---

## 2. Current SEO status

### 2.1 Kiến trúc metadata hiện tại

```
app/layout.tsx
  └── buildDefaultMetadata()          ← root title template, default OG
app/**/page.tsx
  ├── export const metadata           ← static (rankings, terms, layouts…)
  └── export async function generateMetadata  ← dynamic routes
lib/seo/build-metadata.ts             ← story / chapter / content post / policy / announcement
lib/platform-content/seo-governance.ts ← buildSeoMetadata() + rule lookup
lib/seo/noindex.ts                    ← DEFAULT_*_ROUTE_PATTERNS, shouldNoIndexPath()
lib/seo/rules.ts                      ← seo_rules DB + in-memory fallback
lib/seo/metadata.ts                   ← canonical, OG default, descriptions
lib/discovery/taxonomy-*.tsx          ← taxonomy landing metadata factory
```

**Canonical URL:** `buildCanonicalUrl()` — phụ thuộc `NEXT_PUBLIC_SITE_URL`, không fallback localhost (đã fix theo `SEO_AUDIT_REPORT.md`).

**Robots:** `STUDIO_NOINDEX_ROBOTS` + `buildRobotsMeta()`; layout-level noindex cho `/studio`, `/me`, `/wallet`, `/messages`, v.v.

### 2.2 Admin SEO hiện có

| Route | Chức năng |
| --- | --- |
| `/admin/seo` | SEO Control Center — tabs: overview, taxonomy, rules, metadata, headings, sitemap, robots, audit, logs, urls |
| `/admin/seo/rules` | CRUD SEO rules theo route pattern |
| `/admin/seo/rules/[id]` | Sửa rule |
| `/admin/seo/audit` | Trang audit riêng |
| `/admin/seo/urls` | Redirect manager + cảnh báo URL |

**Studio-side preview:** `components/studio/SEOAssistantPanel.tsx`, `ChapterSeoSection.tsx` — preview title/description/canonical khi tạo truyện/chương.

### 2.3 JSON-LD

| Trang | Schema |
| --- | --- |
| Root layout | Organization, WebSite |
| `/truyen/...` (story) | Book, BreadcrumbList |
| `/truyen/.../chuong/...` | Article, BreadcrumbList |
| `/@username` (via `/u/`) | Person |
| Taxonomy, bài viết, rankings | ❌ Chưa có ItemList / CollectionPage |

### 2.4 Tài liệu SEO liên quan (đã có)

- `SEO_AUDIT_REPORT.md` — audit pass trước (Reels H1, noindex private routes, legal placeholders)
- `SEO_HEADING_STANDARD.md` — quy ước H1/H2

---

## 3. Route index / noindex matrix

**Chú thích:** `Index` = mặc định khi không có filter/query và content public. `@username` = URL public `/@handle` (rewrite từ `/u/`).

### 3.1 Public — indexable (mục tiêu crawl)

| Route | Canonical | Metadata source | Index mặc định | Ghi chú |
| --- | --- | --- | --- | --- |
| `/` | `/` | `app/page.tsx` → generateMetadata | ✅ | UI = Reels feed; H1 ẩn trong `ReelsShell` |
| `/discover` | `/discover` (+ query khi filter) | `app/discover/page.tsx` | ✅ (query `q` → noindex) | Thiếu OG image |
| `/truyen` | `/truyen` | `app/truyen/page.tsx` | ✅ (deep filter → noindex) | Có OG |
| `/truyen-sang-tac` | `/truyen-sang-tac` | `app/truyen-sang-tac/page.tsx` | ✅ (deep filter → noindex) | Thiếu OG |
| `/truyen-dich` | `/truyen-dich` | `app/truyen-dich/page.tsx` | ✅ (deep filter → noindex) | Thiếu OG |
| `/media` | `/media` | `app/media/page.tsx` | ✅ | Thiếu OG + Twitter |
| `/bang-xep-hang` | `/bang-xep-hang` | Re-export `app/rankings/page.tsx` | ✅ | Có canonical; thiếu OG image |
| `/bang-xep-hang/[type]` | inherited + dynamic title | `app/bang-xep-hang/[type]/page.tsx` | ✅ | |
| `/bai-viet` | `/bai-viet` | `app/bai-viet/page.tsx` | ✅ | |
| `/bai-viet/[slug]` | entity canonical | `buildPublicContentPostMetadata` | ✅ if indexable | Content Hub fields |
| `/@username` | `/@username` | `app/u/[username]/page.tsx` | ✅ if profile public | Rewrite `proxy.ts`; avatar OG có thể không qua media_assets |
| `/truyen/[slug]` | public-code URL | `buildPublicStoryMetadata` | ✅ if published/public | Legacy `/stories/` vẫn serve một số URL |
| `/truyen/[slug]/chuong/[n]` | chapter URL | `buildPublicEpisodeMetadata` | ✅ if free/public | `/stories/.../episodes/` mirror |
| `/reels` | `/reels` | `app/reels/page.tsx` | ✅ | |
| `/reels/[slug]` | reel URL | page-level | ✅ if public | |
| `/the-loai`, `/the-loai/[slug]` | taxonomy | `lib/discovery/taxonomy-landing-pages.tsx` | ✅ | OG = default svg |
| Taxonomy khác (`/tag`, `/boi-canh`, …) | taxonomy path | factory trên | ✅ | ~14 landing types |
| `/community` | `/community` | `app/community/page.tsx` | ✅ | |
| `/community/[postId]` | post URL | generateMetadata | 🟡 | Community post — cần xác nhận index policy |
| `/chinh-sach`, `/chinh-sach/[slug]` | policy URL | `buildPublicPolicyMetadata` | ✅ if seo_indexable | |
| `/thong-bao` (catalog) | `/thong-bao` | generateMetadata | ✅ | |
| `/thong-bao/[slug]` | announcement | `buildPublicAnnouncementMetadata` | Theo `indexable` flag | Default rule: detail → noindex |
| `/about`, `/contact` | fixed | page generateMetadata | ✅ | |
| `/community-guidelines` | fixed | generateMetadata | ✅ | |
| `/search` | clean search URL | `app/search/page.tsx` | ❌ noindex | `follow: true` |

### 3.2 Private / noindex (bắt buộc)

| Route pattern | Cơ chế noindex | Metadata source |
| --- | --- | --- |
| `/admin/**` | robots disallow + auth (`proxy.ts`) | `app/admin/layout.tsx` |
| `/studio/**` | `STUDIO_NOINDEX_ROBOTS` layout | `app/studio/(workspace)/layout.tsx` |
| `/me/**` | layout noindex | `app/me/layout.tsx` |
| `/messages/**` | layout | `app/messages/layout.tsx` |
| `/login`, `/register` | page metadata | explicit robots |
| `/wallet/**`, `/coin/**`, `/checkout/**`, `/vip/**` | layouts | |
| `/onboarding/**` | layout | |
| `/creator/**` | layout (redirect → studio) | |
| `/write/**` | layout | |
| `/notifications` | page | |
| `/settings/**` | DEFAULT_NOINDEX patterns | |
| `/draft/**`, `/preview/**` | DEFAULT_NOINDEX + query `?preview=1` | |
| `/payment/**` | DEFAULT_NOINDEX | (route có thể chưa tồn tại) |
| `/collections/[id]` (private shelf) | page robots | |
| `/legal/[slug]` | placeholder → noindex | |
| `/privacy`, `/terms`, `/content-policy` | `buildPrivateRouteMetadata` | placeholder content |

### 3.3 Legacy / redirect — không index (canonical elsewhere)

| Route | Hành vi | Canonical đích |
| --- | --- | --- |
| `/u/:username` | 301 → `/@username` | `next.config.ts` |
| `/profile/:username` | 301 → `/@username` | next.config |
| `/creators/:id` | 301 + noindex metadata | `/@username` |
| `/author/:id` | permanentRedirect server | `/@username` |
| `/tac-gia` | redirect | `/bang-xep-hang` |
| `/creator/**` | redirect | `/studio/**` |
| `/genres/:slug` | 301 | `/the-loai/:slug` |
| `/story/[slug]` | permanentRedirect | `/truyen/...` |
| `/audio` | redirect | `/media?tab=audio` |
| `/truyensangtac`, `/truyendich`, … | redirect | catalog URLs |
| `/stories/[slug]` | 🟡 **Vẫn indexable** nếu segment có public_code | Nên 301 → `/truyen/...` |
| `/stories/.../episodes/...` | mirror chapter | Nên 301 → `/truyen/.../chuong/...` |
| `/rankings` | 🟡 **Duplicate** `/bang-xep-hang` — **chưa redirect** | Nên 301 → `/bang-xep-hang` |
| `/kham-pha/**` | hub taxonomy legacy | Overlap với `/discover` / taxonomy — cần policy |

---

## 4. Metadata gaps

### 4.1 Nơi metadata được định nghĩa

| Pattern | Files đại diện | Ghi chú |
| --- | --- | --- |
| Root defaults | `app/layout.tsx`, `lib/seo/metadata.ts` | Title template `%s \| ChapMee` |
| Unified builder | `lib/platform-content/seo-governance.ts` → `buildSeoMetadata()` | Dùng cho content post, policy, announcement |
| Entity builders | `lib/seo/build-metadata.ts` | Story, chapter, genre |
| Route-local | ~90+ `page.tsx` / `layout.tsx` | Xem grep `generateMetadata` |
| DB templates | `seo_metadata_templates` + `lib/seo/metadata-templates-store.ts` | Theo `page_type`, chưa wire đầy đủ vào mọi route |
| DB rules | `seo_rules` + `lib/seo/rules.ts` | Route pattern → index, canonical_mode, templates |
| Studio override | Story/chapter SEO fields, Content Hub post fields | Per-entity, không phải per-static-page |

### 4.2 Gaps cụ thể

1. **Static/catalog pages chưa dùng `buildSeoMetadata()`** — metadata hard-code trong từng `page.tsx` (`discover`, `media`, `truyen-dich`, `truyen-sang-tac`, `rankings`).
2. **`DEFAULT_INDEX_ROUTE_PATTERNS`** (`lib/seo/noindex.ts`) thiếu `/truyen-sang-tac`, `/truyen-dich`, `/media`, `/bang-xep-hang/*` — fallback rule có thể null.
3. **Per-URL override** (vd. chỉnh title `/discover` từ admin) — **chưa có bảng**; chỉ có rule theo pattern + template theo page_type.
4. **OG/Twitter không đồng nhất** — nhiều trang chỉ set title/description, bỏ qua `images`.
5. **Taxonomy metadata** — title/description generated; OG luôn `getDefaultOgImage()`.
6. **Profile metadata** — không resolve OG qua `media_assets`; dùng `avatarUrl` raw nếu có.
7. **Content post `og_image_url`** — lưu URL string, chưa bắt buộc `media_asset_id`.
8. **`/rankings`** — duplicate metadata với `/bang-xep-hang` nhưng URL khác → duplicate content risk.

---

## 5. Heading gaps

**Chuẩn:** `SEO_HEADING_STANDARD.md`, `lib/seo/headings.ts`, `lib/seo/content-hub-seo-data.ts` (SEO_HEADING_RULES).

### 5.1 Đã xử lý (theo audit trước)

- Reels: một H1 ẩn (`VisuallyHiddenHeading` trong `ReelsShell`), item titles → H2.
- Search, auth, wallet: noindex (heading ít ảnh hưởng crawl).

### 5.2 Vấn đề còn lại

| Vấn đề | Vị trí | Mức |
| --- | --- | --- |
| H1 metadata ≠ H1 UI | `/discover`: meta “Khám phá truyện…” vs H1 “Khám phá” (`DiscoverHero`) | Warning |
| Hai component StoryHero | `components/story/StoryHero.tsx` vs `components/stories/StoryHero.tsx` — cả hai có H1 | Review (chỉ một được mount/page) |
| Double H1 trong Studio | `app/studio/.../stories/new/page.tsx` (2 H1), `help/page.tsx` + `HelpHero` | OK (noindex) |
| `PublicProfileHeader` vs `PublicProfileHero` | Cả hai có H1; Header có thể unused | Low |
| Card/list H1 | Hầu hết catalog cards dùng H2/H3 — OK | |
| Community story group | `app/community/story/[storyId]/page.tsx` — H1 = story title | OK (1 H1) |
| Ranking | `RankingHero` — 1 H1 | OK |
| Bài viết SEO content | `lib/content-posts/seo-validation.ts` cấm `<h1>` trong body HTML | OK |

**Admin heading tab** (`SeoHeadingsTab`) hiển thị governance rules + audit findings — chưa có automated DOM crawl production.

---

## 6. OG image gaps

| Nguồn | Ảnh OG | Vấn đề |
| --- | --- | --- |
| Default | `/og-default.svg` (`lib/seo/metadata.ts`) | Static public asset — OK làm fallback |
| Story/chapter | `resolvePublicUrl(story.coverUrl)` → cover từ media pipeline | ✅ Đúng hướng media_assets |
| Profile | `data.user.avatarUrl` trực tiếp | Có thể không qua CDN/media_assets |
| Discover, media, catalogs | Không set `openGraph.images` | Fallback root layout — generic |
| Rankings | Không set images | Generic |
| Content post | `og_image_url` / `cover_image_url` string | Cần validate + resolve qua media_assets |
| Creators legacy | `getDefaultOgImage()` only | Route redirect — low risk |
| `lib/media/media-url.ts` | Block `/public/uploads` | ✅ Guard tồn tại |
| `next.config.ts` images | localhost:9000, chapmee.com | Dev MinIO — OG prod cần CDN hostname |

**Khuyến nghị:** `resolveOgImage({ mediaAssetId?, fallbackPath? })` — single resolver; admin chọn OG từ media library.

---

## 7. Redirect gaps

### 7.1 Ba lớp redirect hiện có

1. **`next.config.ts` `redirects()`** — static (creator→studio, profile→@, genres, typo URLs).
2. **`url_redirects` table** — admin-managed 301/302/307/308; lookup trong page via `tryRedirectFromLookupTable()` (`lib/urls/canonical.ts`).
3. **Server `permanentRedirect()`** trong legacy routes (`author`, `creators`, `story`, `truyen` slug canonicalization).

### 7.2 Gaps

| Gap | Đề xuất |
| --- | --- |
| `/stories/*` vẫn serve content | 301 toàn bộ → `/truyen/*` (next.config hoặc middleware) |
| `/stories/*/episodes/*` | 301 → `/truyen/*/chuong/*` |
| `/rankings` duplicate | 301 → `/bang-xep-hang` |
| Redirect **không chạy ở edge** | `proxy.ts` chỉ rewrite `@` + admin auth — **không** lookup `url_redirects` globally |
| `/chapter/[id]` | Legacy UUID chapter — metadata noindex, redirect về `/reels`? Review |
| Internal links vẫn `/rankings` | `ReelsRankingPanel`, docs — đổi sang `/bang-xep-hang` |
| `entity_slug_history` | Có ghi slug change; auto-redirect qua `registerSlugChangeRedirects()` — ✅ |

### 7.3 Old routes checklist

| Legacy | Status |
| --- | --- |
| `/creator` | ✅ next.config → studio |
| `/author/:id` | ✅ server redirect |
| `/tac-gia` | ✅ → bang-xep-hang |
| `/u/:user` | ✅ 301 @ |
| `/creators/:id` | ✅ 301 @ |
| `/genres/:slug` | ✅ 301 the-loai |
| `/story/:slug` | ✅ 301 truyen |
| `/stories/:slug` | 🟡 Partial |
| `/rankings` | ❌ Chưa redirect |

---

## 8. Sitemap / robots gaps

### 8.1 Hiện trạng

- **`app/sitemap.ts`** — segmented via `generateSitemaps()` → `/sitemap/{id}.xml`.
- **Segments:** static, stories, chapters, taxonomy, authors, posts, policies, reels (`lib/seo/sitemap-segments.ts`).
- **`app/robots.ts`** → `lib/seo/robots-config.ts`.

### 8.2 Sitemap — static paths (`buildStaticSitemapEntries`)

**Có:** `/`, `/discover`, `/reels`, `/truyen`, `/bai-viet`, `/chinh-sach`, `/thong-bao`, `/community`, `/bang-xep-hang`, `/about`, `/contact`, `/community-guidelines`.

**Thiếu:**

- `/media`
- `/truyen-sang-tac`
- `/truyen-dich`
- `/the-loai` (index) — có thể nằm taxonomy segment; cần verify
- `/@username` profiles — nằm `authors` segment ✅

**Khác:**

- `/rankings` không nên có (nếu redirect về bang-xep-hang).
- Paid chapters excluded ✅.
- `shouldNoIndexPath()` filter ✅.

### 8.3 robots.txt gaps

**Allow list** thiếu explicit: `/media`, `/truyen-sang-tac`, `/truyen-dich`, `/truyen` (root catalog có `/truyen/` prefix only).

**Disallow:** `/u/` ✅ (legacy); `/creators/`, `/author/`, `/tac-gia/` ✅.

**Admin UI** (`SeoRobotsTab`) — preview read-only; **chưa** edit robots từ DB (code-driven).

### 8.4 next-sitemap

Không dùng package `next-sitemap` — native App Router metadata routes ✅.

---

## 9. Proposed architecture — SEO Center (RankMath-style)

### 9.1 Nguyên tắc

- **Không rewrite app**, **không thêm CMS ngoài**.
- Mở rộng **SEO Control Center** hiện có (`/admin/seo`).
- Một **pipeline metadata** cho mọi public route: `resolveSeoForPath(pathname) → Metadata`.
- DB: tiếp tục migrations SQL (VPS/local Postgres); abstract qua data layer (tách dần tên `supabase` nếu cần).

### 9.2 Module map

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin SEO Center (/admin/seo)               │
├─────────────┬──────────────┬──────────────┬───────────────────┤
│ Page Meta   │ Content      │ Redirects    │ 404 Monitor       │
│ Overrides   │ Blocks       │ (existing+)  │ (new)             │
├─────────────┴──────────────┴──────────────┴───────────────────┤
│ Rules + Templates (existing) │ Audit │ Sitemap/Robots config  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    lib/seo/resolve-public-seo.ts
                               │
              generateMetadata / buildSeoMetadata (existing)
                               │
                    Next.js Metadata API + JSON-LD
```

### 9.3 Schema đề xuất (bảng mới / mở rộng)

#### A. `seo_page_overrides` (NEW — per-page metadata)

```sql
-- pathname unique, e.g. /discover, /media, /truyen-sang-tac
pathname text primary key,
title text,
meta_description text,
canonical_url text,
robots_index boolean,
robots_follow boolean,
og_title text,
og_description text,
og_media_asset_id uuid references media_assets(id),
twitter_card text,
json_ld_extra jsonb,
is_active boolean default true,
updated_by uuid,
updated_at timestamptz
```

#### B. `seo_content_blocks` (NEW — SEO content trước footer)

```sql
id uuid primary key,
route_pattern text not null,        -- e.g. /truyen-sang-tac, /the-loai/*
page_type text,
position text default 'before_footer',
title text,                          -- H2, không H1
body_html text,                      -- sanitized; no h1
body_json jsonb,                     -- optional composer blocks
indexable boolean default true,
sort_order int default 0,
is_active boolean default true,
created_at, updated_at, updated_by
```

#### C. `seo_not_found_hits` (NEW — 404 monitor)

```sql
id uuid primary key,
pathname text not null,
referrer text,
user_agent text,
hit_count int default 1,
first_seen_at timestamptz,
last_seen_at timestamptz,
status text default 'open',          -- open, ignored, redirected
resolved_redirect_id uuid references url_redirects(id)
```

#### D. Bảng đã có — giữ & mở rộng

| Bảng | Vai trò |
| --- | --- |
| `seo_rules` | Route pattern defaults (index, sitemap, canonical_mode, templates) |
| `seo_metadata_templates` | Template theo page_type |
| `seo_heading_rules` | Governance (đã có migration) |
| `seo_audit_logs` | Kết quả audit runs |
| `seo_change_logs` | Audit trail admin edits |
| `seo_sitemap_snapshots` | Lịch sử generate sitemap |
| `url_redirects` | Redirect manager |
| `entity_slug_history` | Slug change audit |

#### E. `seo_robots_overrides` (OPTIONAL — nếu muốn edit robots không deploy)

```sql
user_agent text,
rule_type text,  -- allow | disallow
path_prefix text,
sort_order int
```

Mặc định vẫn merge với `robots-config.ts` baseline.

#### F. OG media link

- Thêm `og_media_asset_id` (nullable) trên `admin_content_posts`, `platform_announcements`, `seo_page_overrides`.
- Resolver: `lib/media/resolve-og-image.ts` → public CDN URL từ `media_assets.object_key`.

### 9.4 Runtime flow

**1. Request public page**

```typescript
// lib/seo/resolve-public-seo.ts (NEW)
export async function resolvePublicSeo(input: {
  pathname: string;
  searchParams?: URLSearchParams;
  entity?: EntitySeoContext;
}): Promise<ResolvedSeo> {
  const override = await getPageOverride(pathname);
  const rule = await getSeoRuleForRoute(pathname);
  const template = await getTemplateForPageType(rule?.page_type);
  // merge: override > entity > template > defaults
}
```

**2. Redirect (edge-safe)**

- Phase 1: thêm lookup `url_redirects` + static legacy map vào `proxy.ts` (trước rewrite `@`).
- Phase 2: cache active redirects in memory/Redis on VPS.

**3. 404 capture**

- `app/not-found.tsx` hoặc middleware: `recordNotFoundHit(pathname, referrer)` — fire-and-forget insert/upsert.

**4. SEO Content Block**

- `components/seo/PublicSeoContentBlock.tsx` — render trong `SiteFooterShell` hoặc layout wrapper **chỉ public routes**.
- Match `route_pattern` longest-prefix; render `<section aria-label="SEO">` with **H2** title.

**5. Sitemap/Robots manager**

- Admin edit `seo_page_overrides.include_sitemap` hoặc derive từ rules.
- `buildStaticSitemapEntries()` đọc config list từ DB hoặc shared constant file generated from admin.

### 9.5 Admin pages cần tạo / mở rộng

| Page | Status | Action |
| --- | --- | --- |
| `/admin/seo` Control Center | ✅ | Thêm tabs: **Pages**, **Content Blocks**, **404** |
| `/admin/seo/rules` | ✅ | Giữ |
| `/admin/seo/urls` | ✅ | Thêm bulk import, hit stats từ 404 |
| `/admin/seo/pages` | ❌ | **NEW** — list public routes, edit override, preview SERP |
| `/admin/seo/content-blocks` | ❌ | **NEW** — CRUD blocks, preview |
| `/admin/seo/404` | ❌ | **NEW** — not found log, one-click create redirect |
| `/admin/seo/robots` | 🟡 tab | Edit allow/disallow nếu dùng DB overrides |
| `/admin/seo/sitemap` | 🟡 tab | Trigger regen snapshot, exclude URLs |

**Preview component:** tái sử dụng `SEOAssistantPanel` / `lib/seo/template-preview.ts`.

---

## 10. Implementation order

| Phase | Mục tiêu | Effort | Phụ thuộc |
| --- | --- | --- | --- |
| **0** | Quick wins: sitemap static paths, robots allow, 301 `/rankings`, `/stories` | S | None |
| **1** | `resolvePublicSeo()` + migrate catalog pages dùng chung pipeline | M | None |
| **2** | `seo_page_overrides` + admin Pages tab + wire generateMetadata | M | Phase 1 |
| **3** | OG resolver qua `media_assets` + admin picker | M | Media library |
| **4** | Global redirect lookup in `proxy.ts` | S | url_redirects |
| **5** | `seo_content_blocks` + public renderer | M | Phase 2 |
| **6** | `seo_not_found_hits` + 404 admin + redirect workflow | M | Phase 4 |
| **7** | Expand audit: automated H1 count, OG presence, orphan URLs | M | Phase 6 |
| **8** | Robots DB overrides (optional) | S | — |
| **9** | JSON-LD expansion (ItemList rankings, CollectionPage catalogs) | S | — |

**Không làm:** Payload/Strapi; rewrite toàn app; build CI trong prompt này.

---

## 11. Risks

| Risk | Mức | Mitigation |
| --- | --- | --- |
| Duplicate URLs (`/stories`, `/rankings`) | High | 301 sớm ở Phase 0 |
| `NEXT_PUBLIC_SITE_URL` unset → canonical/sitemap rỗng | High | Startup validation + admin alert |
| OG localhost trong dev leak prod | Medium | `resolvePublicUrl` + env guard |
| Redirect loops | Medium | Existing guards in `createUrlRedirect` |
| SEO content blocks spam / duplicate H2 | Medium | Sanitize HTML; no H1; max 1 block/route |
| 404 table growth | Low | Partition/aggregate by pathname |
| DB client naming (`supabase`) vs VPS Postgres | Low | Migrations portable; rename layer later |
| Paid chapter in sitemap | Medium | Already excluded — keep tests |
| Filter URLs indexed | Medium | Existing noindex on deep filters — extend tests |

---

## 12. Files likely affected (triển khai tiếp)

### Core SEO lib

- `lib/seo/metadata.ts`, `build-metadata.ts`, `page-metadata.ts`
- `lib/seo/noindex.ts` — bổ sung route patterns
- `lib/seo/sitemap-builders.ts`, `sitemap-segments.ts`, `robots-config.ts`
- `lib/platform-content/seo-governance.ts`
- `lib/seo/resolve-public-seo.ts` *(new)*
- `lib/media/resolve-og-image.ts` *(new)*

### Routing / edge

- `proxy.ts` — global redirect lookup
- `next.config.ts` — legacy 301 batch
- `app/not-found.tsx` — 404 logging

### Public pages (metadata unify)

- `app/discover/page.tsx`, `app/media/page.tsx`
- `app/truyen/page.tsx`, `app/truyen-dich/page.tsx`, `app/truyen-sang-tac/page.tsx`
- `app/rankings/page.tsx`, `app/bang-xep-hang/**`
- `app/u/[username]/page.tsx`

### Admin

- `components/admin/seo/AdminSeoControlCenterPage.tsx`
- `components/admin/seo/control/*` — new tabs
- `lib/admin/seo-control-data.ts`, `lib/admin/seo-audit-actions.ts`
- `lib/admin/url-seo-data.ts`

### Layout / render

- `components/layout/SiteFooterShell.tsx` hoặc `AppShell.tsx` — SEO content block slot
- `components/seo/PublicSeoContentBlock.tsx` *(new)*

### DB

- `db/migrations/legacy/NNN_seo_center_pages_blocks_404.sql` *(new)*

### Stories legacy

- `app/stories/[slug]/page.tsx`, `app/stories/[slug]/episodes/[episodeNumber]/page.tsx`

---

## 13. Files inspected (audit này)

### Config & edge

- `next.config.ts`
- `proxy.ts`
- `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts`

### SEO library (representative)

- `lib/seo/metadata.ts`, `build-metadata.ts`, `noindex.ts`, `rules.ts`, `audit.ts`
- `lib/seo/sitemap-builders.ts`, `sitemap-segments.ts`, `robots-config.ts`
- `lib/seo/structured-data.ts`, `headings.ts`, `content-hub-seo-data.ts`
- `lib/seo/metadata-templates-store.ts`
- `lib/platform-content/seo-governance.ts`
- `lib/urls/redirects.ts`, `lib/urls/canonical.ts`

### Public routes (sample)

- `app/page.tsx`, `app/discover/page.tsx`, `app/media/page.tsx`
- `app/truyen/page.tsx`, `app/truyen-dich/page.tsx`, `app/truyen-sang-tac/page.tsx`
- `app/rankings/page.tsx`, `app/bang-xep-hang/page.tsx`
- `app/stories/[slug]/page.tsx`, `app/u/[username]/page.tsx`
- `app/author/[id]/page.tsx`, `app/creators/[creatorId]/page.tsx`
- `app/search/page.tsx`, `app/bai-viet/[slug]/page.tsx`

### Admin SEO

- `app/admin/seo/page.tsx`, `app/admin/seo/urls/page.tsx`
- `components/admin/seo/AdminSeoControlCenterPage.tsx`
- `components/admin/seo/AdminUrlRedirectsPanel.tsx`
- `lib/admin/seo-control-data.ts`

### Components (headings / OG)

- `components/discover/DiscoverHero.tsx`
- `components/reels/ReelsShell.tsx`
- `components/rankings/RankingHero.tsx`
- `components/story/StoryHero.tsx`, `components/reader/ReaderChapterMeta.tsx`
- `components/studio/SEOAssistantPanel.tsx`

### Schema / types

- `types/platform-content.ts`, `types/admin-seo.ts`
- `db/migrations/legacy/134_platform_content_hub.sql`
- `db/migrations/legacy/141_seo_control_center_upgrade.sql`
- `db/migrations/legacy/158_public_url_system.sql`

### Existing docs

- `SEO_AUDIT_REPORT.md`, `SEO_HEADING_STANDARD.md`

---

## 14. Validation steps (đã thực hiện)

1. ✅ `git status` — workspace có nhiều thay đổi chưa commit; file mới `docs/SEO_CENTER_AUDIT_AND_PLAN.md`
2. ✅ Search codebase: `generateMetadata`, `metadata`, `robots`, `sitemap`, `redirect`, `<h1`
3. ✅ Tạo `docs/SEO_CENTER_AUDIT_AND_PLAN.md`
4. ✅ Không chạy `pnpm build`

---

## 15. Báo cáo tóm tắt

### Vấn đề chính tìm thấy

1. **SEO Center admin đã tồn tại** nhưng thiếu 3 module RankMath-core: **per-page overrides**, **SEO content blocks**, **404 monitor**.
2. **Duplicate URL:** `/rankings` vs `/bang-xep-hang`; `/stories/*` vs `/truyen/*`.
3. **Sitemap/robots** chưa liệt kê `/media`, `/truyen-sang-tac`, `/truyen-dich`.
4. **OG images** thiếu trên nhiều catalog page; chưa chuẩn hóa qua `media_assets`.
5. **Redirect lookup** chỉ ở page-level, không ở `proxy.ts`.
6. **Metadata phân mảnh** — ~90 route files; cần gom về `resolvePublicSeo()`.
7. **Heading:** Discover H1 lệch meta; Reels đã fix.

### Kế hoạch triển khai tiếp theo (đề xuất)

1. **Phase 0 quick wins** (1–2 ngày): sitemap + robots + 301 legacy URLs.
2. **Phase 1–2** (1 tuần): `seo_page_overrides` + admin Pages tab + unify catalog metadata.
3. **Phase 3–4** (1 tuần): OG media resolver + proxy redirects.
4. **Phase 5–6** (1 tuần): content blocks + 404 monitor tích hợp redirect manager.
5. **Phase 7+**: audit automation, JSON-LD mở rộng.

---

*Tài liệu này là baseline cho PROMPT 2+ (implementation). Cập nhật khi schema hoặc route tree thay đổi.*
