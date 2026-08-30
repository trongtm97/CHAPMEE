-- Cold start tests: initial impression quota for new stories, reels, and authors.

create table if not exists public.cold_start_tests (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,
  item_id uuid not null,
  story_id uuid references public.stories(id) on delete set null,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  target_impressions integer not null,
  delivered_impressions integer not null default 0,
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  qualified_at timestamptz,
  failed_at timestamptz,
  qualification_metrics jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cold_start_tests_item_type_check check (
    item_type in ('story', 'reel', 'author')
  ),
  constraint cold_start_tests_status_check check (
    status in ('active', 'qualified', 'failed', 'completed', 'paused')
  ),
  constraint cold_start_tests_target_impressions_check check (target_impressions > 0),
  constraint cold_start_tests_delivered_impressions_check check (delivered_impressions >= 0)
);

create unique index if not exists cold_start_tests_active_item_uidx
  on public.cold_start_tests (item_type, item_id)
  where status in ('active', 'paused');

create index if not exists cold_start_tests_status_idx
  on public.cold_start_tests (status, started_at desc);

create index if not exists cold_start_tests_author_user_id_idx
  on public.cold_start_tests (author_user_id, created_at desc);

create index if not exists cold_start_tests_item_idx
  on public.cold_start_tests (item_type, item_id, created_at desc);

alter table public.cold_start_tests enable row level security;

create policy "Cold start tests readable by staff"
  on public.cold_start_tests for select
  using (public.current_profile_role() in ('admin', 'moderator'));

create policy "Cold start tests insertable by service"
  on public.cold_start_tests for insert
  with check (true);

create policy "Cold start tests updatable by service"
  on public.cold_start_tests for update
  using (true);

insert into public.algorithm_settings (key, value, value_type, category, label, description, min_value, max_value, default_value)
values
  ('cold_start.min_impressions_before_eval', '50'::jsonb, 'number', 'cold_start', 'Impression tối thiểu trước khi đánh giá', 'Số impression tối thiểu trước qualify/fail', 10, 5000, '50'::jsonb),
  ('cold_start.max_tests_per_author_per_day', '8'::jsonb, 'number', 'cold_start', 'Tối đa test / tác giả / ngày', 'Chống spam cold start', 1, 50, '8'::jsonb),
  ('cold_start.completion_rate_qualify_threshold', '0.35'::jsonb, 'number', 'cold_start', 'Ngưỡng completion qualify', null, 0, 1, '0.35'::jsonb),
  ('cold_start.next_chapter_rate_qualify_threshold', '0.25'::jsonb, 'number', 'cold_start', 'Ngưỡng đọc tiếp qualify', null, 0, 1, '0.25'::jsonb),
  ('cold_start.discover_pool_weight', '0.12'::jsonb, 'number', 'cold_start', 'Trọng số pool cold start (Discover)', null, 0, 1, '0.12'::jsonb),
  ('cold_start.reels_pool_weight', '0.15'::jsonb, 'number', 'cold_start', 'Trọng số pool cold start (Reels)', null, 0, 1, '0.15'::jsonb)
on conflict (key) do nothing;
