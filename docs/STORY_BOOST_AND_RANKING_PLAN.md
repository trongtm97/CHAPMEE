# Story Boost (“Đề cử”) & Ranking — Implementation Plan

**Parent:** [READER_ENGAGEMENT_ARCHITECTURE.md](./READER_ENGAGEMENT_ARCHITECTURE.md)  
**Status:** MVP implemented (`drizzle/0016_story_boosts.sql`, `0018_story_boost_prompt5.sql`)  
**Priority:** Phase 4 (after reviews; parallel-friendly with content protection)

### MVP shipped

- **Points:** `user_reward_points` + `reward_point_ledger` (earn/spend/adjust)
- **Boost:** `story_boosts` (atomic debit + ledger + boost via SQL CTE), `story_boost_daily_stats`
- **Settings:** `engagement_settings` keys `boost.*` (no hard-coded caps in code paths)
- **UI:** `StoryBoostCard` on story detail, `BoostedStoriesSection` on discover, BXH tab `/bang-xep-hang/duoc-de-cu`
- **Admin:** `/admin/engagement/boost` — config + recent boosts / top stories / suspicious boosters
- **Coin:** `coin_boost_enabled` default `false`; no Sepay / IAP in this phase

---

## 1. Goals

- Users spend **reward points** (MVP) or **coins** (later) to “đề cử” a story.
- Stories appear on a **separate** chart: “Được đề cử” — not raw pay-to-win #1 on organic BXH.
- **Caps, decay, audit ledger**, admin-configurable weights.
- Paid boost must not overwrite organic `ranking_snapshots` scores.

---

## 2. Current baseline

| Item | State |
|------|--------|
| User story boost | **None** |
| Rankings | `ranking_snapshots` + `lib/ranking/generate-snapshots.ts` |
| Weights | `algorithm_settings` keys `ranking.weight.*` — admin configurable |
| Feed boost | `admin_boost` pool in `lib/feed/pools.ts` — editorial only |
| Wallet | `user_wallets`, `transactions` — coin debit patterns exist (`lib/monetization/tips.ts`) |
| Reward points | **No table** — introduce or map to `bonus_coin` with separate `transaction.type` |

---

## 3. Design principles

1. **Separation:** Organic boards (`top_stories`, `rising_stories`, …) unchanged in formula; boost contributes only to `boosted_stories` board and optional small capped term if admin enables.
2. **Transparency:** UI shows “Đề cử” badge + points spent (not hidden manipulation).
3. **Decay:** Older boosts count less in daily aggregates.
4. **Ledger:** Every spend → immutable `transactions` row + `story_boosts` row.
5. **Anti-whale:** Per-user daily cap, per-story daily cap, diminishing returns on repeated boosts same day.

---

## 4. Proposed schema

### 4.1 `story_boosts`

```sql
create table public.story_boosts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid references public.transactions(id),
  currency text not null check (currency in ('reward_points', 'coin')),
  amount_spent int not null check (amount_spent > 0),
  boost_points int not null check (boost_points > 0),  -- effective weight after multipliers
  decay_group date not null default current_date,         -- for daily aggregation
  engagement_source text not null default 'user'
    check (engagement_source in ('user', 'system', 'admin_seed', 'test')),
  is_counted_in_ranking boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index story_boosts_story_created_idx on public.story_boosts (story_id, created_at desc);
create index story_boosts_user_day_idx on public.story_boosts (user_id, decay_group);
```

### 4.2 `story_boost_daily_stats`

```sql
create table public.story_boost_daily_stats (
  story_id uuid not null references public.stories(id) on delete cascade,
  stat_date date not null,
  total_boost_points numeric(12,2) not null default 0,
  unique_boosters int not null default 0,
  decayed_score numeric(12,4) not null default 0,
  primary key (story_id, stat_date)
);
```

### 4.3 `user_reward_points` (if not reusing coins)

```sql
create table public.user_reward_points (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
```

**Alternative MVP:** Grant points via `transactions.type = 'reward_point_grant'` and derive balance from ledger — prefer single ledger pattern.

### 4.4 Ranking board type

Add to `RANKING_BOARD_TYPES`:

```typescript
"boosted_stories"  // UI: "Được đề cử"
```

Snapshot generation reads `story_boost_daily_stats` with rolling 7-day decayed sum.

