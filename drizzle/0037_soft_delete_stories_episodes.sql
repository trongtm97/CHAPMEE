-- 0037_soft_delete_stories_episodes.sql
-- Soft-delete support: stories/chapters sit in "pending delete" state for 3 days
-- before permanent removal, giving users a chance to restore.

alter table public.stories
  add column if not exists deleted_at timestamptz;

alter table public.episodes
  add column if not exists deleted_at timestamptz;

create index if not exists idx_stories_deleted_at
  on public.stories (deleted_at)
  where deleted_at is not null;

create index if not exists idx_episodes_deleted_at
  on public.episodes (deleted_at)
  where deleted_at is not null;
