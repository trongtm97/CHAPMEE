# Ranking Final Audit Report

**Date:** 2026-06-03  
**Route:** `/bang-xep-hang`  
**Scope:** Final validation + cleanup after ranking data fix, official formulas, and UI redesign.

---

## Executive summary

| Area | Status |
|------|--------|
| Empty boards (logic bug) | ✅ Fixed — live fallback when snapshots missing |
| Official formulas (sáng tác / dịch) | ✅ Implemented in `lib/ranking/ranking-formulas.ts` |
| All categories visible | ✅ Grouped grid selector — no “Thêm bảng” |
| Top 3 medals | ✅ Vàng / Bạc / Đồng via `RankingPodium` |
| Share CTA | ✅ Story ranking badge modal + supporter Web Share / copy |
| Build | ✅ `npm run build` exit 0 |

---

## 1. Root cause of empty rankings

**Primary:** `getRankingBoard()` read only `ranking_snapshots`. Empty table → `items: []` for all story boards.

**Secondary:** `original_stories` / `translation_stories` had `comingSoon: true` → client skipped API fetch.

**Fixes applied:**

- `lib/ranking/live-board-fallback.ts` — live ranking from public/published stories
- `lib/ranking/get-board.ts` — fallback when no snapshot, empty count, or hydrate empty; origin boards always use official live path
- Removed `comingSoon` block in `useRankingBoard`
- Genre boards retain taxonomy fallback (`taxonomy-genre-board-fallback.ts`)

---

## 2. Ranking types displayed (15)

All visible in `RankingSelector` via `RANKING_SELECTOR_GROUPS`:

| Group | Tabs |
|-------|------|
| Thời gian | Hôm nay, Tuần, Tháng |
| Nội dung | Truyện mới, Truyện sáng tác, Truyện dịch, Hoàn thành |
| Tăng trưởng | Đang lên, Lưu nhiều, Đọc tiếp cao, Giữ chân tốt, Được đề cử |
| Cộng đồng | Tác giả mới, Reels, Theo thể loại |

**API mapping:** `GET /api/rankings/board?type={boardType}&window={timeWindow}`

---

## 3. Official formulas

**Module:** `lib/ranking/ranking-formulas.ts`  
**Orchestration:** `lib/ranking/ranking-service.ts` → `scoreOriginBoardStories()`

### Truyện sáng tác — `calculateOriginalStoryRankScore`

| Component | Weight |
|-----------|--------|
| valid_reads | 25% |
| continue_rate | 18% |
| save_follow | 14% |
| engagement_quality | 12% |
| recommendation_vote | 10% |
| update_consistency | 8% |
| new_reader_growth | 5% |
| **paid_support_capped** | **5%** (raw cap `PAID_SUPPORT_RAW_CAP = 500_000`) |
| freshness | 3% |

- Chapter/bundle **revenue is not** a ranking signal.
- `unlock_rate` not used as positive weight.

### Truyện dịch — `calculateTranslatedStoryRankScore`

| Component | Weight |
|-----------|--------|
| valid_reads | 24% |
| continue_rate | 18% |
| update_reliability | 16% |
| save_follow | 12% |
| translation_quality_review | 12% |
| engagement_quality | 8% |
| source_progress | 6% |
| freshness | 4% |

- **No** paid chapter / full story / tips score.
- Eligibility excludes paid monetization policy and non-free translations.

### Score safety

- `clampScore()` returns `0` for non-finite values (`NaN`, `Infinity`).
- `ranking-service.ts` guards output: `Number.isFinite(result.score) ? result.score : 0`.

---

## 4. Fallback behavior

| Scenario | Behavior |
|----------|----------|
| No `ranking_snapshots` | Live fallback from published stories |
| Sparse week data (top/origin boards) | Expand to 30 days + `fallbackNote` |
| Missing `story_metrics_daily` | Freshness/recency boost; `metricsNote` in UI |
| Origin boards with partial metrics | Official formula + `usedFallbackMetrics` flag |
| Genre snapshot empty | Taxonomy fallback by slug |

**UI note:** *"Dữ liệu đang tích lũy, tạm xếp theo cập nhật và tương tác hiện có."*

---

## 5. UI validation

| Check | Result |
|-------|--------|
| All categories visible | ✅ 4-group grid in `RankingSelector.tsx` |
| No “Thêm bảng” | ✅ Removed dropdown; grep clean in app/components/lib |
| Active state | ✅ Gold border/gradient on selected chip |
| Layout alignment | ✅ `max-w-5xl` on page; hero/selector/results share width |
| Top 3 medals | ✅ `RankingPodium` + `RankMedalIcon`; 1–2 items degrade gracefully |
| Share (stories) | ✅ `RankingShareButton` → modal, copy, Web Share, PNG badge |
| Share (supporters) | ✅ `SupporterShareButton` → Web Share / clipboard |
| Empty state | ✅ Compact `RankingEmptyState` with suggestion links |
| Top fan ủng hộ | ✅ Red podium section; title updated per product copy |
| Story covers | ✅ 3:4 via `ChapMeeCover` — no 16:9 in ranking UI |
| Profile links | ✅ `getProfileUrl` → `/@username`; no `/creator/` `/author/` in ranking components |

---

## 6. Cleanup performed

