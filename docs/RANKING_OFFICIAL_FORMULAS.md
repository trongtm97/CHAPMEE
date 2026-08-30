# Official Ranking Formulas — Truyện Sáng Tác & Truyện Dịch

**Module:** `lib/ranking/ranking-formulas.ts`  
**Service:** `lib/ranking/ranking-service.ts`  
**Boards:** `/bang-xep-hang/truyen-sang-tac`, `/bang-xep-hang/truyen-dich`

---

## Overview

ChapMee uses **separate official ranking formulas** for original and translated stories. Scores are on a **0–100** scale. Weights are centralized in `DEFAULT_ORIGINAL_STORY_RANKING_WEIGHTS` and `DEFAULT_TRANSLATED_STORY_RANKING_WEIGHTS` for future admin override.

Ranking serves **content discovery**, not revenue leaderboard.

---

## Truyện sáng tác (Original)

### Eligibility gates

| Gate | Rule |
|------|------|
| Origin | `content_origin` = original (not translation) |
| Status | `approved` or `published` |
| Visibility | `public` |
| Moderation | Not `flagged`, `removed`, `hidden` |
| Quality | Not `permanently_hidden_low_quality` |
| Author | Active creator profile linked |

### Official formula (weights sum = 100%)

| Component | Weight | Source |
|-----------|--------|--------|
| `valid_reads_score` | 25% | Valid chapter completes / reads (`story_metrics_daily`) |
| `continue_rate_score` | 18% | Next-chapter continuation rate |
| `save_follow_score` | 14% | Saves + follows (log-normalized) |
| `engagement_quality_score` | 12% | Comments, reactions, reviews; penalized by reports |
| `recommendation_vote_score` | 10% | Boost points (`story_boost_daily_stats`) |
| `update_consistency_score` | 8% | Chapters published in period, gap penalty |
| `new_reader_growth_score` | 5% | Growth vs prior period valid reads |
| `paid_support_score_capped` | **5% max** | Tips + unlocks, hard-capped (`PAID_SUPPORT_RAW_CAP`) |
| `freshness_score` | 3% | Recency decay on publish/update |

**Important:**

- Paid support is capped at **5% weight** and raw value cap — whales cannot dominate.
- **Chapter sales revenue is NOT a ranking signal.**
- `unlock_rate` is not used as a positive ranking weight.

---

## Truyện dịch (Translation)

### Eligibility gates

| Gate | Rule |
|------|------|
| Origin | `content_origin` = `translation` |
| Status / visibility | Public + published (same as original) |
| Free read | `must_be_free_to_read` ≠ false |
| Monetization | `monetization_policy` ≠ `full` |
| Paid sales | Blocked when both chapter + bundle sales enabled without free-only policy |
| Moderation / quality | Same exclusions as original |
| Source | `source_url` used for progress scoring when present |

### Official formula (weights sum = 100%)

| Component | Weight | Source |
|-----------|--------|--------|
| `valid_reads_score` | 24% | Valid reads |
| `continue_rate_score` | 18% | Continuation rate |
| `update_reliability_score` | 16% | Update cadence, gap penalties (>21/45/90 days) |
| `save_follow_score` | 12% | Saves + follows |
| `translation_quality_review_score` | 12% | `story_review_stats` (overall + writing style) |
| `engagement_quality_score` | 8% | Comments / reactions (anti-spam via report penalty) |
| `source_progress_score` | 6% | Source URL + recent chapter activity |
| `freshness_score` | 4% | Recency |

**Important:**

- **No paid chapter score.**
- **No paid full-story score.**
- Tips are **not** in the official translation formula.
- Placeholder / stale-source patterns receive penalties via `applyAntiFraudPenalty`.

---

## Normalization

`normalizeMetric()` in `ranking-formulas.ts`:

- Default: **log1p** scaling to 0–100
- Optional: linear, percentile
- Hard caps on extreme values (`cap`, `maxReference`)
- All final scores clamped **0–100**

---

## Time periods

Supported: `day` (today), `week`, `month`, `all_time`

Period affects:

- Metric window via `windowStartDate()` / `priorPeriodStartDate()`
- Freshness multiplier (`ranking-period.ts`)
- Boost / chapter counts in window

---

## Fallback rules

When `story_metrics_daily` (or other tables) are empty:

1. Detect missing metrics (`detectMissingMetrics`)
2. Boost `valid_reads`, `continue_rate`, `save_follow` from **freshness** derived from `updated_at` / `published_at`
3. Flag `usedFallbackMetrics: true` (dev log in `ranking-service`)
4. Story still eligible if passes gates — empty state only when no eligible stories exist

---

## Anti-fraud & quality penalties

`applyAntiFraudPenalty()` — flags (ready for future pipeline):

- Self views, bot traffic, repeat sessions
- Short sessions, spam comments, fake saves/follows
- Paid manipulation, report violations
- Duplicate source conflict, stale source progress, placeholder chapters

`applyQualityPenalty()`:

- Low-quality reviews, moderation flags, permanently hidden, policy blocked

**TODO:** Wire real-time fraud flags from analytics pipeline when available.

---

## What is NOT counted

| Signal | Original | Translation |
|--------|----------|---------------|
| Chapter sales revenue | ❌ | ❌ |
| Full story bundle revenue | ❌ | ❌ |
| Unlock rate as positive weight | ❌ | ❌ |
| Tips (primary weight) | Capped 5% | ❌ |
| Draft / hidden / rejected | ❌ | ❌ |
| Self-view / bot reads | Penalized | Penalized |

---

## Integration with `/bang-xep-hang`

```
GET /api/rankings/board?type=original_stories|translation_stories&window=week
  → getRankingBoard() — always uses live official path for origin boards
  → scoreOriginBoardStories() — ranking-service.ts
  → calculateOriginalStoryRankScore() | calculateTranslatedStoryRankScore()
```

UI displays score as `XX.X điểm` (0–100 scale).

---

## Future admin settings TODO

- [ ] Admin UI to override `DEFAULT_*_STORY_RANKING_WEIGHTS`
- [ ] Persist overrides in algorithm config (like existing `ranking.weight.*`)
- [ ] Valid-read pipeline with dwell time / bot exclusion
- [ ] Aggregate `story_ranking_metrics_daily` table
- [ ] Duplicate-source conflict detection feed into `antiFraud.duplicateSourceConflict`
- [ ] Comment/reaction spam classifier feed into `antiFraud.spamComments`

---

## Files

| File | Role |
|------|------|
| `lib/ranking/ranking-formulas.ts` | Official formulas + weights + penalties |
| `lib/ranking/ranking-types.ts` | Input/output types |
| `lib/ranking/ranking-period.ts` | Period helpers |
| `lib/ranking/load-origin-ranking-inputs.ts` | Batch metric loader |
| `lib/ranking/ranking-service.ts` | Board scoring orchestration |
| `lib/ranking/live-board-fallback.ts` | Live board + origin formula wiring |
| `lib/ranking/get-board.ts` | API path — origin boards always official |
