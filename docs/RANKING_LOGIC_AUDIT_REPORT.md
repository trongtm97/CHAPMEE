# Ranking Logic Audit Report

**Date:** 2026-06-03  
**Scope:** `/bang-xep-hang` data pipeline — why boards were empty and fixes applied.

---

## Executive summary

The ranking page UI was correct, but **almost all boards returned zero items** because `getRankingBoard()` read **only** from the `ranking_snapshots` table. When the snapshot cron had not run (or the table was empty), the API returned `items: []` with no fallback — except `genre_stories`, which already had a taxonomy fallback.

Additionally, **Truyện sáng tác** and **Truyện dịch** tabs were marked `comingSoon: true`, so the client hook skipped the API entirely and always showed an empty board.

**Fix:** Added live fallback ranking from real published stories (`lib/ranking/live-board-fallback.ts`) and wired it into `get-board.ts` when snapshots are missing, empty, or fail hydration. Enabled original/translation board types.

---

## Ranking types found

| UI tab ID | Slug | Board type (`type` param) | Time window (`window` param) |
|-----------|------|----------------------------|------------------------------|
| `today` | `hom-nay` | `top_stories` | `day` (fixed) |
| `week` | `tuan` | `top_stories` | `week` (fixed) |
| `month` | `thang` | `top_stories` | `month` (fixed) |
| `new_stories` | `truyen-moi` | `new_stories` | `week` (fixed) |
| `original_stories` | `truyen-sang-tac` | `original_stories` | `week` (fixed) |
| `translation_stories` | `truyen-dich` | `translation_stories` | `week` (fixed) |
| `new_authors` | `tac-gia-moi` | `new_authors` | `week` |
| `reels` | `reels-keo-doc` | `reels_read_through` | `week` |
| `genre` | `the-loai` | `genre_stories` | `week` |
| `rising` | `dang-len` | `rising_stories` | `week` |
| `completed` | `hoan-thanh` | `completed_stories` | `week` |
| `most_saved` | `luu-nhieu` | `most_saved` | `week` |
| `chapter_next` | `doc-tiep-cao` | `chapter_next_rate` | `week` |
| `long_tail` | `giu-chan-tot` | `long_tail_quality` | `week` |
| `boosted` | `duoc-de-cu` | `boosted_stories` | `week` |

**UI ↔ service keys:** Aligned. Hook sends `type=boardType` and `window=timeWindow`. No `week`/`weekly` or `new-stories`/`new` mismatch.

---

## Root cause: why boards were empty

### 1. Snapshot-only read path (primary)

```
/bang-xep-hang → useRankingBoard → GET /api/rankings/board
  → getRankingBoard()
  → ranking_snapshots (latest snapshot_at)
  → if no snapshot → return items: []
```

If `/api/cron/ranking-snapshots` never ran or `ranking_snapshots` is empty, **every story board returned zero rows**.

### 2. `comingSoon` tabs (secondary)

`original_stories` and `translation_stories` had `comingSoon: true` in `types/ranking-board.ts`. `useRankingBoard` short-circuited fetch and returned empty results by design.

### 3. Snapshot generation filters (when cron runs)

`generate-snapshots.ts` can exclude stories when metrics are sparse:

- `new_stories`: skips stories published > 45 days ago
- `most_saved`: skips if `saveRate < 0.05`
- `long_tail_quality`: skips high-impression or low-quality metric stories

Stories with **zero metrics** still receive a score (freshness-based), but boards depend on cron having run at least once.

### 4. Hydration filter (edge case)

`hydrateRankingSnapshots` re-fetches stories and drops non-public / non-published items. Stale snapshots pointing at removed stories could yield empty hydrated lists even when `totalCount > 0`.

---

## Database / status fields used

