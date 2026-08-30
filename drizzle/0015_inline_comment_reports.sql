-- Inline comment report counts for moderation auto-hide.

alter table public.inline_comments
  add column if not exists report_count integer not null default 0;

create index if not exists inline_comments_status_created_idx
  on public.inline_comments (status, created_at desc);

comment on column public.inline_comments.report_count is
  'Open reports against this inline comment — used for auto-hide threshold.';
