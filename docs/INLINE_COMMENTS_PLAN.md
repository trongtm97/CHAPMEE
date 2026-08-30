# Inline Comments (Wattpad-style) — Implementation Plan

**Parent:** [READER_ENGAGEMENT_ARCHITECTURE.md](./READER_ENGAGEMENT_ARCHITECTURE.md)  
**Status:** MVP implemented (reader UI + counts-on-demand + stable `data-block-id`)  
**Priority:** Phase 3 (after reaction catalog + structured reviews)

### MVP notes (implemented)

- **Schema:** 3-table model (`inline_comment_anchors` → `inline_comment_threads` → `inline_comments`), not the flattened 2-table sketch in PROMPT 4; API names match PROMPT 4 (`getInlineCommentCounts`, `createInlineCommentThread`, etc.).
- **Block IDs:** Legacy prose `{chapterId}:{contentHashPrefix}:p{index}`; composer `{chapterId}:b:{block.id}`. DOM: `data-block-id`, `data-block-index`.
- **Orphan:** Anchors with `status = orphaned` are excluded from counts; thread UI shows snapshot quote with warning.
- **Limitation:** Legacy block IDs change when `episodes.content_hash` changes → existing anchors become orphaned (no auto-repair in MVP).
- **Migration:** Apply `drizzle/0014_inline_comments.sql`, `0015_*`, `0017_inline_comments_prompt4.sql` via `npm run db:migrate`.

---

## 1. Goals

- Reader selects a sentence/paragraph in a published chapter and posts a comment **anchored** to that passage.
- Comments appear in context (margin markers, highlight, or side thread) — not only at chapter footer.
- Existing **episode-level** comments (`comments` table + `ChapterCommentsPanel`) remain for general discussion.

---

## 2. Current baseline

| Item | State |
|------|--------|
| Episode comments | `comments.episode_id` + flat list, `getComments` limit 30 |
| Create flow | `lib/comments/createComment.ts` — story OR community post, optional `parent_id` |
| Reader UI | `ChapterCommentsPanel`, `ChapterCommentsSheet` — no text selection |
| Content model | Composer JSON + prose via `PresentationReaderContentWithAds` |
| Reports | `target_type: 'comment'` supported |

**Gap:** No `start_offset`, `end_offset`, `block_id`, or `quote_text` anywhere in schema.

---

## 3. Proposed schema

### 3.1 `inline_comment_anchors`

Stable reference to a passage within a chapter revision.

```sql
create table public.inline_comment_anchors (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  -- Canonical anchor (survives minor edits when possible)
  block_id text not null,              -- e.g. composer block id or prose paragraph index
  start_offset int not null,           -- UTF-16 or codepoint index in block plain text
  end_offset int not null,
  quote_text text not null,            -- snapshot at create time (display + fuzzy repair)
  content_hash_at_anchor text,         -- episodes.content_hash when anchor created
  anchor_version int not null default 1,
  status text not null default 'active'  -- active | orphaned | suppressed
    check (status in ('active', 'orphaned', 'suppressed')),
  created_at timestamptz not null default now(),
  constraint inline_anchor_offsets check (start_offset >= 0 and end_offset > start_offset),
  constraint inline_anchor_quote_len check (char_length(quote_text) between 1 and 500)
);

create index inline_comment_anchors_chapter_block_idx
  on public.inline_comment_anchors (chapter_id, block_id);
```

### 3.2 `inline_comment_threads`

One thread per anchor (Wattpad: multiple comments share one highlight).

```sql
create table public.inline_comment_threads (
  id uuid primary key default gen_random_uuid(),
  anchor_id uuid not null references public.inline_comment_anchors(id) on delete cascade,
  chapter_id uuid not null references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  reply_count int not null default 0,
  last_activity_at timestamptz not null default now(),
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index inline_comment_threads_anchor_uidx
  on public.inline_comment_threads (anchor_id);
```

### 3.3 `inline_comments`

```sql
create table public.inline_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inline_comment_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.inline_comments(id) on delete cascade,
  body text not null,
  status text not null default 'visible'
    check (status in ('visible', 'hidden', 'deleted')),
  engagement_source text not null default 'user'
    check (engagement_source in ('user', 'system', 'admin_seed', 'import', 'test')),
  is_counted_in_ranking boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inline_comments_body_len check (char_length(body) between 1 and 500)
);

create index inline_comments_thread_created_idx
  on public.inline_comments (thread_id, created_at);
```

**Ranking rule:** Aggregates use `engagement_source = 'user' AND is_counted_in_ranking = true AND status = 'visible'`.

### 3.4 Optional link to legacy `comments`

