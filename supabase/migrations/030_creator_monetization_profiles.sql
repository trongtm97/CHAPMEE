-- Migration 030: Creator monetization eligibility and review profiles

create table if not exists public.creator_monetization_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'not_eligible' check (
    status in (
      'not_eligible',
      'eligible',
      'pending_review',
      'approved',
      'rejected',
      'suspended'
    )
  ),
  monetization_enabled boolean not null default false,
  terms_accepted_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_reason text,
  suspended_reason text,
  kyc_status text not null default 'not_started' check (
    kyc_status in ('not_started', 'pending', 'verified', 'rejected')
  ),
  payout_enabled boolean not null default false,
  custom_revenue_share jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creator_monetization_profiles_status
  on public.creator_monetization_profiles(status);

drop trigger if exists trg_touch_creator_monetization_profiles_updated_at on public.creator_monetization_profiles;
create trigger trg_touch_creator_monetization_profiles_updated_at
before update on public.creator_monetization_profiles
for each row execute function public.touch_updated_at();

alter table public.creator_monetization_profiles enable row level security;

drop policy if exists "Creator read own monetization profile" on public.creator_monetization_profiles;
create policy "Creator read own monetization profile"
  on public.creator_monetization_profiles for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator create own monetization profile" on public.creator_monetization_profiles;
create policy "Creator create own monetization profile"
  on public.creator_monetization_profiles for insert
  with check (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator update own limited monetization profile" on public.creator_monetization_profiles;
create policy "Creator update own limited monetization profile"
  on public.creator_monetization_profiles for update
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));
