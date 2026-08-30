-- PROMPT 4: anchor metadata + longer comment bodies.

alter table public.inline_comment_anchors
  add column if not exists block_index integer,
  add column if not exists selected_text_hash text,
  add column if not exists prefix_text text,
  add column if not exists suffix_text text;

comment on column public.inline_comment_anchors.content_hash_at_anchor is
  'Chapter content_hash at anchor creation (chapter_version surrogate).';

alter table public.inline_comment_anchors
  drop constraint if exists inline_anchor_status;

alter table public.inline_comment_anchors
  add constraint inline_anchor_status check (
    status in ('active', 'orphaned', 'suppressed', 'resolved', 'hidden', 'deleted')
  );

alter table public.inline_comments
  drop constraint if exists inline_comments_body_len;

alter table public.inline_comments
  add constraint inline_comments_body_len check (char_length(body) between 1 and 2000);

alter table public.inline_comments
  drop constraint if exists inline_comments_status;

alter table public.inline_comments
  add constraint inline_comments_status check (
    status in ('visible', 'pending', 'hidden', 'deleted')
  );

create index if not exists inline_comment_threads_chapter_block_lookup_idx
  on public.inline_comment_threads (chapter_id);
