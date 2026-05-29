-- Migration 038: Fraud / Risk Engine MVP

create table if not exists public.risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  creator_user_id uuid references public.profiles(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  event_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  risk_score numeric(10, 2) not null default 0,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'ignored')),
  reason text not null,
  metadata jsonb default '{}'::jsonb,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_risk_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  risk_score numeric(10, 2) not null default 0,
  risk_level text not null default 'normal' check (risk_level in ('normal', 'watch', 'high', 'blocked')),
  payout_blocked boolean not null default false,
  monetization_blocked boolean not null default false,
  last_risk_event_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_risk_events_status_created
  on public.risk_events(status, created_at desc);
create index if not exists idx_risk_events_severity_created
  on public.risk_events(severity, created_at desc);
create index if not exists idx_risk_events_user_created
  on public.risk_events(user_id, created_at desc);
create index if not exists idx_risk_events_creator_created
  on public.risk_events(creator_user_id, created_at desc);

drop trigger if exists trg_touch_risk_events_updated_at on public.risk_events;
create trigger trg_touch_risk_events_updated_at
before update on public.risk_events
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_user_risk_profiles_updated_at on public.user_risk_profiles;
create trigger trg_touch_user_risk_profiles_updated_at
before update on public.user_risk_profiles
for each row
execute function public.touch_updated_at();

alter table public.risk_events enable row level security;
alter table public.user_risk_profiles enable row level security;

drop policy if exists "Admin reads risk events" on public.risk_events;
create policy "Admin reads risk events"
  on public.risk_events for select
  using (public.is_admin_or_founder(auth.uid()));

drop policy if exists "System inserts risk events" on public.risk_events;
create policy "System inserts risk events"
  on public.risk_events for insert
  with check (
    public.is_admin_or_founder(auth.uid())
    or auth.uid() = user_id
    or auth.uid() = creator_user_id
  );

drop policy if exists "Admin updates risk events" on public.risk_events;
create policy "Admin updates risk events"
  on public.risk_events for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin reads risk profiles" on public.user_risk_profiles;
create policy "Admin reads risk profiles"
  on public.user_risk_profiles for select
  using (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manages risk profiles" on public.user_risk_profiles;
create policy "Admin manages risk profiles"
  on public.user_risk_profiles for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));
