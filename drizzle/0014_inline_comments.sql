-- Inline (passage-anchored) chapter comments.

create table if not exists public.inline_comment_anchors (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  block_id text not null,
  start_offset integer not null,
  end_offset integer not null,
  quote_text text not null,
  content_hash_at_anchor text,
  anchor_version integer not null default 1,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint inline_anchor_offsets check (start_offset >= 0 and end_offset > start_offset),
  constraint inline_anchor_quote_len check (char_length(quote_text) between 1 and 500),
  constraint inline_anchor_status check (status in ('active', 'orphaned', 'suppressed'))
);

create index if not exists inline_comment_anchors_chapter_block_idx
  on public.inline_comment_anchors (chapter_id, block_id);

create index if not exists inline_comment_anchors_chapter_status_idx
  on public.inline_comment_anchors (chapter_id, status);

create table if not exists public.inline_comment_threads (
  id uuid primary key default gen_random_uuid(),
  anchor_id uuid not null references public.inline_comment_anchors(id) on delete cascade,
  chapter_id uuid not null references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  reply_count integer not null default 0,
  last_activity_at timestamptz not null default now(),
  is_locked boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists inline_comment_threads_anchor_uidx
  on public.inline_comment_threads (anchor_id);

create index if not exists inline_comment_threads_chapter_activity_idx
  on public.inline_comment_threads (chapter_id, last_activity_at desc);

create table if not exists public.inline_comments (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inline_comment_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.inline_comments(id) on delete cascade,
  body text not null,
  status text not null default 'visible',
  engagement_source text not null default 'user',
  is_counted_in_ranking boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inline_comments_body_len check (char_length(body) between 1 and 500),
  constraint inline_comments_status check (status in ('visible', 'hidden', 'deleted')),
  constraint inline_comments_engagement_source check (
    engagement_source in ('user', 'system', 'admin_seed', 'import', 'test')
  )
);

create index if not exists inline_comments_thread_created_idx
  on public.inline_comments (thread_id, created_at);

create index if not exists inline_comments_user_id_idx
  on public.inline_comments (user_id);

comment on table public.inline_comment_anchors is
  'Stable passage anchor within a chapter block for inline comment threads.';

comment on table public.inline_comment_threads is
  'One thread per anchor — multiple comments share the same highlighted passage.';

comment on table public.inline_comments is
  'User comments anchored to a passage within a chapter.';