| Field | Usage |
|-------|--------|
| `stories.status` | `approved`, `published` (`publicContentStatuses`) |
| `stories.visibility` | `public` |
| `stories.quality_status` | Exclude `permanently_hidden_low_quality` |
| `stories.moderation_status` | Exclude `flagged`, `removed`, `hidden` |
| `stories.content_origin` | `original` vs `translation` for origin boards |
| `stories.monetization_policy` | Translation board excludes `full` (paid) |
| `stories.must_be_free_to_read` | Translation board excludes `false` |
| `stories.published_at` | Sort / freshness / time window |
| `stories.updated_at` | Activity date for week/month filters |
| `stories.created_at` | Fallback activity date |
| `story_metrics_daily` | Optional LEFT-style load (metrics map, not inner join) |
| `ranking_snapshots` | Primary source when populated |

**No inner join on metrics** in fallback path — stories without metrics still rank using freshness / recency.

---

## Filters fixed / joins fixed

| Issue | Fix |
|-------|-----|
| No fallback when snapshots missing | `getLiveRankingBoardFallback()` in `get-board.ts` |
| Empty snapshot count | Same live fallback |
| Hydrated items empty but snapshot rows exist | Same live fallback |
| Original/translation tabs blocked | Removed `comingSoon`; added `original_stories`, `translation_stories` board types |
| Week board empty with few recent updates | Expand to 30-day window with `fallbackNote` label |

---

## Fallback ranking added

**File:** `lib/ranking/live-board-fallback.ts`

| Board | Fallback logic |
|-------|----------------|
| **Truyện mới** (`new_stories`) | Public stories, sort `published_at` / activity DESC |
| **Tuần / Hôm nay / Tháng** (`top_stories` + window) | Filter by activity in window; score with metrics if present, else freshness |
| **Tuần (sparse data)** | If &lt; 3 items in 7 days → 30-day window + note *"Dữ liệu tuần đang tích lũy..."* |
| **Truyện sáng tác** | `content_origin = original` |
| **Truyện dịch** | `content_origin = translation`, free-only (`must_be_free_to_read`, not `monetization_policy = full`) |
| **Hoàn thành** | `is_completed = true` |
| **Đang lên / Lưu nhiều / Giữ chân** | Official score formula when metrics exist; freshness/recency fallback otherwise |
| **Tác giả mới** | Authors with first publish ≤ 90 days |
| **Thể loại** | Existing taxonomy fallback unchanged |

Dev-only logs: `[ranking-fallback]` and `[ranking-board]` in `NODE_ENV=development`.

---

## Remaining missing metrics / TODO

| Area | Status |
|------|--------|
| `reels_read_through` | No live fallback yet — needs reel metrics / eligible reels |
| `chapter_next_rate` | No live fallback yet — needs chapter-level scoring |
| `boosted_stories` | No live fallback yet — needs boost campaign aggregate |
| `story_metrics_daily` | Used when present; empty table OK (freshness fallback) |
| Snapshot cron | Should still run for metric-weighted rankings at scale |
| Aggregate tables | TODO: pre-aggregate saves/reads for `most_saved` / `rising` without scanning raw events |

---

## Files changed

| File | Change |
|------|--------|
| `lib/ranking/live-board-fallback.ts` | **New** — live ranking from published stories |
| `lib/ranking/get-board.ts` | Wire fallback; dev logs; audio enrichment helper |
| `types/ranking-board.ts` | Add `original_stories`, `translation_stories` types; remove `comingSoon` on origin tabs; `fallbackNote` on result |
| `lib/ranking/score-formula.ts` | Reason labels for origin boards |
| `hooks/useRankingBoard.ts` | Expose `fallbackNote` |
| `components/rankings/RankingTabs.tsx` | Show `fallbackNote` in list subtitle |

---

## Build result

```
npm run build — PASS (Next.js 16.2.6, exit code 0)
```

---

## Validation checklist

- [x] Root cause documented (snapshot-only + comingSoon)
- [x] UI/service keys aligned
- [x] Live fallback for core story boards
- [x] Original / translation boards enabled
- [x] Week sparse-data fallback with label
- [x] No fake production data
- [x] Empty state only when no eligible published stories
- [x] Build passes
