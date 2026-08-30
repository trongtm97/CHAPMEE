-- Migration 017: Revenue/supporter tables + ranking RPCs
-- Part 1: Revenue/supporter tables (empty schema for future use)
-- Part 2: Ranking RPCs (get_top_authors, get_app_top_fans)

-- =====================
-- Part 1: Revenue tables
-- =====================

create table if not exists public.creator_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.creator_profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  transaction_type text not null check (transaction_type in ('tip', 'unlock', 'vip_share', 'paid_story', 'bonus')),
  amount integer not null check (amount > 0),
  currency text not null default 'VND',
  platform_fee_amount integer,
  creator_net_amount integer,
  status text not null default 'completed' check (status in ('pending', 'completed', 'refunded', 'failed')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_transactions_author
  on public.creator_transactions(author_id, created_at desc);
create index if not exists idx_creator_transactions_user
  on public.creator_transactions(user_id, created_at desc);
create index if not exists idx_creator_transactions_status
  on public.creator_transactions(status);

create table if not exists public.creator_revenue_summaries (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.creator_profiles(id) on delete cascade,
  period_type text not null check (period_type in ('day', 'week', 'month', 'all_time')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  gross_revenue integer not null default 0,
  net_revenue integer not null default 0,
  supporter_count integer not null default 0,
  paid_reader_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_author_period unique (author_id, period_type, period_start)
);

create index if not exists idx_revenue_summaries_author
  on public.creator_revenue_summaries(author_id);

create table if not exists public.supporter_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid references public.creator_profiles(id) on delete set null,
  story_id uuid references public.stories(id) on delete set null,
  period_type text not null check (period_type in ('day', 'week', 'month', 'all_time')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_supported_amount integer not null default 0,
  support_count integer not null default 0,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_supporter_summaries_user
  on public.supporter_summaries(user_id);
create index if not exists idx_supporter_summaries_author
  on public.supporter_summaries(author_id);
create index if not exists idx_supporter_summaries_story
  on public.supporter_summaries(story_id);

alter table public.creator_transactions enable row level security;
alter table public.creator_revenue_summaries enable row level security;
alter table public.supporter_summaries enable row level security;

-- RLS: users can see their own transactions
create policy "Users can view own transactions"
  on public.creator_transactions for select
  using (auth.uid() = user_id);

-- RLS: authors can see their revenue summaries
create policy "Authors can view own revenue summaries"
  on public.creator_revenue_summaries for select
  using (exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = creator_revenue_summaries.author_id
    and creator_profiles.user_id = auth.uid()
  ));

-- RLS: users can see their supporter summaries
create policy "Users can view own supporter summaries"
  on public.supporter_summaries for select
  using (auth.uid() = user_id);

-- =====================
-- Part 2: Ranking RPCs
-- =====================

-- Top Authors RPC: ranks creators by total reads, followers, story count
create or replace function public.get_top_authors(
  window_start timestamptz default null,
  ranking_limit integer default 20
)
returns table (
  author_id uuid,
  user_id uuid,
  pen_name text,
  avatar_url text,
  follower_count bigint,
  total_reads bigint,
  story_count bigint,
  score bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with author_stories as (
    select
      cp.id as author_id,
      cp.user_id,
      cp.pen_name,
      p.avatar_url,
      s.id as story_id
    from public.creator_profiles cp
    join public.profiles p on p.id = cp.user_id
    join public.stories s on s.creator_id = cp.id
    where s.status in ('approved', 'published')
      and s.visibility = 'public'
  ),
  author_base as (
    select distinct on (author_id)
      author_id,
      user_id,
      pen_name,
      avatar_url
    from author_stories
    order by author_id, story_id
  ),
  story_engagement as (
    select
      as2.author_id,
      count(*) filter (where ae.event_name = 'open_story') as total_reads
    from public.analytics_events ae
    join author_stories as2
      on as2.story_id = ae.target_id
      and ae.target_type = 'story'
    where (window_start is null or ae.created_at >= window_start)
    group by as2.author_id
  ),
  author_follows as (
    select
      f.creator_id as author_id,
      count(*) as follower_count
    from public.follows f
    where f.creator_id is not null
    group by f.creator_id
  ),
  story_counts as (
    select
      as2.author_id,
      count(distinct as2.story_id) as story_count
    from author_stories as2
    group by as2.author_id
  )
  select
    ab.author_id,
    ab.user_id,
    ab.pen_name,
    ab.avatar_url,
    coalesce(af.follower_count, 0)::bigint as follower_count,
    coalesce(se.total_reads, 0)::bigint as total_reads,
    coalesce(sc.story_count, 0)::bigint as story_count,
    (
      coalesce(se.total_reads, 0) * 1 +
      coalesce(af.follower_count, 0) * 5 +
      coalesce(sc.story_count, 0) * 10
    )::bigint as score
  from author_base ab
  left join story_engagement se on se.author_id = ab.author_id
  left join author_follows af on af.author_id = ab.author_id
  left join story_counts sc on sc.author_id = ab.author_id
  order by score desc
  limit greatest(1, least(ranking_limit, 100));
$$;

grant execute on function public.get_top_authors(timestamptz, integer)
  to anon, authenticated;

-- App-wide Top Fans RPC: aggregates fan_scores across all scopes per user
create or replace function public.get_app_top_fans(
  ranking_limit integer default 20,
  input_user_id uuid default null
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  total_score bigint,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with aggregated as (
    select
      fs.user_id,
      sum(fs.score) as total_score
    from public.fan_scores fs
    where fs.score > 0
    group by fs.user_id
  ),
  ranked as (
    select
      a.user_id,
      a.total_score,
      row_number() over (order by a.total_score desc, a.user_id asc) as fan_rank
    from aggregated a
  )
  select
    ranked.fan_rank as rank,
    ranked.user_id,
    coalesce(p.display_name, p.username) as display_name,
    p.username,
    p.avatar_url,
    ranked.total_score,
    (input_user_id is not null and ranked.user_id = input_user_id) as is_current_user
  from ranked
  join public.profiles p on p.id = ranked.user_id
  order by ranked.fan_rank asc
  limit greatest(1, least(ranking_limit, 100));
$$;

grant execute on function public.get_app_top_fans(integer, uuid)
  to anon, authenticated;

-- Top Earning Authors RPC: placeholder for future revenue data
create or replace function public.get_top_earning_authors(
  window_start timestamptz default null,
  ranking_limit integer default 20
)
returns table (
  author_id uuid,
  user_id uuid,
  pen_name text,
  avatar_url text,
  gross_revenue bigint,
  supporter_count bigint,
  paid_reader_count bigint,
  revenue_growth numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.id as author_id,
    cp.user_id,
    cp.pen_name,
    p.avatar_url,
    0::bigint as gross_revenue,
    0::bigint as supporter_count,
    0::bigint as paid_reader_count,
    0::numeric as revenue_growth
  from public.creator_profiles cp
  join public.profiles p on p.id = cp.user_id
  where 1 = 0
  limit greatest(1, least(ranking_limit, 100));
$$;

grant execute on function public.get_top_earning_authors(timestamptz, integer)
  to anon, authenticated;

-- Top Supporters RPC: placeholder for future supporter data
create or replace function public.get_top_supporters(
  window_start timestamptz default null,
  ranking_limit integer default 20
)
returns table (
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  total_supported bigint,
  support_count bigint,
  is_anonymous boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(p.display_name, p.username) as display_name,
    p.username,
    p.avatar_url,
    0::bigint as total_supported,
    0::bigint as support_count,
    false as is_anonymous
  from public.profiles p
  where 1 = 0
  limit greatest(1, least(ranking_limit, 100));
$$;

grant execute on function public.get_top_supporters(timestamptz, integer)
  to anon, authenticated;
