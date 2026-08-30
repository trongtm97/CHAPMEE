# ChapMee — Ranking Page Redesign Plan (`/bang-xep-hang`)

**Status:** Audit + design only — no UI implementation in this phase  
**Route:** `/bang-xep-hang`, `/bang-xep-hang/[type]`, `/the-loai/[slug]/bang-xep-hang`  
**Parent docs:** [STORY_BOOST_AND_RANKING_PLAN.md](./STORY_BOOST_AND_RANKING_PLAN.md), [SEO_HEADING_STANDARD.md](../SEO_HEADING_STANDARD.md)

---

## 1. Current state audit

### 1.1 Routes & page shell

| File | Role |
|------|------|
| `app/bang-xep-hang/page.tsx` | Re-exports `app/rankings/page.tsx` + metadata |
| `app/bang-xep-hang/[type]/page.tsx` | Per-board SEO route → `RankingsPageByType` |
| `app/the-loai/[slug]/bang-xep-hang/page.tsx` | Genre pre-filter → `RankingsPageByType` with `initialGenreSlug` |
| `app/rankings/page.tsx` | Server page: genres fetch, `RankingTabs`, ads inset, supporters |

**Findings:**
- Canonical URL is `/bang-xep-hang` (good).
- Default tab is **Tuần** (`week`), not Hôm nay.
- Page is a thin wrapper around client `RankingTabs`; no dedicated hero/podium layout.
- `revalidate = 120` on server shell; board data is client-fetched via API.

### 1.2 Main UI components

| Component | Current behavior | Gap vs goal |
|-----------|------------------|-------------|
| `RankingTabs` | Hero kicker + H1 + copy; vertical board picker; genre chips; flat list | No podium, no period filter, no scoring explainer, no “your rank” |
| `RankingBoardPicker` | 13 full-width link cards (`grid gap-2`) with icon + label + tagline | Occupies most of first screen; not compact tabs/chips |
| `RankingBoardCard` | Uniform card for all ranks; rank color for top 3 only | No Vàng/Bạc/Đồng podium; no share; no trend; author shown as display name only |
| `RankingPagination` | Numeric pagination (page size 20) | OK — matches “pagination not infinite scroll” |
| `RankingsSupportersSection` | Server fetch top 10 supporters | Basic list; weak empty state |
| `RankingSkeleton` | 5 placeholder cards | OK |

### 1.3 Data layer (existing — reuse, do not rewrite)

| Layer | Location | Notes |
|-------|----------|-------|
| Board types | `types/ranking-board.ts` → `RANKING_BOARD_TYPES`, `RANKING_UI_TABS` | 13 UI tabs; no **Truyện sáng tác** / **Truyện dịch** yet |
| Time windows | `day`, `week`, `month`, `all_time` | Bound per tab today — not a separate UI filter |
| API | `GET /api/rankings/board?type=&window=&genre=&page=` | Returns `RankingBoardResult` |
| Service | `lib/ranking/get-board.ts` | Reads `ranking_snapshots`, hydrates via `hydrate-items.ts` |
| Scoring | `lib/ranking/score-formula.ts`, `generate-snapshots.ts` | Weighted metrics + anti-fraud penalties |
| Hook | `hooks/useRankingBoard.ts` | Client fetch; URL drives `initialTabId` via route |
| Reason badges | `lib/ranking/reason-badges.ts` | Maps board → badge label |

**Data already on `RankingBoardItem`:**
`rank`, `itemType`, `title`, `slug`, `href`, `coverUrl`, `authorDisplayName`, `authorUsername`, `score`, `scoreBreakdown`, `reasonBadge`, `statsLine`, audio flags.

**Not available today (needs backend or snapshot diff):**
- Rank trend (↑ ↓ NEW vs previous snapshot)
- User/story “your position” lookup
- Hero aggregate stats (active boards count, total ranked items)
- Content-origin boards (original vs translation)
- Per-board “suggested alternatives with data” (needs lightweight board health API)

### 1.4 Navigation active state

