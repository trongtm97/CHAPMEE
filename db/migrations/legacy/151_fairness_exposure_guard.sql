-- Exposure distribution snapshots + fairness adjustment audit logs.

create table if not exists public.exposure_distribution_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  surface text not null,
  total_impressions integer not null default 0,
  top_1_percent_author_impression_share numeric not null default 0,
  top_5_percent_author_impression_share numeric not null default 0,
  top_10_percent_author_impression_share numeric not null default 0,
  top_1_percent_story_impression_share numeric not null default 0,
  top_10_percent_story_impression_share numeric not null default 0,
  gini_author_exposure numeric,
  gini_story_exposure numeric,
  new_author_impression_share numeric not null default 0,
  under_exposed_impression_share numeric not null default 0,
  long_tail_impression_share numeric not null default 0,
  warning_level text not null default 'ok',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint exposure_distribution_snapshots_surface_check check (
    surface in (
      'reels', 'discover', 'search', 'ranking', 'category', 'story_detail',
      'chapter_detail', 'profile', 'community', 'notification', 'other'
    )
  ),
  constraint exposure_distribution_snapshots_warning_level_check check (
    warning_level in ('ok', 'warn', 'critical')
  ),
  unique (snapshot_date, surface)
);

create index if not exists exposure_distribution_snapshots_date_surface_idx
  on public.exposure_distribution_snapshots (snapshot_date desc, surface);

alter table public.exposure_distribution_snapshots enable row level security;

create policy "Exposure distribution snapshots readable by staff"
  on public.exposure_distribution_snapshots for select
  using (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.current_profile_role() in ('admin', 'moderator')
  );

create policy "Exposure distribution snapshots insertable by service"
  on public.exposure_distribution_snapshots for insert
  with check (true);

create policy "Exposure distribution snapshots updatable by service"
  on public.exposure_distribution_snapshots for update
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------

create table if not exists public.fairness_adjustment_logs (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,
  item_id uuid not null,
  story_id uuid references public.stories(id) on delete set null,
  author_user_id uuid references public.profiles(id) on delete set null,
  surface text not null,
  adjustment_type text not null,
  old_score numeric not null,
  new_score numeric not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fairness_adjustment_logs_surface_check check (
    surface in (
      'reels', 'discover', 'search', 'ranking', 'category', 'story_detail',
      'chapter_detail', 'profile', 'community', 'notification', 'other'
    )
  ),
  constraint fairness_adjustment_logs_adjustment_type_check check (
    adjustment_type in (
      'author_cap_penalty',
      'story_cap_penalty',
      'under_exposed_boost',
      'long_tail_boost',
      'new_author_boost',
      'safety_penalty'
    )
  )
);

create index if not exists fairness_adjustment_logs_created_at_idx
  on public.fairness_adjustment_logs (created_at desc);

create index if not exists fairness_adjustment_logs_surface_idx
  on public.fairness_adjustment_logs (surface, created_at desc);

create index if not exists fairness_adjustment_logs_author_idx
  on public.fairness_adjustment_logs (author_user_id, created_at desc)
  where author_user_id is not null;

alter table public.fairness_adjustment_logs enable row level security;

create policy "Fairness adjustment logs readable by staff"
  on public.fairness_adjustment_logs for select
  using (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.current_profile_role() in ('admin', 'moderator')
  );

create policy "Fairness adjustment logs insertable by service"
  on public.fairness_adjustment_logs for insert
  with check (true);

-- Alert thresholds (admin-tunable)
insert into public.algorithm_settings (key, value, value_type, category, label, description, min_value, max_value, default_value)
values
  ('fairness.alert_top1_author_percent', '50'::jsonb, 'number', 'fairness', 'Cảnh báo: Top 1% tác giả (%)', 'Ngưỡng cảnh báo tập trung impression tác giả', 1, 100, '50'::jsonb),
  ('fairness.alert_top10_story_percent', '70'::jsonb, 'number', 'fairness', 'Cảnh báo: Top 10% truyện (%)', 'Ngưỡng cảnh báo tập trung impression truyện', 1, 100, '70'::jsonb),
  ('fairness.alert_min_new_author_impression_percent', '5'::jsonb, 'number', 'fairness', 'Cảnh báo: New author exposure tối thiểu (%)', 'Dưới ngưỡng → cảnh báo thiếu slot thử nghiệm tác giả mới', 0, 50, '5'::jsonb),
  ('fairness.alert_min_long_tail_impression_percent', '8'::jsonb, 'number', 'fairness', 'Cảnh báo: Long-tail exposure tối thiểu (%)', 'Dưới ngưỡng → cảnh báo thiếu traffic long-tail', 0, 50, '8'::jsonb),
  ('fairness.min_new_author_slots_percent', '8'::jsonb, 'number', 'fairness', '% slot tối thiểu tác giả mới / feed', 'Quota discovery trong feed response', 0, 40, '8'::jsonb),
  ('fairness.min_under_exposed_slots_percent', '10'::jsonb, 'number', 'fairness', '% slot tối thiểu under-exposed / feed', 'Quota discovery trong feed response', 0, 40, '10'::jsonb),
  ('fairness.max_author_share_per_feed_percent', '25'::jsonb, 'number', 'fairness', '% tối đa một tác giả trong một feed', 'Giới hạn concentration trong một response', 5, 60, '25'::jsonb)
on conflict (key) do nothing;
