-- Migration 093: Review queue indexes (sau khi enum changes_requested đã commit ở 092)

create index if not exists idx_stories_review_queue
  on public.stories(status, created_at desc)
  where status in ('pending', 'changes_requested');

create index if not exists idx_episodes_review_queue
  on public.episodes(status, created_at desc)
  where status in ('pending', 'changes_requested');