For unified moderation inbox, add nullable `inline_comment_id` on `reports` or map `target_type = 'inline_comment'`.

---

## 4. Anchor strategy

### 4.1 Block IDs at publish time

On chapter publish / S3 save (`lib/chapters/persist-chapter-content.ts`):

1. Walk composer document or prose paragraphs.
2. Assign stable `block_id` = `{chapterId}:{sequence}` or reuse composer block UUID if present.
3. Persist `chapter_block_map` JSON on episode (new column **or** sidecar in envelope metadata) — versioned with `content_hash`.

### 4.2 Client selection

1. User selects text within a block element `[data-chapter-block-id]`.
2. Compute `start_offset` / `end_offset` relative to block plain text (use same normalizer as server).
3. POST anchor + first comment atomically.

### 4.3 Orphan repair

When `episodes.content_hash` changes (author edit):

| Strategy | Action |
|----------|--------|
| Fuzzy match | If `quote_text` still found in new block text → update offsets |
| Partial match | Mark anchor `orphaned`, show “đoạn gốc đã thay đổi” + quote snapshot |
| Re-anchor | Author tools only — not automatic |
| Studio warning | List orphaned threads before publish |

Job: `scripts/repair-inline-anchors.ts` (admin/cron) — **TODO post-MVP**.

---

## 5. API / server modules

```
lib/inline-comments/
  create-inline-comment.ts      -- transaction: anchor + thread + comment
  get-inline-threads.ts         -- by chapter_id, paginated
  get-inline-thread-detail.ts
  delete-inline-comment.ts
  hide-inline-comment.ts        -- studio/admin
  repair-anchor.ts              -- internal

app/api/inline-comments/
  route.ts                      -- POST create (auth)
  threads/route.ts              -- GET list ?chapterId=&cursor=

hooks/
  useReaderTextSelection.ts     -- client selection → anchor payload
```

Reuse:

- `enforceRateLimit('inline_comment', userId)` — new key in `lib/rate-limit.ts`
- `detectPotentialSpamContent`
- `createNotification` — new template `inline_comment_reply`
- `assertActionAccess('comment.create')` or new `inline_comment.create`

---

## 6. Reader UI

| Surface | Behavior |
|---------|----------|
| Desktop | Highlights in margin; click opens thread drawer |
| Mobile | Selection toolbar → “Bình luận đoạn này” → bottom sheet |
| Locked chapter | Disable selection API on preview-only DOM |
| General comments | Keep footer / sidebar panel unchanged |

Components (new):

- `InlineCommentMarkerLayer`
- `InlineCommentThreadSheet`
- `InlineCommentComposer`

Integrate in `ReaderPage` after `PresentationReaderContentWithAds`.

---

## 7. Moderation / reporting

- Extend `ReportTargetType`: `inline_comment`, `inline_comment_thread`
- Studio: filter by `story_id`, `chapter_id`, `status`
- Auto-hide on N reports — reuse community auto-moderation settings pattern (`lib/admin/update-auto-moderation-settings.ts`)
- **Admin seed comments:** `engagement_source = 'admin_seed'`, badge in UI, excluded from counts

---

## 8. MVP vs TODO

### MVP (Phase 3a)

- Prose / plain composer chapters only (no image-only blocks)
- Create + list threads for chapter (paginated, 20 per page)
- One level replies (`parent_id` on `inline_comments`)
- Orphan → show quote snapshot only
- User source only

### TODO (Phase 3b+)

- Thread on image captions
- “Most liked” inline sorting
- Creator pin highlight
- Cross-chapter inline search
- Realtime updates (Supabase realtime / SSE) — optional

---

## 9. Migration / coexistence

- Do **not** migrate existing `comments` rows to inline.
- Episode-level comments stay on `comments` table.
- Analytics event: `inline_comment_created` with `anchor_id`, `block_id`

---

## 10. Testing checklist

- [ ] Anchor survives whitespace-only edit (fuzzy)
- [ ] Anchor orphans on paragraph delete
- [ ] Paid chapter: no full-text leak in inline API
- [ ] Rate limit blocks spam
- [ ] Self-action on own story allowed (comments) but monitor abuse
- [ ] `engagement_source=test` excluded from ranking SQL

---

## 11. Files to touch (implementation prompt)

- `drizzle/00XX_inline_comments.sql`
- `lib/inline-comments/*`
- `components/reader/*`
- `lib/chapters/persist-chapter-content.ts` (block map)
- `components/presentation/PresentationReaderContent*.tsx` (data attributes)
- `lib/rate-limit.ts`, `types/moderation.ts`
- `lib/audit/log-admin-action.ts` (new actions)