- `lib/navigation/active-route.ts` → `isRankingsNavRoute()` matches `/bang-xep-hang` prefix.
- Header: `DESKTOP_HEADER_NAV` includes “Bảng xếp hạng” with `headerEmphasis: "honor"`.
- Sidebar: included in `SIDEBAR_EXPLORE_NAV`.
- Mobile bottom nav: **does not** include rankings (by design — 5 slots). Rankings reachable via header (desktop) or discover links (`MiniRanking`).

**Status:** Active state works for header/sidebar. No change required for nav wiring in redesign.

### 1.5 Story cover & profile

- Covers: `ChapMeeCover` uses 3:4 aspect (`CHAPMEE_COVER_ASPECT_CLASS`). Ranking card uses `size="xs"` — compliant.
- Profiles: `getProfileUrl()` → `/@username`. Hydrate builds author `href` via profile URL. **Card UI does not render `@username` link** — shows `authorDisplayName` only.

### 1.6 Share infrastructure (reusable)

| Asset | Location | Ranking use |
|-------|----------|-------------|
| `ShareButton` + `ShareModal` | `components/share/` | Web Share API, copy link/text, download image |
| `ShareCardPayload` | `types/share.ts` | Extend with `kind: "achievement"` or new `kind: "ranking"` |
| `renderShareImage` | `lib/share/renderShareImage.ts` | Canvas export 1080×1920 — needs ranking-specific layout |
| `ShareAchievementCard` | wraps `ShareProfileCard` | Starting point for badge card |

**Gap:** No share trigger on ranking items today.

### 1.7 SEO & headings

**Current metadata** (`app/rankings/page.tsx`):
- `title`: `"Bảng xếp hạng ChapMee"` — should become `"Bảng xếp hạng truyện và tác giả | ChapMee"`.
- `description`: close but not exact match to spec.

**Current headings** (`RankingTabs`):
- One H1: `"Bảng xếp hạng"` ✓
- H2: `"Chọn bảng xếp hạng"`, genre label, `SectionHeader` for active tab (defaults to H2) ✓
- `RankingBoardCard` uses H3 for item title ✓
- `EmptyState` uses H2 for empty title — acceptable inside main content

**Missing:** `/bang-xep-hang` row in `SEO_HEADING_STANDARD.md` (add during implementation).

### 1.8 Footer

- Global `SiteFooter` via layout — no ranking-specific footer content. OK.

### 1.9 Empty state

**Current** (`RankingTabs`):
```tsx
<EmptyState
  title="Chưa có mục trên bảng này"
  description="Hãy thử bảng khác hoặc quay lại sau — danh sách sẽ được cập nhật thường xuyên."
/>
```
- Generic, no icon, no suggested boards, vertically generous (`py-8`).

### 1.10 Supporters section

**Current** (`SupporterRanking`):
- Title “Top người ủng hộ”, flat rows with name + tip count + coin.
- Empty: single line “Chưa có dữ liệu người ủng hộ.”
- No avatars; “Fan Vàng” hard-coded on index 0 only.

---

## 2. Current problems (summary)

1. **No celebration feel** — flat list; top 3 differ only by text color in rank badge.
2. **Board picker dominates viewport** — 13 stacked cards before any ranked content.
3. **Time window UX is confusing** — Hôm nay / Tuần / Tháng are separate boards, not a period filter on one board type.
4. **No share / badge** — misses author/reader virality despite existing share stack.
5. **No scoring transparency** — formula exists in backend but invisible on page.
6. **Weak empty states** — board empty + supporters empty provide little guidance.
7. **Missing content-origin boards** — Truyện sáng tác / Truyện dịch not in ranking pipeline.
8. **No trend or personal rank** — data model lacks delta; no “Bạn đang ở đâu?”
9. **Metadata & SEO copy** — slightly off spec; sub-route titles OK.
10. **Author identity** — `@username` not surfaced on cards despite being hydrated.

---

## 3. Proposed information architecture

Page order (top → bottom):