---

## 5. Economics (admin settings)

Store in `engagement_settings` (with audit):

| Key | Default | Description |
|-----|---------|-------------|
| `boost.enabled` | false | Master toggle (off until launch) |
| `boost.currency` | `reward_points` | `reward_points` \| `coin` |
| `boost.points_per_unit` | 10 | Spend X points → Y boost_points |
| `boost.user_daily_cap` | 100 | Max boost_points per user per day |
| `boost.story_daily_cap` | 500 | Max boost_points per story per day |
| `boost.min_story_age_hours` | 24 | Prevent instant boost spam on upload |
| `boost.decay_half_life_days` | 7 | Exponential decay |
| `boost.organic_blend_max` | 0.05 | Max 5% uplift to organic score (0 = disabled) |
| `boost.diminishing_same_story` | 0.5 | Multiplier for 2nd+ boost same user/story/day |

**Audit:** `engagement_setting_audit_logs` + `admin_audit_logs` on manual grants.

---

## 6. Spend flow

```
User clicks "Đề cử"
  → assert boost.enabled
  → assert caps (user day, story day)
  → begin transaction
      → debit wallet/points (existing RPC pattern)
      → insert transactions (type: story_boost)
      → insert story_boosts
  → commit
  → enqueue stats refresh (story_boost_daily_stats)
  → revalidate boosted board cache
```

Modules:

```
lib/boost/
  spend-story-boost.ts
  get-boost-eligibility.ts
  compute-decayed-score.ts
  refresh-boost-daily-stats.ts
  get-boosted-board.ts

lib/ranking/generate-snapshots.ts  -- add board handler for boosted_stories
```

---

## 7. Ranking integration

### Organic snapshots (`generate-snapshots.ts`)

- **Default:** No change to `computeRankingScore` inputs.
- **Optional (admin):** `organic_blend = min(decayed_boost_normalized * boost.organic_blend_max, cap)` added to `raw_score` — document clearly in admin UI as “minor signal only”.

### Boosted board

```text
decayed_score(story, window) = sum_over_days( total_boost_points * exp(-λ * age_days) )
```

Sort `boosted_stories` by `decayed_score` with author diversity (`applyRankingAuthorDiversity`).

### Feed mixer

- Do **not** merge boost into `admin_boost` pool without label.
- Optional pool `user_boosted` with explainability badge — TODO.

---

## 8. UI

| Surface | Element |
|---------|---------|
| Story page | “Đề cử” button + points balance |
| `/bang-xep-hang` | New tab “Được đề cử” via `RankingTabs` |
| Story cards | Badge when in top N boosted |
| Wallet / Me | Points history |

---

## 9. Anti-abuse

| Threat | Mitigation |
|--------|------------|
| Pay-to-win #1 | Separate board + low organic blend cap |
| Self-boost | Allow but exclude from creator analytics; no monetization kickback |
| Sock puppets | Daily cap + account age + rate limit `boost` |
| Refund abuse | Points non-refundable; coin boosts follow wallet rules |
| Admin manipulation | `engagement_source=admin_seed` excluded from public board |
| Ledger fraud | All spends via `transactions`; reconcile in admin dashboard |

---

## 10. MVP vs TODO

### MVP

- `reward_points` grants (missions/admin) — manual grant OK
- Spend → `story_boosts` + ledger
- `boosted_stories` board (day/week)
- Admin settings + audit
- Caps + decay job

### TODO

- Coin spend
- Boost campaigns / matching
- Gifting boost
- Creator thank-you notification
- Export boost analytics for creators (aggregates only)

---

## 11. Existing files to extend

- `types/ranking-board.ts` — new board type + tab slug
- `lib/ranking/generate-snapshots.ts`, `get-board.ts`
- `components/rankings/RankingTabs.tsx`
- `lib/transactions/ledger.ts` — new `TransactionType`
- `lib/admin/get-admin-dashboard-summary.ts` — boost KPIs
- `lib/algorithm/settings.ts` — optional blend keys OR separate `engagement_settings`

---

## 12. Migration note

- No retroactive boosts.
- `admin_boost` feed pool remains editorial — rename in admin copy to “Ưu tiên biên tập” vs “Đề cử cộng đồng” to avoid user confusion.
