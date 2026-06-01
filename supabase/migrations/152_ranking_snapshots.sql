-- Precomputed ranking boards (multi-tab, fairness-aware).

create table if not exists public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  ranking_type text not null,
  time_window text not null,
  genre_id uuid references public.genres(id) on delete set null,
  item_type text not null,
  item_id uuid not null,
  story_id uuid references public.stories(id) on delete set null,
  author_user_id uuid references public.profiles(id) on delete set null,
  rank_position integer not null,
  score numeric not null default 0,
  score_breakdown jsonb not null default '{}'::jsonb,
  snapshot_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ranking_snapshots_time_window_check check (
    time_window in ('day', 'week', 'month', 'all_time')
  ),
  constraint ranking_snapshots_item_type_check check (
    item_type in ('story', 'author', 'reel', 'chapter')
  )
);

create index if not exists ranking_snapshots_type_window_idx
  on public.ranking_snapshots (ranking_type, time_window, snapshot_at desc);

create index if not exists ranking_snapshots_genre_idx
  on public.ranking_snapshots (genre_id, snapshot_at desc)
  where genre_id is not null;

create index if not exists ranking_snapshots_item_idx
  on public.ranking_snapshots (item_type, item_id, snapshot_at desc);

create index if not exists ranking_snapshots_rank_idx
  on public.ranking_snapshots (ranking_type, time_window, rank_position);

create index if not exists ranking_snapshots_snapshot_at_idx
  on public.ranking_snapshots (snapshot_at desc);

alter table public.ranking_snapshots enable row level security;

create policy "Ranking snapshots readable by public"
  on public.ranking_snapshots for select
  to authenticated, anon
  using (true);

create policy "Ranking snapshots insertable by service"
  on public.ranking_snapshots for insert
  with check (true);

create policy "Ranking snapshots deletable by service"
  on public.ranking_snapshots for delete
  using (true);

insert into public.algorithm_settings (key, value, value_type, category, label, description, min_value, max_value, default_value)
values
  ('ranking.max_same_author_top_slots', '2'::jsonb, 'number', 'ranking', 'Tối đa slot tác giả / top ranking', 'Giới hạn cùng tác giả trong top 20 bảng chung', 1, 10, '2'::jsonb),
  ('ranking.snapshot_retention_days', '14'::jsonb, 'number', 'ranking', 'Giữ snapshot (ngày)', 'Xóa snapshot cũ hơn N ngày khi cron chạy', 3, 90, '14'::jsonb)
on conflict (key) do nothing;
