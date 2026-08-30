-- Fairness / ranking data foundation: exposure, actions, daily rollups, interest profiles.

-- ---------------------------------------------------------------------------
-- exposure_events
-- ---------------------------------------------------------------------------
create table if not exists public.exposure_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  surface text not null,
  item_type text not null,
  item_id uuid not null,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  reel_id uuid references public.reels_items(id) on delete set null,
  author_user_id uuid references public.profiles(id) on delete set null,
  position integer,
  session_id text,
  algorithm_version text,
  candidate_pool text,
  request_id text,
  device_type text,
  created_at timestamptz not null default now(),
  constraint exposure_events_surface_check check (
    surface in (
      'reels', 'discover', 'search', 'ranking', 'category', 'story_detail',
      'chapter_detail', 'profile', 'community', 'notification', 'other'
    )
  ),
  constraint exposure_events_item_type_check check (
    item_type in (
      'story', 'chapter', 'reel', 'author_profile', 'content_post',
      'announcement', 'community_post'
    )
  )
);

create index if not exists exposure_events_created_at_idx
  on public.exposure_events (created_at desc);

create index if not exists exposure_events_user_id_idx
  on public.exposure_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists exposure_events_surface_idx
  on public.exposure_events (surface, created_at desc);

create index if not exists exposure_events_item_type_id_idx
  on public.exposure_events (item_type, item_id, created_at desc);

create index if not exists exposure_events_story_id_idx
  on public.exposure_events (story_id, created_at desc)
  where story_id is not null;

create index if not exists exposure_events_author_user_id_idx
  on public.exposure_events (author_user_id, created_at desc)
  where author_user_id is not null;

create index if not exists exposure_events_candidate_pool_idx
  on public.exposure_events (candidate_pool, created_at desc)
  where candidate_pool is not null;

alter table public.exposure_events enable row level security;

create policy "Exposure events insertable by clients"
  on public.exposure_events for insert
  with check (true);

create policy "Exposure events readable by staff"
  on public.exposure_events for select
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- user_action_events
-- ---------------------------------------------------------------------------
create table if not exists public.user_action_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  surface text not null,
  action_type text not null,
  item_type text not null,
  item_id uuid not null,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  reel_id uuid references public.reels_items(id) on delete set null,
  author_user_id uuid references public.profiles(id) on delete set null,
  value_numeric numeric,
  value_text text,
  metadata jsonb not null default '{}'::jsonb,
  session_id text,
  algorithm_version text,
  created_at timestamptz not null default now(),
  constraint user_action_events_surface_check check (
    surface in (
      'reels', 'discover', 'search', 'ranking', 'category', 'story_detail',
      'chapter_detail', 'profile', 'community', 'notification', 'other'
    )
  ),
  constraint user_action_events_action_type_check check (
    action_type in (
      'impression', 'click', 'open_story', 'open_chapter', 'read_start',
      'read_progress', 'read_complete', 'next_chapter_click', 'like', 'unlike',
      'comment', 'save', 'unsave', 'follow_author', 'unfollow_author', 'hide',
      'report', 'share', 'unlock_paid', 'tip', 'purchase_bundle', 'scroll_pass',
      'dwell'
    )
  ),
  constraint user_action_events_item_type_check check (
    item_type in (
      'story', 'chapter', 'reel', 'author_profile', 'content_post',
      'announcement', 'community_post'
    )
  )
);

create index if not exists user_action_events_created_at_idx
  on public.user_action_events (created_at desc);

create index if not exists user_action_events_user_id_idx
  on public.user_action_events (user_id, created_at desc)
  where user_id is not null;

create index if not exists user_action_events_action_type_idx
  on public.user_action_events (action_type, created_at desc);

create index if not exists user_action_events_story_id_idx
  on public.user_action_events (story_id, created_at desc)
  where story_id is not null;

create index if not exists user_action_events_chapter_id_idx
  on public.user_action_events (chapter_id, created_at desc)
  where chapter_id is not null;

create index if not exists user_action_events_reel_id_idx
  on public.user_action_events (reel_id, created_at desc)
  where reel_id is not null;

create index if not exists user_action_events_author_user_id_idx
  on public.user_action_events (author_user_id, created_at desc)
  where author_user_id is not null;

alter table public.user_action_events enable row level security;

create policy "User action events insertable by clients"
  on public.user_action_events for insert
  with check (true);