```
A. Hero vinh danh
B. Ranking category tabs (compact)
C. Period filter (conditional)
D. Top 3 Podium (Vàng / Bạc / Đồng)
E. Ranking list (rank ≥ 4, paginated)
F. Bạn đang ở đâu? (logged-in, phase 2)
G. Cách tính điểm
H. Top người ủng hộ (compact)
```

### 3.1 Section A — Hero vinh danh

| Element | Content |
|---------|---------|
| Eyebrow | `VINH DANH` (existing `page-kicker` pattern) |
| H1 | `Bảng xếp hạng` (single page H1) |
| Subtitle | `Những truyện, tác giả và nội dung đang được cộng đồng ChapMee yêu thích.` |
| Mini stats (when data exists) | Cập nhật gần nhất · N bảng đang hoạt động · M tác phẩm được xếp hạng |

**Visual direction:**
- Subtle gradient mesh / gold accent line (honor theme, matches header `headerEmphasis: "honor"`).
- Stats as inline chips below subtitle — not a second hero block.
- Height cap: ~160px mobile, ~200px desktop (content-driven, no full-viewport hero).

**Data for mini stats (MVP):**
- `snapshotAt` from active board (already in hook).
- Active boards count: server-side count of distinct `ranking_type` with snapshot in last 7d (new lightweight query or cron cache).
- Ranked items: `totalCount` of active board or sum from cache — avoid N+1 on page load.

### 3.2 Section B — Ranking category tabs

Replace vertical `RankingBoardPicker` grid with **compact horizontal navigation**:

**Layout options (pick one in implementation):**
1. **Scrollable chip row** (mobile-first) — icon + short label, `aria-current="page"` on active.
2. **Two-row compact grid** (desktop) — max 7 per row, icon-only on xs with tooltip.

**Categories (target set):**

| # | Label | Slug (existing) | Board type | Notes |
|---|-------|-----------------|------------|-------|
| 1 | Hôm nay | `hom-nay` | `top_stories` / `day` | ✓ exists |
| 2 | Tuần | `tuan` (default `/bang-xep-hang`) | `top_stories` / `week` | ✓ |
| 3 | Tháng | `thang` | `top_stories` / `month` | ✓ |
| 4 | Truyện mới | `truyen-moi` | `new_stories` | ✓ |
| 5 | Truyện sáng tác | `truyen-sang-tac` | **NEW** `original_stories` or filter | Needs pipeline |
| 6 | Truyện dịch | `truyen-dich` | **NEW** `translation_stories` or filter | Needs pipeline |
| 7 | Tác giả mới | `tac-gia-moi` | `new_authors` | ✓ |
| 8 | Đang lên | `dang-len` | `rising_stories` | ✓ |
| 9 | Hoàn thành | `hoan-thanh` | `completed_stories` | ✓ |
| 10 | Lưu nhiều | `luu-nhieu` | `most_saved` | ✓ |
| 11 | Đọc tiếp cao | `doc-tiep-cao` | `chapter_next_rate` | ✓ |
| 12 | Giữ chân tốt | `giu-chan-tot` | `long_tail_quality` | ✓ |
| 13 | Được đề cử | `duoc-de-cu` | `boosted_stories` | ✓ |
| 14 | Reels kéo đọc | `reels-keo-doc` | `reels_read_through` | ✓ |
| 15 | Theo thể loại | `theo-the-loai` | `genre_stories` | ✓ + genre sub-filter |

**Grouping (optional visual separators in chip row):**
- **Thời gian:** Hôm nay, Tuần, Tháng
- **Truyện:** Mới, Sáng tác, Dịch, Đang lên, Hoàn thành, …
- **Cộng đồng:** Lưu nhiều, Đề cử, Reels
- **Khác:** Tác giả mới, Theo thể loại

**Rules:**
- Max visible height ~80px (+ horizontal scroll on mobile).
- Active: gold border/fill (reuse picker active styles).
- Navigation stays URL-based (`/bang-xep-hang/[slug]`) for shareable deep links.

