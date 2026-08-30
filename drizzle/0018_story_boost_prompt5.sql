-- PROMPT 5: reward ledger, lifetime totals, boost message/status, admin toggles.

alter table public.user_reward_points
  add column if not exists lifetime_earned int not null default 0,
  add column if not exists lifetime_spent int not null default 0;

create table if not exists public.reward_point_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check (amount > 0),
  direction text not null check (direction in ('earn', 'spend', 'adjust')),
  reason text not null check (
    reason in (
      'daily_login',
      'reading',
      'comment',
      'review',
      'story_boost',
      'admin_adjust',
      'other'
    )
  ),
  related_entity_type text,
  related_entity_id uuid,
  created_by_admin_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists reward_point_ledger_profile_created_idx
  on public.reward_point_ledger (profile_id, created_at desc);

alter table public.story_boosts
  add column if not exists message text,
  add column if not exists status text not null default 'completed',
  add column if not exists ledger_entry_id uuid references public.reward_point_ledger(id) on delete set null;

alter table public.story_boosts
  drop constraint if exists story_boosts_status_check;

alter table public.story_boosts
  add constraint story_boosts_status_check
  check (status in ('pending', 'completed', 'cancelled', 'refunded'));

alter table public.story_boost_daily_stats
  add column if not exists boost_count int not null default 0;

insert into public.engagement_settings (key, value)
values
  ('boost.reward_point_boost_enabled', 'true'::jsonb),
  ('boost.coin_boost_enabled', 'false'::jsonb),
  ('boost.min_boost_points', '10'::jsonb),
  ('boost.ranking_weight', '1'::jsonb),
  ('boost.allow_creator_self_boost', 'false'::jsonb),
  ('boost.show_public_messages', 'true'::jsonb),
  ('boost.anti_whale_cap_enabled', 'true'::jsonb)
on conflict (key) do nothing;

comment on table public.reward_point_ledger is
  'Immutable reward point movements — source of truth alongside user_reward_points.balance.';
