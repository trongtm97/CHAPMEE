-- Taxonomy analytics: daily rollups, story-level metrics, creator contribution.

-- ---------------------------------------------------------------------------
-- taxonomy_daily_metrics
-- ---------------------------------------------------------------------------
create table if not exists public.taxonomy_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  term_id uuid not null references public.taxonomy_terms(id) on delete cascade,
  type text not null,
  surface text not null default 'all',
  impressions integer not null default 0,
  clicks integer not null default 0,
  ctr numeric not null default 0,
  story_starts integer not null default 0,
  chapter_completes integer not null default 0,
  completion_rate numeric not null default 0,
  saves integer not null default 0,
  purchases integer not null default 0,
  revenue_coin bigint not null default 0,
  reports_wrong_tag integer not null default 0,
  reports_missing_warning integer not null default 0,
  taxonomy_page_views integer not null default 0,
  unique_readers integer not null default 0,
  active_stories integer not null default 0,
  active_creators integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_daily_metrics_surface_check check (
    surface in (
      'all', 'reels', 'discover', 'search', 'catalog', 'taxonomy_page',
      'profile', 'community', 'ranking', 'other'
    )
  ),
  constraint taxonomy_daily_metrics_unique unique (date, term_id, surface)
);

create index if not exists taxonomy_daily_metrics_date_idx
  on public.taxonomy_daily_metrics (date desc);

create index if not exists taxonomy_daily_metrics_term_date_idx
  on public.taxonomy_daily_metrics (term_id, date desc);

create index if not exists taxonomy_daily_metrics_type_date_idx
  on public.taxonomy_daily_metrics (type, date desc);

create index if not exists taxonomy_daily_metrics_surface_date_idx
  on public.taxonomy_daily_metrics (surface, date desc);

-- ---------------------------------------------------------------------------
-- taxonomy_story_metrics
-- ---------------------------------------------------------------------------
create table if not exists public.taxonomy_story_metrics (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.taxonomy_terms(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  date date not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  starts integer not null default 0,
  completes integer not null default 0,
  saves integer not null default 0,
  purchases integer not null default 0,
  revenue_coin bigint not null default 0,
  reports integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_story_metrics_unique unique (date, term_id, story_id)
);

create index if not exists taxonomy_story_metrics_term_date_idx
  on public.taxonomy_story_metrics (term_id, date desc);

create index if not exists taxonomy_story_metrics_story_date_idx
  on public.taxonomy_story_metrics (story_id, date desc);

-- ---------------------------------------------------------------------------
-- taxonomy_creator_metrics
-- ---------------------------------------------------------------------------
create table if not exists public.taxonomy_creator_metrics (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  term_id uuid not null references public.taxonomy_terms(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  published_stories integer not null default 0,
  impressions integer not null default 0,
  starts integer not null default 0,
  completes integer not null default 0,
  saves integer not null default 0,
  purchases integer not null default 0,
  revenue_coin bigint not null default 0,
  reports integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_creator_metrics_unique unique (date, term_id, creator_id)
);

create index if not exists taxonomy_creator_metrics_term_date_idx
  on public.taxonomy_creator_metrics (term_id, date desc);

create index if not exists taxonomy_creator_metrics_creator_date_idx
  on public.taxonomy_creator_metrics (creator_id, date desc);

-- ---------------------------------------------------------------------------
-- RLS: staff read, service role write via admin client
-- ---------------------------------------------------------------------------
alter table public.taxonomy_daily_metrics enable row level security;
alter table public.taxonomy_story_metrics enable row level security;
alter table public.taxonomy_creator_metrics enable row level security;

create policy "Taxonomy daily metrics readable by staff"
  on public.taxonomy_daily_metrics for select
  using (public.current_profile_role() in ('admin', 'moderator'));

create policy "Taxonomy story metrics readable by staff"
  on public.taxonomy_story_metrics for select
  using (public.current_profile_role() in ('admin', 'moderator'));

create policy "Taxonomy creator metrics readable by staff"
  on public.taxonomy_creator_metrics for select
  using (public.current_profile_role() in ('admin', 'moderator'));

-- Analytics events index for taxonomy aggregation
create index if not exists analytics_events_taxonomy_page_view_idx
  on public.analytics_events (event_name, created_at desc)
  where event_name in (
    'taxonomy_page_view', 'story_impression', 'story_click', 'chapter_start',
    'chapter_complete', 'story_save', 'story_purchase', 'report_wrong_tag'
  );
