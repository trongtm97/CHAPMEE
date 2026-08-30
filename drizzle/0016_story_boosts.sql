-- Story boost (đề cử) + reward points + engagement settings.

create table if not exists public.user_reward_points (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.engagement_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.engagement_settings (key, value)
values
  ('boost.enabled', 'false'::jsonb),
  ('boost.currency', '"reward_points"'::jsonb),
  ('boost.points_per_unit', '10'::jsonb),
  ('boost.boost_points_per_unit', '10'::jsonb),
  ('boost.user_daily_cap', '100'::jsonb),
  ('boost.story_daily_cap', '500'::jsonb),
  ('boost.min_story_age_hours', '24'::jsonb),
  ('boost.decay_half_life_days', '7'::jsonb),
  ('boost.organic_blend_max', '0'::jsonb),
  ('boost.diminishing_same_story', '0.5'::jsonb)
on conflict (key) do nothing;

create table if not exists public.story_boosts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  transaction_id uuid,
  currency text not null default 'reward_points',
  amount_spent int not null check (amount_spent > 0),
  boost_points int not null check (boost_points > 0),
  decay_group date not null default current_date,
  engagement_source text not null default 'user',
  is_counted_in_ranking boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint story_boosts_currency check (currency in ('reward_points', 'coin')),
  constraint story_boosts_engagement_source check (
    engagement_source in ('user', 'system', 'admin_seed', 'test')
  )
);

create index if not exists story_boosts_story_created_idx
  on public.story_boosts (story_id, created_at desc);

create index if not exists story_boosts_user_day_idx
  on public.story_boosts (user_id, decay_group);

create table if not exists public.story_boost_daily_stats (
  story_id uuid not null references public.stories(id) on delete cascade,
  stat_date date not null,
  total_boost_points numeric(12, 2) not null default 0,
  unique_boosters int not null default 0,
  decayed_score numeric(12, 4) not null default 0,
  primary key (story_id, stat_date)
);

comment on table public.story_boosts is
  'User-initiated story boosts (đề cử) — separate from organic ranking.';

comment on table public.story_boost_daily_stats is
  'Daily boost aggregates for decayed boosted_stories board.';