create policy "User action events readable by staff"
  on public.user_action_events for select
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- story_metrics_daily
-- ---------------------------------------------------------------------------
create table if not exists public.story_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  story_id uuid not null references public.stories(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  impressions integer not null default 0,
  clicks integer not null default 0,
  story_opens integer not null default 0,
  chapter_starts integer not null default 0,
  chapter_completes integer not null default 0,
  next_chapter_clicks integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saves integer not null default 0,
  follows_generated integer not null default 0,
  hides integer not null default 0,
  reports integer not null default 0,
  paid_unlocks integer not null default 0,
  tips integer not null default 0,
  revenue_coin numeric not null default 0,
  avg_read_progress numeric not null default 0,
  completion_rate numeric not null default 0,
  next_chapter_rate numeric not null default 0,
  click_through_rate numeric not null default 0,
  save_rate numeric not null default 0,
  report_rate numeric not null default 0,
  hide_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_date, story_id)
);

create index if not exists story_metrics_daily_metric_date_idx
  on public.story_metrics_daily (metric_date desc);

create index if not exists story_metrics_daily_author_user_id_idx
  on public.story_metrics_daily (author_user_id, metric_date desc);

alter table public.story_metrics_daily enable row level security;

create policy "Story metrics daily readable by staff"
  on public.story_metrics_daily for select
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- reel_metrics_daily
-- ---------------------------------------------------------------------------
create table if not exists public.reel_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  reel_id uuid not null references public.reels_items(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  impressions integer not null default 0,
  opens integer not null default 0,
  read_more_clicks integer not null default 0,
  story_opens integer not null default 0,
  chapter_starts integer not null default 0,
  chapter_completes_after_reel integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saves integer not null default 0,
  follows_generated integer not null default 0,
  hides integer not null default 0,
  reports integer not null default 0,
  reels_to_read_rate numeric not null default 0,
  completion_after_reel_rate numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_date, reel_id)
);

create index if not exists reel_metrics_daily_metric_date_idx
  on public.reel_metrics_daily (metric_date desc);

alter table public.reel_metrics_daily enable row level security;

create policy "Reel metrics daily readable by staff"
  on public.reel_metrics_daily for select
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- author_metrics_daily
-- ---------------------------------------------------------------------------
create table if not exists public.author_metrics_daily (
  id uuid primary key default gen_random_uuid(),
  metric_date date not null,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  impressions integer not null default 0,
  story_opens integer not null default 0,
  chapter_completes integer not null default 0,
  follows_gained integer not null default 0,
  total_active_stories integer not null default 0,
  published_stories_count integer not null default 0,
  published_chapters_count integer not null default 0,
  reports integer not null default 0,
  hides integer not null default 0,
  revenue_coin numeric not null default 0,
  new_reader_count integer not null default 0,
  returning_reader_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_date, author_user_id)
);

create index if not exists author_metrics_daily_metric_date_idx
  on public.author_metrics_daily (metric_date desc);

alter table public.author_metrics_daily enable row level security;

create policy "Author metrics daily readable by staff"
  on public.author_metrics_daily for select
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- user_interest_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.user_interest_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_genres jsonb not null default '{}'::jsonb,
  preferred_tags jsonb not null default '{}'::jsonb,
  preferred_authors jsonb not null default '{}'::jsonb,
  preferred_story_lengths jsonb not null default '{}'::jsonb,
  preferred_content_types jsonb not null default '{}'::jsonb,
  negative_genres jsonb not null default '{}'::jsonb,
  negative_tags jsonb not null default '{}'::jsonb,
  hidden_authors jsonb not null default '{}'::jsonb,
  last_updated_at timestamptz not null default now()
);

alter table public.user_interest_profiles enable row level security;

create policy "Users read own interest profile"
  on public.user_interest_profiles for select
  using (auth.uid() = user_id);

create policy "Users upsert own interest profile"
  on public.user_interest_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users update own interest profile"
  on public.user_interest_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Staff read interest profiles"
  on public.user_interest_profiles for select
  using (public.current_profile_role() in ('admin', 'moderator'));

-- ---------------------------------------------------------------------------
-- algorithm_event_logs
-- ---------------------------------------------------------------------------
create table if not exists public.algorithm_event_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  surface text not null,
  algorithm_version text not null,
  candidate_counts jsonb not null default '{}'::jsonb,
  final_item_ids uuid[] not null default '{}'::uuid[],
  debug_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint algorithm_event_logs_surface_check check (
    surface in (
      'reels', 'discover', 'search', 'ranking', 'category', 'story_detail',
      'chapter_detail', 'profile', 'community', 'notification', 'other'
    )
  )
);

create index if not exists algorithm_event_logs_created_at_idx
  on public.algorithm_event_logs (created_at desc);

create index if not exists algorithm_event_logs_request_id_idx
  on public.algorithm_event_logs (request_id);

alter table public.algorithm_event_logs enable row level security;

create policy "Algorithm logs readable by staff"
  on public.algorithm_event_logs for select
  using (public.current_profile_role() in ('admin', 'moderator'));