### 3.3 Section C — Period filter

**When to show:** Boards where `timeWindow` is not fixed by semantics.

| Board group | Period options |
|-------------|----------------|
| `top_stories`, `rising_stories`, `most_saved`, `long_tail_quality`, `genre_stories` | Hôm nay · 7 ngày · 30 ngày · Tháng này · Tất cả |
| `new_stories`, `new_authors`, `completed_stories`, `boosted_stories`, `reels_read_through`, `chapter_next_rate` | 7 ngày · 30 ngày (hide “Hôm nay” if noisy) |
| Hôm nay / Tuần / Tháng **tabs** | Hide period filter (tab = period) OR merge into single “Top truyện” tab + period filter (preferred long-term) |

**Implementation note:** Long-term IA should collapse Hôm nay/Tuần/Tháng into one **“Top truyện”** tab + period filter to reduce tab proliferation. Short-term: keep existing tabs, add period filter only on non-time tabs.

**API change:** Pass `window` query param from filter; update URL query `?window=week` without losing board slug.

### 3.4 Section D — Top 3 Podium

**Requirement:** Dedicated podium block — not the same card component as list items.

#### Visual layout

```
        [ 🥈 #2 ]     [ 🥇 #1 ]     [ 🥉 #3 ]
         smaller       tallest       smaller
         silver        gold          bronze
```

