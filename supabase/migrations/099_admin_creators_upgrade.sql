-- Migration 099: Admin creators hub — monetization status + admin overrides

alter table public.creator_monetization_profiles
  drop constraint if exists creator_monetization_profiles_status_check;

alter table public.creator_monetization_profiles
  add constraint creator_monetization_profiles_status_check check (
    status in (
      'not_eligible',
      'eligible',
      'pending_review',
      'approved',
      'rejected',
      'suspended',
      'permanently_disabled'
    )
  );

alter table public.creator_monetization_profiles
  add column if not exists admin_overrides jsonb not null default '{}'::jsonb;

comment on column public.creator_monetization_profiles.admin_overrides is
  'Admin-only overrides: payout_min_amount, internal_note, strategic_partner, bonus_pool_eligible, etc.';

create table if not exists public.creator_revenue_share_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  monetization_profile_id uuid references public.creator_monetization_profiles(id) on delete set null,
  enabled boolean not null default false,
  paid_chapter_percent numeric(5, 2),
  tip_percent numeric(5, 2),
  fan_club_percent numeric(5, 2),
  vip_pool_percent numeric(5, 2),
  bonus_pool_percent numeric(5, 2),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_revenue_share_history_user
  on public.creator_revenue_share_history(user_id, created_at desc);

alter table public.creator_revenue_share_history enable row level security;

drop policy if exists "Staff manage revenue share history" on public.creator_revenue_share_history;
create policy "Staff manage revenue share history"
  on public.creator_revenue_share_history for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));
