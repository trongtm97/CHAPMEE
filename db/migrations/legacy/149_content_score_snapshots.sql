-- Precomputed content scores for Reels, Discover, Search, Ranking.

create table if not exists public.content_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_at timestamptz not null default now(),
  item_type text not null,
  item_id uuid not null,
  story_id uuid references public.stories(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  quality_score numeric not null default 0,
  personal_fit_score numeric,
  freshness_score numeric not null default 0,
  discovery_score numeric not null default 0,
  fairness_score numeric not null default 1,
  safety_score numeric not null default 1,
  spam_penalty numeric not null default 0,
  final_reels_score numeric not null default 0,
  final_discover_score numeric not null default 0,
  final_search_boost_score numeric not null default 0,
  final_ranking_score numeric not null default 0,
  metrics_window text not null default '7d',
  debug_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint content_score_snapshots_item_type_check check (
    item_type in ('story', 'chapter', 'reel')
  )
);

create index if not exists content_score_snapshots_item_type_id_idx
  on public.content_score_snapshots (item_type, item_id, snapshot_at desc);

create index if not exists content_score_snapshots_author_user_id_idx
  on public.content_score_snapshots (author_user_id, snapshot_at desc);

create index if not exists content_score_snapshots_final_reels_idx
  on public.content_score_snapshots (final_reels_score desc, snapshot_at desc);

create index if not exists content_score_snapshots_final_discover_idx
  on public.content_score_snapshots (final_discover_score desc, snapshot_at desc);

create index if not exists content_score_snapshots_final_ranking_idx
  on public.content_score_snapshots (final_ranking_score desc, snapshot_at desc);

create index if not exists content_score_snapshots_created_at_idx
  on public.content_score_snapshots (created_at desc);

alter table public.content_score_snapshots enable row level security;

create policy "Content score snapshots readable by authenticated"
  on public.content_score_snapshots for select
  to authenticated, anon
  using (true);

create policy "Content score snapshots insertable by service staff"
  on public.content_score_snapshots for insert
  to authenticated
  with check (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
    or public.current_profile_role() in ('admin', 'moderator')
  );
