-- Fair Distribution System: recommendation logs, score snapshots, taxonomy/author exposure rollups, settings.

-- ---------------------------------------------------------------------------
-- recommendation_exposure_logs — admin explainability with score breakdown
-- ---------------------------------------------------------------------------
create table if not exists public.recommendation_exposure_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  surface text not null,
  taxonomy_term_ids jsonb not null default '[]'::jsonb,
  position integer,
  score numeric,
  reason_json jsonb not null default '{}'::jsonb,
  request_id text,
  simulation boolean not null default false,
  shown_at timestamptz not null default now(),
  constraint recommendation_exposure_logs_surface_check check (
    surface in ('reels', 'discover', 'search', 'catalog', 'taxonomy_page', 'ranking')
  )
);

create index if not exists recommendation_exposure_logs_story_shown_idx
  on public.recommendation_exposure_logs (story_id, shown_at desc);

create index if not exists recommendation_exposure_logs_author_shown_idx
  on public.recommendation_exposure_logs (author_id, shown_at desc)
  where author_id is not null;

create index if not exists recommendation_exposure_logs_surface_shown_idx
  on public.recommendation_exposure_logs (surface, shown_at desc);

create index if not exists recommendation_exposure_logs_request_idx
  on public.recommendation_exposure_logs (request_id)
  where request_id is not null;

alter table public.recommendation_exposure_logs enable row level security;

create policy "Recommendation exposure logs readable by staff"
  on public.recommendation_exposure_logs for select
  to authenticated
  using (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.current_profile_role() in ('admin', 'moderator')
  );

create policy "Recommendation exposure logs insertable by staff"
  on public.recommendation_exposure_logs for insert
  to authenticated
  with check (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
    or public.current_profile_role() in ('admin', 'moderator')
  );

-- Service role / anon insert for runtime logging (same as exposure_events)
create policy "Recommendation exposure logs insert for runtime"
  on public.recommendation_exposure_logs for insert
  with check (true);

-- ---------------------------------------------------------------------------
-- recommendation_score_snapshots — per-surface FDS score breakdown
-- ---------------------------------------------------------------------------
create table if not exists public.recommendation_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  surface text not null,
  score numeric not null default 0,
  score_details jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  constraint recommendation_score_snapshots_surface_check check (
    surface in ('reels', 'discover', 'search', 'catalog', 'taxonomy_page', 'ranking')
  )
);

create index if not exists recommendation_score_snapshots_story_surface_idx
  on public.recommendation_score_snapshots (story_id, surface, calculated_at desc);

create index if not exists recommendation_score_snapshots_surface_score_idx
  on public.recommendation_score_snapshots (surface, score desc, calculated_at desc);

alter table public.recommendation_score_snapshots enable row level security;

create policy "Recommendation score snapshots readable"
  on public.recommendation_score_snapshots for select
  to authenticated, anon
  using (true);

create policy "Recommendation score snapshots insert staff"
  on public.recommendation_score_snapshots for insert
  to authenticated
  with check (
    public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
    or public.current_profile_role() in ('admin', 'moderator')
  );

-- ---------------------------------------------------------------------------
-- taxonomy_exposure_daily
-- ---------------------------------------------------------------------------
create table if not exists public.taxonomy_exposure_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  term_id uuid not null references public.taxonomy_terms(id) on delete cascade,
  surface text not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  ctr numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_exposure_daily_surface_check check (
    surface in ('reels', 'discover', 'search', 'catalog', 'taxonomy_page', 'ranking', 'all')
  ),
  constraint taxonomy_exposure_daily_unique unique (date, term_id, surface)
);

create index if not exists taxonomy_exposure_daily_date_surface_idx
  on public.taxonomy_exposure_daily (date desc, surface);

create trigger taxonomy_exposure_daily_set_updated_at
before update on public.taxonomy_exposure_daily
for each row execute function public.set_updated_at();

alter table public.taxonomy_exposure_daily enable row level security;

create policy "Taxonomy exposure daily readable by staff"
  on public.taxonomy_exposure_daily for select
  to authenticated
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- author_exposure_daily
-- ---------------------------------------------------------------------------
create table if not exists public.author_exposure_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  surface text not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint author_exposure_daily_surface_check check (
    surface in ('reels', 'discover', 'search', 'catalog', 'taxonomy_page', 'ranking', 'all')
  ),
  constraint author_exposure_daily_unique unique (date, author_id, surface)
);

create index if not exists author_exposure_daily_date_surface_idx
  on public.author_exposure_daily (date desc, surface);

create trigger author_exposure_daily_set_updated_at
before update on public.author_exposure_daily
for each row execute function public.set_updated_at();

alter table public.author_exposure_daily enable row level security;

