# ChapMee — Ranking Page Final Validation Report

**Route:** `/bang-xep-hang`, `/bang-xep-hang/[type]`, `/the-loai/[slug]/bang-xep-hang`  
**Date:** June 2026  
**Scope:** Cleanup + validation after ranking page redesign (hero, selector, podium, list, share badge, empty state)

---

## 1. Summary

| Area | Status | Notes |
|------|--------|-------|
| UI cleanup | ✅ Pass | Removed unused vertical `RankingBoardPicker`; page uses `RankingSelector` |
| Data layer | ✅ Pass | Public/published only; paginated snapshots; no fake production data |
| Medal consistency | ✅ Pass | `MedalBadge`, `RankingRankMedal`, `RankMedalIcon` alias |
| Share system | ✅ Pass | Modal + badge PNG + owner-aware copy + public URLs |
| Scoring explainer | ✅ Pass | `RankingScoringExplainer` with signal chips + fairness note |
| Empty state | ✅ Pass | Compact `RankingEmptyState` (~140px content height) |
| Link audit | ✅ Pass | No `/creator/`, `/author/`, `/tac-gia/` in ranking UI paths |
| Cover aspect | ✅ Pass | No `aspect-video` / 16:9 in `components/rankings/**` |
| SEO headings | ✅ Pass | Single H1 in `RankingHero`; sections use H2 |
| Build | ✅ Pass | `npm run build` exit 0 |

---

## 2. UI components — current vs removed

### Active on `/bang-xep-hang`

| Component | Role |
|-----------|------|
| `RankingHero` | Eyebrow, **H1**, subtitle, mini stats |
| `RankingSelector` | Horizontal chips + “Thêm bảng” dropdown |
| `RankingPeriodTabs` | Period filter (non fixed-window tabs) |
| `RankingPodium` / `RankingPodiumCard` | Top 3 Vàng/Bạc/Đồng |
| `RankingList` / `RankingListItem` | Dense rows rank ≥ 4 |
| `RankingEmptyState` | Compact guided empty |
| `RankingScoringExplainer` | “Cách tính bảng này” |
| `RankingShareButton` / `RankingShareModal` / `RankingShareCard` | Share badge |
| `RankingPagination` | Page size 20, numeric nav |
| `RankingsSupportersSection` | Compact top supporters |
| `MedalBadge` / `RankMedalIcon` | Medal UI |

### Removed / no longer on ranking page

| Item | Action |
|------|--------|
| `RankingBoardPicker.tsx` | **Deleted** — replaced by `RankingSelector`; `rankingTabHref` lives in `lib/ranking/ranking-ui-utils.ts` |
| `RankingShareSheet.tsx` | **Deleted** (prior session) — replaced by `RankingShareModal` |
| Generic `EmptyState` on board | **Removed** — uses `RankingEmptyState` |
| Vertical 13-card picker | **Removed** from page IA |

### Retained elsewhere (not dead code)

| Component | Used by |
|-----------|---------|
| `RankingBoardCard` | `components/discover/BoostedStoriesSection.tsx` |
| `StoryRankingCard`, `AuthorRankingCard`, etc. | Legacy/admin/tac-gia surfaces via `components/rankings/index.ts` |

---

## 3. Data service audit

### Pipeline

```
ranking_snapshots (cron: /api/cron/ranking-snapshots)
  → getRankingBoard (lib/ranking/get-board.ts)
  → GET /api/rankings/board
  → useRankingBoard hook
  → RankingTabs UI
```

### Public content only

| Layer | Filter |
|-------|--------|
| `fetchEligibleStories` | `status ∈ publicContentStatuses`, `visibility = public`, moderation not flagged/removed/hidden |
| `hydrate-items` | Re-fetch stories with `visibility=public`, `status ∈ published/approved`; skips missing rows |
| Authors | `creator_profiles.status = active` |
| Reels | `status = published` |
| Chapters | `status ∈ published/approved` |

### Sort & period

- Sort: `rank_position ASC` on latest `snapshot_at` for `(ranking_type, time_window[, genre])`
- Period: `timeWindow` query param from `RankingPeriodTabs` or fixed per tab (Hôm nay/Tuần/Tháng)
- Pagination: `RANKING_PAGE_SIZE = 20`; count query + `range(from, to)` — no unbounded scan on page load

### Empty / coming-soon

- No snapshot → empty `items[]`, `snapshotAt: null` — **no fake rows**
- `original_stories` / `translation_stories` tabs: `comingSoon: true` → skip API fetch, show empty state

### Hardcoded demo data

- **None** in production ranking path. `RANKING_UI_TABS` is static metadata only (labels/slugs), not ranked items.

---

## 4. Medal consistency

| Rank | Component | Visual | a11y |
|------|-----------|--------|------|
| #1 | `MedalBadge` / `RankMedalIcon` | Vàng + star SVG | `aria-label="Huy chương vàng, hạng 1"` |
| #2 | same | Bạc | `aria-label="Huy chương bạc, hạng 2"` |
| #3 | same | Đồng | `aria-label="Huy chương đồng, hạng 3"` |
| #4+ | `RankingRankMedal` | `#N` numeric badge | `aria-label="Huy hiệu hạng N"` |

Podium cards also show `#rank` text alongside medal — not color-only.

---

## 5. Share system status

| Feature | Status |
|---------|--------|
| Share button on podium + list | ✅ |
| Preview badge card | ✅ `RankingShareCard` |
| Copy link / copy text | ✅ |
| Web Share API + fallback | ✅ |
| PNG download (canvas) | ✅ `exportRankingBadgeToImage` — no new npm deps |
| Owner tone (“của tôi”) | ✅ via `authClient.getSession()` + `item.ownerUserId` |
| Public URL | ✅ `resolvePublicShareUrl()` → `NEXT_PUBLIC_SITE_URL` |
| Author share URL | ✅ `/@username` via `getProfileUrl` |

