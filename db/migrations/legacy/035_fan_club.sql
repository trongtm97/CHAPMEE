-- Migration 035: Fan club plans and memberships

create table if not exists public.fan_club_plans (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  name text not null,
  description text,
  coin_price numeric(18, 2) not null,
  duration_days integer not null,
  benefits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fan_club_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  plan_id uuid not null references public.fan_club_plans(id) on delete restrict,
  status text not null check (status in ('active', 'expired', 'cancelled')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_fan_club_unique_active_creator_story
  on public.fan_club_memberships(user_id, creator_user_id, coalesce(story_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'active';

create index if not exists idx_fan_club_plans_creator on public.fan_club_plans(creator_user_id);
create index if not exists idx_fan_club_memberships_creator on public.fan_club_memberships(creator_user_id);

drop trigger if exists trg_touch_fan_club_plans_updated_at on public.fan_club_plans;
create trigger trg_touch_fan_club_plans_updated_at
before update on public.fan_club_plans
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_fan_club_memberships_updated_at on public.fan_club_memberships;
create trigger trg_touch_fan_club_memberships_updated_at
before update on public.fan_club_memberships
for each row execute function public.touch_updated_at();

alter table public.fan_club_plans enable row level security;
alter table public.fan_club_memberships enable row level security;

drop policy if exists "Creator manage own fan club plans" on public.fan_club_plans;
create policy "Creator manage own fan club plans"
  on public.fan_club_plans for all
  using (
    creator_user_id = auth.uid() or public.is_admin_or_founder(auth.uid())
  )
  with check (
    creator_user_id = auth.uid() or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Public read active fan club plans" on public.fan_club_plans;
create policy "Public read active fan club plans"
  on public.fan_club_plans for select
  using (is_active = true or creator_user_id = auth.uid() or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users read related memberships" on public.fan_club_memberships;
create policy "Users read related memberships"
  on public.fan_club_memberships for select
  using (
    user_id = auth.uid()
    or creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users insert own memberships" on public.fan_club_memberships;
create policy "Users insert own memberships"
  on public.fan_club_memberships for insert
  with check (user_id = auth.uid() or public.is_admin_or_founder(auth.uid()));

insert into public.monetization_settings (key, value, description, is_public)
values
  ('fan_club.min_coin_price', '10'::jsonb, 'Gia coin toi thieu fan club.', false),
  ('fan_club.max_coin_price', '1000'::jsonb, 'Gia coin toi da fan club.', false),
  ('fan_club.default_duration_days', '30'::jsonb, 'Thoi han mac dinh fan club.', false),
  ('fan_club.creator_percent', '70'::jsonb, 'Ty le chia doanh thu cho creator tu fan club.', false),
  ('fan_club.allow_story_specific_club', 'true'::jsonb, 'Cho phep tao fan club theo story.', false),
  ('fan_club.requires_creator_approval', 'true'::jsonb, 'Yeu cau creator duoc duyet monetization.', false)
on conflict (key) do nothing;