| Item | Action |
|------|--------|
| `RankingBoardPicker.tsx` | Previously deleted |
| “Thêm bảng” dropdown | Removed from `RankingSelector.tsx` |
| `RANKING_PRIMARY_TAB_IDS` / `RANKING_MORE_TAB_IDS` | **Removed** (unused deprecated exports) |
| `comingSoon` fetch skip | Removed from `useRankingBoard` |
| “Bảng đang hoạt động” hero stat | Removed |
| Fake/demo ranking data | None in production path |

**Kept (used elsewhere):** `StoryRankingCard`, `AuthorRankingCard`, `FanRankingCard`, `EarningAuthorRankingCard`, `RankingBoardCard` (discover/boost), `SupporterRankingCard` (barrel export only).

---

## 7. Search check results

### `Thêm bảng | More boards | moreBoards`

```
docs/RANKING_PAGE_FINAL_VALIDATION_REPORT.md  (historical doc only)
docs/CONTENT_ORIGIN_AND_MONETIZATION_POLICY.md  (unrelated — DB migration text)
```

**App code:** ✅ No matches in `app/`, `components/`, `lib/`.

### `calculateOriginalStoryRankScore | calculateTranslatedStoryRankScore`

```
lib/ranking/ranking-formulas.ts   — definitions
lib/ranking/ranking-service.ts    — wired for origin boards
docs/RANKING_OFFICIAL_FORMULAS.md — documentation
```

### `NaN | Infinity` in `lib/ranking`

```
lib/ranking/ranking-formulas.ts — clampScore guards non-finite
lib/ranking/ranking-types.ts    — antiFraud flag name only (fakeSavesFollows)
```

No unguarded NaN/Infinity in score output path.

### `/creator/ | /author/ | /tac-gia/` in ranking UI

```
components/rankings/ — no matches
lib/ranking/         — only lib/creator/supabase-selects imports (DB join, not routes)
```

---

## 8. Board-by-board validation (logic)

| Board | Data source | Empty when |
|-------|-------------|------------|
| Hôm nay | Snapshots or live fallback | No public stories in window |
| Tuần | Same | Same; may show 30-day fallback note |
| Tháng | Same | Same |
| Truyện mới | Live/snapshot; sort by published_at | No published stories |
| Truyện sáng tác | **Official formula** (always live) | No eligible original stories |
| Truyện dịch | **Official formula** (always live) | No eligible free translations |
| Đang lên | Live fallback + growth signal | No candidates |
| Hoàn thành | Filter `is_completed` | No completed public stories |
| Lưu nhiều | Metrics/snapshot; may filter low save rate in cron | No saves signal |
| Đọc tiếp cao | Chapter board type | Snapshot/cron dependent |
| Giữ chân tốt | Long-tail filters | Sparse metrics |
| Được đề cử | Boost aggregate | No boost data |

**Note:** `chapter_next_rate`, `reels_read_through`, `boosted_stories` still depend on snapshot cron or dedicated aggregates when live fallback returns null — documented as remaining TODO.

---

## 9. Build result

```
npm run build
Next.js 16.2.6 — Compiled successfully
TypeScript — pass
Static generation — 149 pages
Exit code: 0
```

(`pnpm` not in PATH; used `npm run build`.)

---

## 10. Remaining TODO

- [ ] Run snapshot cron in production for metric-weighted boards at scale
- [ ] Live fallback for `reels_read_through`, `chapter_next_rate`, `boosted_stories`
- [ ] Aggregate `story_ranking_metrics_daily` to avoid scanning raw events
- [ ] Wire real anti-fraud flags from analytics pipeline
- [ ] Admin UI to override `DEFAULT_*_STORY_RANKING_WEIGHTS`
- [ ] Update stale docs: `RANKING_PAGE_FINAL_VALIDATION_REPORT.md`, `RANKING_PAGE_REDESIGN_PLAN.md`

---

## 11. Key files (ranking stack)

| File | Role |
|------|------|
| `app/rankings/page.tsx` | Page shell `max-w-5xl` |
| `components/rankings/RankingTabs.tsx` | Orchestrator |
| `components/rankings/RankingSelector.tsx` | All-board grouped grid |
| `components/rankings/RankingPodium.tsx` | Top 3 medals |
| `components/rankings/RankingShareModal.tsx` | Story share badge |
| `components/supporters/SupporterRanking.tsx` | Top fan ủng hộ |
| `lib/ranking/get-board.ts` | API board fetch |
| `lib/ranking/live-board-fallback.ts` | Live ranking |
| `lib/ranking/ranking-formulas.ts` | Official scores |
| `lib/ranking/ranking-service.ts` | Origin board scoring |
| `hooks/useRankingBoard.ts` | Client fetch hook |

---

## 12. Acceptance criteria checklist

- [x] Ranking not empty due to logic-only bugs (fallback in place)
- [x] Official formula — Truyện sáng tác
- [x] Official formula — Truyện dịch (no paid sales score)
- [x] All 15 categories visible — no “Thêm bảng”
- [x] Top 3 medals correct
- [x] Share CTA with copy/Web Share fallback
- [x] UI aligned, compact empty state
- [x] No NaN/Infinity in score output path
- [x] This report created
- [x] Build pass