create policy "Author exposure daily readable by staff"
  on public.author_exposure_daily for select
  to authenticated
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- Fair distribution algorithm settings (admin-configurable, no hard-coded thresholds)
-- ---------------------------------------------------------------------------
insert into public.algorithm_settings (key, value, value_type, category, label, description, min_value, max_value, default_value)
values
  ('fds.weight.quality', '0.25'::jsonb, 'number', 'fairness', 'FDS — Trọng số chất lượng', 'Trọng số quality_score trong công thức phân phối công bằng.', 0, 1, '0.25'::jsonb),
  ('fds.weight.freshness', '0.15'::jsonb, 'number', 'fairness', 'FDS — Trọng số độ mới', null, 0, 1, '0.15'::jsonb),
  ('fds.weight.engagement', '0.20'::jsonb, 'number', 'fairness', 'FDS — Trọng số tương tác', 'Clicks, reads, saves, follows.', 0, 1, '0.20'::jsonb),
  ('fds.weight.cold_start', '0.15'::jsonb, 'number', 'fairness', 'FDS — Trọng số cold start', 'Boost truyện/tác giả mới.', 0, 1, '0.15'::jsonb),
  ('fds.weight.diversity', '0.10'::jsonb, 'number', 'fairness', 'FDS — Trọng số đa dạng', 'Không lặp author/taxonomy/story.', 0, 1, '0.10'::jsonb),
  ('fds.weight.taxonomy_fairness', '0.10'::jsonb, 'number', 'fairness', 'FDS — Trọng số công bằng taxonomy', 'Cân bằng thể loại lớn/nhỏ.', 0, 1, '0.10'::jsonb),
  ('fds.weight.penalty', '0.05'::jsonb, 'number', 'fairness', 'FDS — Trọng số phạt', 'Report, quality flag, refund.', 0, 1, '0.05'::jsonb),

  ('fairness.max_main_genre_share_percent_in_feed', '35'::jsonb, 'percentage', 'fairness', 'Tối đa % main genre / feed batch', 'Không để một thể loại chiếm toàn feed.', 10, 80, '35'::jsonb),
  ('fairness.min_cold_taxonomy_share_percent', '8'::jsonb, 'percentage', 'fairness', 'Tối thiểu % taxonomy ít exposure', 'Quota tối thiểu cho thể loại under-exposed.', 0, 50, '8'::jsonb),
  ('fairness.boost_underexposed_taxonomy', '0.18'::jsonb, 'number', 'fairness', 'Boost taxonomy under-exposed', 'Cộng điểm khi thể loại ít được hiển thị.', 0, 1, '0.18'::jsonb),
  ('fairness.max_items_per_author_per_page', '2'::jsonb, 'number', 'fairness', 'Tối đa item / tác giả / trang', null, 1, 20, '2'::jsonb),
  ('fairness.max_author_share_per_feed_percent', '25'::jsonb, 'percentage', 'fairness', 'Tối đa % tác giả / feed batch', null, 5, 60, '25'::jsonb),
  ('fairness.reduce_score_if_author_overexposed', '0.25'::jsonb, 'number', 'fairness', 'Giảm điểm khi tác giả over-exposed', null, 0, 1, '0.25'::jsonb),
  ('fairness.max_repeats_per_story_in_reels', '3'::jsonb, 'number', 'fairness', 'Tối đa lặp truyện / cửa sổ Reels', null, 1, 10, '3'::jsonb),

  ('cold_start.new_story_boost_hours', '72'::jsonb, 'number', 'cold_start', 'Giờ boost truyện mới', 'Thời gian ưu tiên cold start sau publish.', 1, 336, '72'::jsonb),
  ('cold_start.new_author_boost_days', '30'::jsonb, 'number', 'cold_start', 'Ngày boost tác giả mới', null, 1, 180, '30'::jsonb),
  ('cold_start.max_boost_until_impressions', '800'::jsonb, 'number', 'cold_start', 'Dừng boost sau N impressions', null, 50, 50000, '800'::jsonb),

  ('quality.hide_low_quality_from_recommendation', 'true'::jsonb, 'boolean', 'safety', 'Ẩn low quality khỏi đề xuất', 'Loại truyện quality_status xấu khỏi candidate pool.', null, null, 'true'::jsonb),
  ('quality.demote_unresolved_taxonomy_flags', 'true'::jsonb, 'boolean', 'safety', 'Giảm điểm taxonomy flag chưa xử lý', 'Demote khi có content_taxonomy_quality_flags open.', null, null, 'true'::jsonb),
  ('quality.exclude_severe_taxonomy_flags', 'false'::jsonb, 'boolean', 'safety', 'Loại trừ flag taxonomy nghiêm trọng', 'Exclude nếu severity critical và flag open.', null, null, 'false'::jsonb),
  ('quality.demote_high_report_rate', 'true'::jsonb, 'boolean', 'safety', 'Giảm điểm report rate cao', null, null, null, 'true'::jsonb),
  ('quality.taxonomy_flag_demote_penalty', '0.25'::jsonb, 'number', 'safety', 'Hệ số phạt taxonomy flag', null, 0, 1, '0.25'::jsonb),
  ('quality.presentation_mode_min_share_percent', '5'::jsonb, 'percentage', 'fairness', 'Quota tối thiểu presentation_mode', 'Ví dụ chat_story, case_file không bị chìm hoàn toàn.', 0, 30, '5'::jsonb)
on conflict (key) do nothing;
