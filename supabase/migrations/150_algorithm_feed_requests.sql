-- Debug log for algorithm feed mixing (pool counts + selected items).

create table if not exists public.algorithm_feed_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  surface text not null,
  algorithm_version text,
  pool_config jsonb not null default '{}'::jsonb,
  pool_counts jsonb not null default '{}'::jsonb,
  selected_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint algorithm_feed_requests_surface_check check (
    surface in (
      'reels', 'discover', 'search', 'ranking', 'category', 'story_detail',
      'chapter_detail', 'profile', 'community', 'notification', 'other'
    )
  )
);

create index if not exists algorithm_feed_requests_request_id_idx
  on public.algorithm_feed_requests (request_id);

create index if not exists algorithm_feed_requests_surface_created_idx
  on public.algorithm_feed_requests (surface, created_at desc);

create index if not exists algorithm_feed_requests_user_created_idx
  on public.algorithm_feed_requests (user_id, created_at desc)
  where user_id is not null;

alter table public.algorithm_feed_requests enable row level security;

create policy "Algorithm feed requests readable by staff"
  on public.algorithm_feed_requests for select
  using (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.current_profile_role() in ('admin', 'moderator')
  );

create policy "Algorithm feed requests insertable by service"
  on public.algorithm_feed_requests for insert
  with check (true);