- **Desktop:** 3-column flex, center (#1) elevated `translate-y-[-12px]`, wider cover.
- **Mobile:** Horizontal scroll snap OR stacked mini-podium ( #1 full width on top, #2+#3 side by side below).

#### Podium item fields

| Field | Source |
|-------|--------|
| Medal | SVG trophy/medal — Vàng `#FACC15`, Bạc `#E4E4E7`, Đồng `#FB923C` |
| Rank number | `item.rank` |
| Cover / avatar | `ChapMeeCover` 3:4 (`size="sm"` center, `size="xs"` sides) or `AvatarFallback` for author |
| Title / name | `item.title` — **not H1**; use `p` + `font-bold` or `h3` |
| Author | `AuthorNameLink` → `@username` when `authorUsername` set |
| Score | `item.score.toFixed(1)` + label “điểm” |
| Main metric | Primary line from `statsLine` or top `scoreBreakdown` field for board |
| Badge | `reasonBadge` if present |
| CTA primary | “Xem truyện” / “Xem hồ sơ” → `item.href` |
| CTA secondary | “Chia sẻ” → share modal (see §5) |

#### Data loading

- Page 1 fetch: use items 1–3 for podium, items 4–20 for list (same API response — split client-side).
- If `< 3` items: show partial podium (1 or 2 slots) + do not fake placeholders.

### 3.5 Section E — Ranking list (rank ≥ 4)

**Design:** Dense, scannable rows — “scientific leaderboard” not feed cards.

| Column | Content |
|--------|---------|
| Rank | `#4` monospace, fixed width |
| Cover | `ChapMeeCover` xs 3:4 |
| Info | Title (semibold), `@username` / genre, reason badge |
| Metrics | Score + one key stat |
| Trend | ↑ ↓ NEW — phase 2; hide column until data exists |
| Actions | Icon share + chevron link |

**Component strategy:**
- New `RankingListRow` for rank ≥ 4 (lighter than `RankingBoardCard`).
- Keep `RankingBoardCard` deprecated or for legacy surfaces only.

**Pagination:** Unchanged — 20 per page; podium always from page 1 data when user paginates (podium stays top-3 global, list shows current page ranks).

**Clarification:** When `page > 1`, podium still shows global top 3; list shows ranks `(page-1)*pageSize+1` … — on page 2 starting at rank 21, hide podium OR show sticky mini top-3. **Recommendation:** Always show podium on page 1 only; page 2+ list-only with breadcrumb “Top 3 ở trang đầu”.

### 3.6 Section F — “Bạn đang ở đâu?” (phase 2 / optional MVP)

**Logged-in user:**
- If user has story/author entry in current board: highlight card “Truyện X của bạn: #N”.
- Else: tips box — “Cải thiện hạng: tăng đọc tiếp, lưu truyện, tương tác hợp lệ…”

**API needed:** `GET /api/rankings/me?type=&window=&genre=` → `{ storyRanks: [], authorRank: null }`.

**MVP:** Omit section if API not ready — doc-only stub with `hidden` feature flag.

### 3.7 Section G — Cách tính điểm

Compact disclosure box below list:

> Bảng này dựa trên lượt đọc hợp lệ, lưu truyện, đọc tiếp, tương tác và chống gian lận.

- Link **“Xem cách tính”** → `/legal/ranking-methodology` or anchor on `/content-policy` (create short public page in later prompt).
- Board-specific one-liner from `activeTab.tagline` or mapped copy.
- Do **not** expose raw weights on main page.

### 3.8 Section H — Top người ủng hộ

Keep section, redesign compact:

| Element | Spec |
|---------|------|
| Layout | Horizontal scroll of compact cards OR top 5 max |
| Row | Avatar, display name, `@username`, coin total, tip count |
| Empty | Inline `py-4` — icon + “Chưa có dữ liệu ủng hộ tuần này” — no large card |
| Position | Bottom of page, below scoring explainer |

Reuse `getSupporterRankingForAppCached(5)` — reduce default from 10 to 5.

---

## 4. Ranking types reference

### 4.1 Existing board types (`RankingBoardType`)

| Type | Item type | Typical window |
|------|-----------|----------------|
| `top_stories` | story | day / week / month |
| `new_stories` | story | week |
| `new_authors` | author | week |
| `genre_stories` | story | week + taxonomy |
| `completed_stories` | story | week |
| `rising_stories` | story | week |
| `reels_read_through` | reel | week |
| `most_saved` | story | week |
| `chapter_next_rate` | chapter | week |
| `long_tail_quality` | story | week |
| `boosted_stories` | story | week |

### 4.2 Proposed additions

| Type | Filter | Snapshot work |
|------|--------|---------------|
| `original_stories` | `content_origin = 'original'` | Extend `generate-snapshots.ts` + eligible fetch |
| `translation_stories` | `content_origin = 'translation'` | Same |

Until snapshots exist, UI tabs show **empty state with “Sắp ra mắt”** or hide tabs — **never fake data**.

### 4.3 Score breakdown (display mapping)

| Breakdown field | User-facing label |
|-----------------|-------------------|
| `next_chapter_rate` | Đọc tiếp |
| `save_rate` | Lưu truyện |
| `completion_rate` | Hoàn thành |
| `follow_rate` | Theo dõi |
| `unlock_rate` | Mở khóa |
| `freshness` | Mới |
| `fairness` | Công bằng phân phối |
| `report_penalty` | Trừ báo cáo |
| `hide_penalty` | Trừ ẩn |

Primary metric per board (for podium/list):

| Board | Primary metric |
|-------|----------------|
| `top_stories` | Composite score |
| `most_saved` | `save_rate` |
| `chapter_next_rate` | `next_chapter_rate` |
| `rising_stories` | Score delta (phase 2) or score |
| `boosted_stories` | Boost points |
| `new_authors` | Composite |
| `reels_read_through` | Read-through rate |

---

## 5. Share system design

### 5.1 Goals

Enable ranked authors/readers to share achievements without leaving the page.

### 5.2 Actions

| Button | MVP behavior |
|--------|--------------|
| **Chia sẻ thành tích** | Opens `ShareModal` with pre-filled text + link |
| **Tạo huy hiệu** | Same modal, “Tải ảnh” tab using canvas (phase 1.5) |

### 5.3 Copy template

```
Tôi đang đứng #{rank} {boardLabel} trên ChapMee với {title}. Đọc tại: {url}
```

Examples:
- Story: `... với "Nhất Niệm Vĩnh Hằng". Đọc tại: https://chapmee.vn/stories/...`
- Author: `... với tư cách tác giả. Xem hồ sơ: https://chapmee.vn/@username`

### 5.4 ShareCardPayload extension

```typescript
// Proposed fields for ranking share
{
  kind: "achievement", // or "ranking"
  title: item.title,
  text: "<copy template>",
  url: item.href,
  coverUrl: item.coverUrl,
  stats: [
    { label: "Hạng", value: "#1" },
    { label: "Bảng", value: "Tuần" },
    { label: "Điểm", value: "87.4" }
  ],
  hook: "🥇 Vàng · Bảng xếp hạng tuần"
}
```

### 5.5 Share card visual (image export — later prompt)

- ChapMee logo + wordmark
- Medal (Vàng/Bạc/Đồng) + `#rank`
- 3:4 cover or avatar
- Title, period, score
- Optional QR (future)

**MVP:** Web Share API (`navigator.share`) when available + copy text/link. Image generation reuses `exportCardToImage` with new ranking template.

### 5.6 Placement

| Location | Control |
|----------|---------|
| Podium cards | Full “Chia sẻ thành tích” button |
| List rows | Icon-only share |
| Author rank | Share links to `/@username` |

### 5.7 Analytics

Track `share_ranking_achievement` with `{ boardType, rank, itemType, itemId }`.

---

## 6. Empty state design

### 6.1 Board empty (no snapshot or zero items)

**Replace** generic empty with compact guided state:

```
[ icon: chart/trophy outline ]

Bảng này chưa đủ dữ liệu

Hãy quay lại sau hoặc khám phá các bảng khác.

[ chip ] Tuần   [ chip ] Truyện mới   [ chip ] Lưu nhiều
     ↑ suggested boards with data (from health endpoint)
```

**Constraints:**
- Max height ~140px (`py-5` not `py-8`).
- Suggested boards: server returns up to 3 slugs with `totalCount > 0` (cache 5 min).
- No fake entries.

### 6.2 Partial podium

- 1 item: single gold card centered, no silver/bronze placeholders.
- 2 items: gold + silver only.

### 6.3 Supporters empty

- Single line + small icon inside existing section — do not expand section height.

---

## 7. Mobile layout

| Section | Mobile behavior |
|---------|-----------------|
| Hero | Stacked; stats wrap 2 lines |
| Category tabs | Horizontal scroll, `snap-x`, fade edge mask |
| Period filter | Second scroll row or dropdown `Chọn khoảng thời gian` |
| Podium | Option A: #1 hero card + #2/#3 row. Option B: horizontal snap 3 cards |
| List | Full-width rows, 56px min touch targets |
| Share | Bottom sheet modal (existing `ShareModal`) |
| Scoring box | Full width, collapsible |
| Supporters | Horizontal scroll cards 160px wide |
| Pagination | Sticky bottom optional — not required MVP |

**Safe area:** Respect `pb` for mobile bottom nav on pages that use `AppShell` with inset.

---

## 8. Desktop layout

| Section | Desktop behavior |
|---------|------------------|
| Max width | `max-w-5xl` centered (align with discover) |
| Hero | Stats inline single row |
| Category tabs | Wrap to 2 rows max, no vertical list |
| Period filter | Inline chips left-aligned under tabs |
| Podium | 3-column, center elevated |
| List | Table-like rows with fixed column grid |
| Sidebar | Global nav only — no ranking-specific sidebar |
| Supporters | 5-column grid or single row |

**Ads:** Keep `RankingSectionsAdInset` between list and supporters — do not insert between podium and list.

---

## 9. SEO & metadata rules

### 9.1 Page metadata (update in implementation)

```typescript
export const metadata: Metadata = {
  title: "Bảng xếp hạng truyện và tác giả | ChapMee",
  description:
    "Khám phá truyện, tác giả, reels, audio và nội dung được cộng đồng ChapMee yêu thích.",
  alternates: { canonical: buildCanonicalUrl("/bang-xep-hang") }
};
```

### 9.2 Sub-route metadata

Keep pattern: `{tab.label} · Bảng xếp hạng ChapMee` with `tab.description`.

### 9.3 Heading hierarchy

| Element | Tag |
|---------|-----|
| Page title | **h1** — “Bảng xếp hạng” |
| Active board name (above podium) | **h2** — e.g. “Tuần” |
| “Top 3” section label | **h2** or aria-labelledby (visually hidden) |
| Podium item title | **p** or **h3** (not h1/h2) |
| List section | **h2** — “Bảng xếp hạng chi tiết” (optional) |
| Supporters | **h2** via `SectionHeader` |
| Header / sidebar / footer | No h1 |

### 9.4 Structured data (future)

`ItemList` JSON-LD for top stories board only — separate prompt.

---

## 10. Data requirements for implementation

### 10.1 No new tables required for MVP UI

Reuse `ranking_snapshots` + existing API.

### 10.2 Optional new endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/rankings/health` | Returns boards with `totalCount > 0` for empty-state suggestions |
| `GET /api/rankings/me` | User’s rank on current board |
| `GET /api/rankings/summary` | Hero stats (active boards, last updated) |

### 10.3 Phase 2 — trend

Store previous snapshot reference or compute rank delta in cron:

```sql
-- Conceptual: compare rank_position across snapshot_at T vs T-1
```

Expose `trend: "up" | "down" | "new" | "same" | null` on `RankingBoardItem`.

### 10.4 Content-origin boards

1. Add board types to `RANKING_BOARD_TYPES`.
2. Filter in `fetchEligibleStories` by `content_origin`.
3. Add UI tabs + slugs `truyen-sang-tac`, `truyen-dich`.
4. Run snapshot cron for new types.

---

## 11. Component plan (implementation phases)

| New / changed component | Responsibility |
|-------------------------|----------------|
| `RankingHero` | Eyebrow, H1, subtitle, stats |
| `RankingCategoryTabs` | Compact chip nav (replaces picker grid) |
| `RankingPeriodFilter` | Window chips + URL sync |
| `RankingPodium` | Top 3 layout |
| `RankingPodiumCard` | Single podium slot |
| `RankingListRow` | Rank ≥ 4 dense row |
| `RankingScoringExplainer` | Short copy + link |
| `RankingEmptyState` | Guided empty + suggestions |
| `RankingShareButton` | Thin wrapper over `ShareButton` with ranking payload |
| `SupporterRankingCompact` | Redesigned supporters |

**Files to modify (later):**
- `components/rankings/RankingTabs.tsx` — orchestration
- `app/rankings/page.tsx` — metadata, optional hero stats fetch
- `types/share.ts` — ranking payload helpers
- `types/ranking-board.ts` — new tabs/boards when backend ready

**Files to keep:**
- `lib/ranking/get-board.ts`, `hooks/useRankingBoard.ts`, API route
- `ChapMeeCover`, `ShareModal`, `RankingPagination`

---

## 12. Validation checklist

### 12.1 UX & IA

- [ ] Hero shows eyebrow + H1 + subtitle
- [ ] Board picker is compact (not 13 stacked full-width cards)
- [ ] Top 3 uses Vàng / Bạc / Đồng podium — visually distinct from list
- [ ] List starts at rank 4 with dense scientific rows
- [ ] Pagination works; no infinite scroll
- [ ] Period filter shown only on applicable boards
- [ ] Empty state is compact with suggested boards
- [ ] Scoring explainer visible with link
- [ ] Supporters section compact; small empty state

### 12.2 Share

- [ ] Podium has “Chia sẻ thành tích”
- [ ] List has icon share
- [ ] Copy text matches template with rank + board + title + URL
- [ ] Web Share API + clipboard fallback
- [ ] No fake ranking in share payload

### 12.3 Data & constraints

- [ ] Story covers 3:4 (`ChapMeeCover`)
- [ ] Profile links use `/@username`
- [ ] No hard-coded production ranking data
- [ ] Dev-only fixtures gated by env flag if needed
- [ ] Content-origin boards hidden or empty until snapshots exist

### 12.4 SEO & a11y

- [ ] Single H1 “Bảng xếp hạng”
- [ ] Board title is H2
- [ ] Metadata title/description per spec
- [ ] `aria-current="page"` on active tab
- [ ] Podium has accessible labels (rank announced)
- [ ] `/bang-xep-hang` added to `SEO_HEADING_STANDARD.md`

### 12.5 Nav & build

- [ ] Header/sidebar active state on `/bang-xep-hang/*`
- [ ] `pnpm build` passes
- [ ] No Supabase added as new dependency (existing data layer unchanged)

### 12.6 Mobile / desktop

- [ ] Tabs scroll horizontally on mobile
- [ ] Podium readable on 375px width
- [ ] Touch targets ≥ 44px
- [ ] Desktop max-width aligned with app shell

---

## 13. Recommended next prompt (implementation)

**Prompt title:** Implement Ranking Page Redesign — Phase 1 (Hero + Compact Tabs + Podium + List)

**Scope:**
1. Add `RankingHero`, `RankingCategoryTabs`, `RankingPodium`, `RankingListRow`.
2. Refactor `RankingTabs` to split page-1 items into podium + list.
3. Update metadata to spec.
4. Add `RankingScoringExplainer` + `RankingEmptyState` with static suggested links (Tuần, Lưu nhiều, Truyện mới) until health API exists.
5. Wire `ShareButton` on podium (MVP copy/text only).
6. Compact `SupporterRanking` (avatars if available in type).

**Out of scope for Phase 1:**
- Trend arrows
- `/api/rankings/me`
- Image badge export template
- `original_stories` / `translation_stories` snapshots
- Period filter URL sync (if time tabs kept as-is)

**Follow-up prompts:**
- Phase 2: Trend + user rank + health API
- Phase 3: Content-origin boards + snapshot cron
- Phase 4: Ranking share card canvas + JSON-LD

---

## Appendix A — Files audited

| Path | Purpose |
|------|---------|
| `app/bang-xep-hang/page.tsx` | SEO route alias |
| `app/bang-xep-hang/[type]/page.tsx` | Typed board route |
| `app/the-loai/[slug]/bang-xep-hang/page.tsx` | Genre board route |
| `app/rankings/page.tsx` | Main server page + metadata |
| `components/rankings/RankingTabs.tsx` | Primary client UI |
| `components/rankings/RankingBoardPicker.tsx` | Board list nav |
| `components/rankings/RankingBoardCard.tsx` | Item card |
| `components/rankings/RankingsPageByType.tsx` | Typed page wrapper |
| `components/rankings/RankingsSupportersSection.tsx` | Supporters loader |
| `components/rankings/RankingPagination.tsx` | Pagination |
| `components/rankings/RankingBoardIcons.tsx` | Tab icons |
| `components/supporters/SupporterRanking.tsx` | Supporters UI |
| `components/discover/MiniRanking.tsx` | Discover entry link |
| `components/share/ShareButton.tsx` | Share entry |
| `components/share/ShareModal.tsx` | Share modal |
| `components/common/ChapMeeCover.tsx` | 3:4 covers |
| `components/ui/EmptyState.tsx` | Generic empty |
| `components/ui/SectionHeader.tsx` | Section titles |
| `hooks/useRankingBoard.ts` | Client data hook |
| `app/api/rankings/board/route.ts` | Board API |
| `lib/ranking/get-board.ts` | Board service |
| `lib/ranking/hydrate-items.ts` | Snapshot hydration |
| `lib/ranking/score-formula.ts` | Scoring |
| `lib/ranking/reason-badges.ts` | Badge labels |
| `lib/navigation/active-route.ts` | Nav active state |
| `lib/navigation/nav-items.ts` | Nav config |
| `lib/profile/profile-url.ts` | `/@username` URLs |
| `types/ranking-board.ts` | Board/tab types |
| `types/share.ts` | Share payload |
| `SEO_HEADING_STANDARD.md` | Heading rules |

---

*Document created from codebase audit — June 2026.*
