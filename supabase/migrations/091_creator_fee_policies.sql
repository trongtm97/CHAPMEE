-- Migration 091: Per-creator fee policy overrides (time-bound, snapshot at transaction time)

create table if not exists public.creator_fee_policies (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  policy_name text not null,
  creator_revenue_share_percent numeric(8, 4),
  platform_fee_percent numeric(8, 4),
  payment_processing_fee_percent numeric(8, 4),
  payment_processing_fixed_fee numeric(18, 2),
  tip_platform_fee_percent numeric(8, 4),
  min_withdraw_amount_override numeric(18, 2),
  allowed_price_steps_override numeric[] ,
  note text,
  public_note text,
  show_details_to_creator boolean not null default true,
  status text not null default 'active' check (
    status in ('draft', 'active', 'scheduled', 'expired', 'disabled')
  ),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_creator_fee_policies_creator_starts
  on public.creator_fee_policies(creator_id, starts_at desc);

create index if not exists idx_creator_fee_policies_active_lookup
  on public.creator_fee_policies(creator_id, status, starts_at)
  where status in ('active', 'scheduled');

create or replace function public.prevent_overlapping_creator_fee_policies()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('active', 'scheduled') then
    if exists (
      select 1
      from public.creator_fee_policies p
      where p.creator_id = new.creator_id
        and p.id is distinct from new.id
        and p.status in ('active', 'scheduled')
        and p.starts_at < coalesce(new.ends_at, 'infinity'::timestamptz)
        and new.starts_at < coalesce(p.ends_at, 'infinity'::timestamptz)
    ) then
      raise exception 'overlapping_creator_fee_policy'
        using errcode = 'P0001',
          message = 'Creator already has an overlapping active or scheduled fee policy.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_overlapping_creator_fee_policies on public.creator_fee_policies;
create trigger trg_prevent_overlapping_creator_fee_policies
  before insert or update on public.creator_fee_policies
  for each row execute function public.prevent_overlapping_creator_fee_policies();

create or replace function public.touch_creator_fee_policy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_creator_fee_policy_updated_at on public.creator_fee_policies;
create trigger trg_touch_creator_fee_policy_updated_at
  before update on public.creator_fee_policies
  for each row execute function public.touch_creator_fee_policy_updated_at();

alter table public.creator_fee_policies enable row level security;

drop policy if exists "Admins manage creator fee policies" on public.creator_fee_policies;
create policy "Admins manage creator fee policies"
  on public.creator_fee_policies
  for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators read own fee policies" on public.creator_fee_policies;
create policy "Creators read own fee policies"
  on public.creator_fee_policies
  for select
  using (auth.uid() = creator_id);
