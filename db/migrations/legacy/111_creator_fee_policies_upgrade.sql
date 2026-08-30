-- Migration 111: Per-source revenue rates, extended status, audit fields

alter table public.creator_fee_policies
  add column if not exists source_rates jsonb,
  add column if not exists creator_type text,
  add column if not exists contract_ref text,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null,
  add column if not exists revoked_reason text;

-- Expand status enum: paused, revoked (keep disabled for legacy rows)
alter table public.creator_fee_policies
  drop constraint if exists creator_fee_policies_status_check;

alter table public.creator_fee_policies
  add constraint creator_fee_policies_status_check check (
    status in ('draft', 'active', 'scheduled', 'expired', 'disabled', 'paused', 'revoked')
  );

create index if not exists idx_creator_fee_policies_status
  on public.creator_fee_policies(status);

create index if not exists idx_creator_fee_policies_ends_at
  on public.creator_fee_policies(ends_at)
  where ends_at is not null and status in ('active', 'scheduled');

comment on column public.creator_fee_policies.source_rates is
  'Per-revenue-source author/platform percents. Keys: paid_chapter, tip, early_access, vip_subscription, fan_club_subscription, virtual_gift, rewarded_ads, sponsored_challenge';
