# Structured Story Reviews — Implementation Plan

**Parent:** [READER_ENGAGEMENT_ARCHITECTURE.md](./READER_ENGAGEMENT_ARCHITECTURE.md)  
**Status:** Design only  
**Priority:** Phase 2 (before inline comments)

---

## Phase 2 — Structured reviews (implemented)

| Item | Location |
|------|----------|
| Migration | `drizzle/0013_story_reviews.sql` |
| Server logic | `lib/reviews/story-reviews.ts` |
| UI | `components/story/reviews/*`, tab on story detail |
| Reports | `story_review` target in `types/moderation.ts` |

**TODO:** Admin hide/unhide queue UI; `reviews.min_read_ratio` admin setting; moderation auto-hide when `report_count` threshold exceeded.

---

## 1. Goals

Per-story review with:

| Field | Scale |
|-------|--------|
| Overall | 1–5 stars |
| Cốt truyện (plot) | 1–5 |
| Tuyến nhân vật (characters) | 1–5 |
| Văn phong (writing style) | 1–5 |
| Bối cảnh thế giới (worldbuilding) | 1–5 |
| Review text | Free text (moderated) |

**Rules:** One review per user per story; no self-review; optional read threshold; no fake/seed counts in aggregates.

---

## 2. Current baseline

| Item | State |
|------|--------|
| Story reviews table | **None** |
| Community “review” posts | `types/community.ts` post type — separate product surface |
| Story page ratings | Not found as structured multi-axis |
| Comments on story | `getComments({ storyId })` without `episodeId` — not reviews |

---

## 3. Proposed schema

### 3.1 `story_reviews`

```sql
create table public.story_reviews (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating_overall smallint not null,
  rating_plot smallint not null,
  rating_characters smallint not null,
  rating_style smallint not null,
  rating_worldbuilding smallint not null,
  body text,
  status text not null default 'published'
    check (status in ('published', 'hidden', 'pending_moderation', 'deleted')),
  engagement_source text not null default 'user'
    check (engagement_source in ('user', 'system', 'admin_seed', 'import', 'test')),
  is_counted_in_ranking boolean not null default true,
  contains_spoiler boolean not null default false,
  episodes_read_at_submit int,
  published_episode_count_at_submit int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, user_id),
  constraint story_reviews_overall check (rating_overall between 1 and 5),
  constraint story_reviews_plot check (rating_plot between 1 and 5),
  constraint story_reviews_characters check (rating_characters between 1 and 5),
  constraint story_reviews_style check (rating_style between 1 and 5),
  constraint story_reviews_world check (rating_worldbuilding between 1 and 5),
  constraint story_reviews_body_len check (body is null or char_length(body) <= 4000)
);

create index story_reviews_story_status_idx
  on public.story_reviews (story_id, status, created_at desc);
```

### 3.2 `story_review_stats`

Materialized snapshot per story (refreshed by cron or on write with debounce).

```sql
create table public.story_review_stats (
  story_id uuid primary key references public.stories(id) on delete cascade,
  review_count int not null default 0,
  avg_overall numeric(3,2),
  avg_plot numeric(3,2),
  avg_characters numeric(3,2),
  avg_style numeric(3,2),
  avg_worldbuilding numeric(3,2),
  histogram_overall jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
```

**Aggregate SQL filter:**

```sql
where status = 'published'
  and engagement_source = 'user'
  and is_counted_in_ranking = true
```

### 3.3 `story_review_helpful_votes` (TODO post-MVP)

```sql
-- user_id, review_id, unique (user_id, review_id)
```

---

## 4. Business rules

| Rule | Enforcement |
|------|-------------|
| One review per user per story | DB `unique (story_id, user_id)` |
| No self-review | Server: `story.creator_user_id !== user.id` (also block studio alt accounts via restriction flags) |
| Read threshold | Setting `reviews.min_read_ratio` (0–1): `episodes_read / published_count >= threshold` from `reading_progress` |
| Edit window | Setting `reviews.edit_window_hours` (default 48) — update allowed, re-moderate if body changes |
| Spoiler tag | `contains_spoiler` → blur in UI |
| Rate limit | `enforceRateLimit('story_review', userId)` |
| Spam | `detectPotentialSpamContent` on body |

---

## 5. Server modules

```
lib/reviews/
  create-story-review.ts
  update-story-review.ts
  delete-story-review.ts      -- soft delete status
  get-story-reviews.ts        -- paginated, sort: recent | highest | lowest
  get-story-review-stats.ts
  refresh-story-review-stats.ts
  assert-can-review.ts        -- threshold + not creator

components/stories/
  StoryReviewSummary.tsx
  StoryReviewForm.tsx
  StoryReviewList.tsx

app/truyen/[slug]/page.tsx or story detail tab  -- integrate summary + list
```

---

## 6. Admin integration

### Settings (`engagement_settings` or extend `algorithm_settings`)

| Key | Default | Description |
|-----|---------|-------------|
| `reviews.enabled` | true | Master toggle |
| `reviews.min_read_ratio` | 0.1 | Min % chapters read |
| `reviews.min_account_age_hours` | 24 | Anti sock-puppet |
| `reviews.require_body` | false | Text optional |
| `reviews.auto_hide_report_count` | 3 | Moderation |

### Audit

- `story_review.hidden` → `admin_audit_logs`
- Settings changes → `engagement_setting_audit_logs`

### Admin UI

- `/admin/engagement/reviews` — queue `pending_moderation`, bulk hide
- Extend content review if high report volume

---

## 7. SEO & discovery

- **Public** story pages: show aggregate stars in JSON-LD (`aggregateRating`) only when `review_count >= min_reviews_for_schema` (setting, default 5) — avoid thin/snippet spam.
- Review list pages: `noindex` if filtered/low count (reuse `lib/seo/should-index.ts` patterns).
- Do not generate fake reviews for new stories.

---

## 8. Ranking / quality signals (optional blend)

- Do **not** let average star alone dominate `ranking_snapshots`.
- Optional input: `review_quality_signal = avg_overall * log(1 + review_count)` capped, fed into `computeRankingScore` with weight from `ranking.weight.review_signal` (admin, default 0).
- Separate from boost system.

---

## 9. MVP vs TODO

### MVP

- CRUD review (create/update within window)
- Stats rollup
- Story page tab with pagination (20/page)
- Hide/report/moderation
- Read threshold + no self-review

### TODO

- Helpful votes
- Review replies
- Creator response
- Verified-reader badge
- Import from external platforms

---

## 10. Anti-abuse

1. Exclude `engagement_source != 'user'` from stats and schema.org.
2. Flag burst reviews from new accounts (analytics + admin alert).
3. Correlate with `report_rate` on user — reduce visibility via existing quality penalties.
4. Never copy composer `fake_comment_count` into review counts.

---

## 11. Implementation order (within Phase 2)

1. Drizzle migration + types
2. `assert-can-review` + create/update server actions
3. Stats refresh job
4. Story UI components
5. Admin settings + audit
6. SEO aggregateRating guard
7. RBAC: `review.create`, `review.delete.own`, `admin.reviews.moderate`

---

## 12. Related existing files

- `lib/stories/getStoryBySlug.ts` — attach `reviewStats` in loader
- `lib/reading/*` — progress for threshold
- `lib/reports/createReport.ts` — add `story_review` target
- `lib/rate-limit.ts` — new key