---

## 6. Scientific scoring explanation

**Component:** `components/rankings/RankingScoringExplainer.tsx`

Shown when board is loaded (not loading, no error) — including empty boards.

**Signals listed:**
- Lượt đọc hợp lệ
- Đọc tiếp chương
- Lưu truyện
- Tương tác cộng đồng
- Đề cử từ độc giả
- Chống gian lận & spam

**Fairness note:**  
“Điểm có thể được điều chỉnh để chống spam và đảm bảo công bằng hiển thị.”

**Link:** `/content-policy` (no hard-coded weight formula on page).

Backend weights remain in `lib/ranking/score-formula.ts` + admin `algorithm_settings` — not duplicated in UI.

---

## 7. Link audit

```
grep "/creator/|/author/|/tac-gia/" components/rankings/**  → 0 matches
grep "/creator/|/author/|/tac-gia/" lib/ranking/**         → import paths only (lib/creator/*), no profile URLs
```

| Link type | Rule | Implementation |
|-----------|------|----------------|
| Story | Canonical story URL | `getStoryUrl` in hydrate → `item.href` |
| Author | `/@username` | `getProfileUrl(authorUsername)` |
| Share | Absolute public URL | `lib/site/site-url.ts` |
| Ranking tabs | Stable slugs | `/bang-xep-hang`, `/bang-xep-hang/[slug]` |

---

## 8. Cover / avatar audit

```
grep "aspect-video|aspect-[16/9]|16:9" components/rankings/**  → 0 matches
```

| Item type | Cover rule | Component |
|-----------|------------|-----------|
| Story | 3:4 portrait | `ChapMeeCover` (`aspect-[3/4]`) — list `!w-14`, podium `!w-20–28` |
| Author | Round avatar | `AvatarFallback` |
| Supporter | Round avatar | `AvatarFallback` |

---

## 9. SEO heading audit

| Element | Tag | Location |
|---------|-----|----------|
| “Bảng xếp hạng” | **h1** (one only) | `RankingHero` |
| Active board name | **h2** | `RankingTabs` |
| “Bảng chi tiết” | **h2** | `RankingList` |
| “Cách tính bảng này” | **h2** | `RankingScoringExplainer` |
| Empty state title | **h2** | `RankingEmptyState` |
| Podium (screen reader) | **h2** sr-only | `RankingPodium` |
| Share modal title | **h2** | `RankingShareModal` |
| Item titles | **p** / no heading | Podium cards, list rows |
| Header / sidebar / footer | No h1 | App shell unchanged |

**Metadata:** `app/rankings/page.tsx` — title “Bảng xếp hạng truyện và tác giả | ChapMee”

---

## 10. Mobile QA checklist

| Check | Expected |
|-------|----------|
| Hero height | ~160–200px, not full viewport |
| Selector | Horizontal scroll chips; sticky backdrop under hero |
| Podium | #1 first on mobile; 2-col row for #2/#3 |
| List rows | No horizontal overflow; 56px+ cover width |
| Share modal | Bottom sheet layout; 4 actions in 2×2 grid |
| Empty state | Compact; suggestion chips wrap |
| Supporters | Mini 3-col or stack; small empty line |
| Footer | Global `SiteFooter` — unchanged, not ranking-specific |

---

## 11. Issues found & fixed (this pass)

| Issue | Fix |
|-------|-----|
| Unused `RankingBoardPicker.tsx` (vertical list dead code) | Deleted |
| Scoring box only when items exist | Extracted `RankingScoringExplainer`; shown whenever loaded |
| Scoring copy too brief | Added signal chips + fairness note |
| `RankMedalIcon` alias missing | Exported from `MedalBadge.tsx` |
| Podium used `MedalBadge` directly | Switched to `RankMedalIcon` |

---

## 12. Remaining TODO (out of scope)

| Item | Priority |
|------|----------|
| Trend badges (↑ ↓ Mới) | Needs snapshot delta in backend |
| “Bạn đang ở đâu?” user rank strip | Needs `/api/rankings/me` |
| Truyện sáng tác / Truyện dịch boards | Needs content-origin snapshots |
| `ranking_share_*` analytics events | Optional; `trackEvent` not wired yet |
| Public `/legal/ranking-methodology` page | Link currently → `/content-policy` |
| Add `/bang-xep-hang` to `SEO_HEADING_STANDARD.md` table | Docs-only |
| Deprecate legacy `StoryRankingCard` on `/tac-gia` if unused | Separate cleanup |

---

## 13. Build result

```bash
npm run build
# exit code: 0
# Next.js 16.2.6 — compiled + TypeScript OK + 149 static pages
```

(`pnpm` not in PATH on validation machine; `npm run build` used.)

---

## 14. Files changed (this validation pass)

| File | Change |
|------|--------|
| `components/rankings/RankingBoardPicker.tsx` | Deleted |
| `components/rankings/RankingScoringExplainer.tsx` | Created |
| `components/rankings/RankingTabs.tsx` | Use explainer; remove inline aside |
| `components/rankings/MedalBadge.tsx` | Export `RankMedalIcon` alias |
| `components/rankings/RankingPodiumCard.tsx` | Use `RankMedalIcon` |
| `docs/RANKING_PAGE_FINAL_VALIDATION_REPORT.md` | This report |

---

*Validation complete — ranking page ready for production with documented follow-ups.*
