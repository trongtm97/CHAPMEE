-- Migration 192: Monthly ad revenue reconciliation (partner-validated, not raw estimates)

create table if not exists public.ad_revenue_monthly_reconciliations (
  id uuid primary key default gen_random_uuid(),
  month text not null unique,
  gross_partner_revenue_vnd numeric not null default 0,
  invalid_traffic_adjustment_vnd numeric not null default 0,
  refund_adjustment_vnd numeric not null default 0,
  tax_fee_adjustment_vnd numeric not null default 0,
  other_adjustment_vnd numeric not null default 0,
  net_valid_revenue_vnd numeric not null default 0,
  creator_pool_percent numeric not null,
  creator_pool_vnd numeric not null default 0,
  reserve_percent numeric not null,
  reserve_hold_days int not null,
  reserve_vnd numeric not null default 0,
  distributable_vnd numeric not null default 0,
  status text not null default 'draft',
  notes text,
  locked_by uuid references public.profiles(id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_revenue_monthly_reconciliations_month_format check (month ~ '^\d{4}-\d{2}$'),
  constraint ad_revenue_monthly_reconciliations_status_check check (
    status in ('draft', 'locked', 'reconciled', 'cancelled')
  ),
  constraint ad_revenue_monthly_reconciliations_amounts_non_negative check (
    gross_partner_revenue_vnd >= 0
    and invalid_traffic_adjustment_vnd >= 0
    and refund_adjustment_vnd >= 0
    and tax_fee_adjustment_vnd >= 0
    and other_adjustment_vnd >= 0
  )
);

create index if not exists idx_ad_revenue_monthly_reconciliations_status
  on public.ad_revenue_monthly_reconciliations(status, month desc);

create table if not exists public.ad_revenue_creator_allocations (
  id uuid primary key default gen_random_uuid(),
  reconciliation_id uuid not null references public.ad_revenue_monthly_reconciliations(id) on delete cascade,
  month text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  contribution_impressions int not null default 0,
  contribution_reads int not null default 0,
  contribution_score numeric not null default 0,
  contribution_percent numeric not null default 0,
  gross_allocated_vnd numeric not null default 0,
  reserve_hold_vnd numeric not null default 0,
  payable_after_reserve_vnd numeric not null default 0,
  invalid_adjustment_vnd numeric not null default 0,
  final_payable_vnd numeric not null default 0,
  status text not null default 'estimate',
  hold_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_revenue_creator_allocations_month_format check (month ~ '^\d{4}-\d{2}$'),
  constraint ad_revenue_creator_allocations_status_check check (
    status in ('estimate', 'locked', 'payable', 'held', 'cancelled')
  ),
  unique (reconciliation_id, author_id)
);

create index if not exists idx_ad_revenue_creator_allocations_month
  on public.ad_revenue_creator_allocations(month, author_id);

create index if not exists idx_ad_revenue_creator_allocations_author
  on public.ad_revenue_creator_allocations(author_id, month desc);

create table if not exists public.ad_revenue_reconciliation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  reconciliation_id uuid references public.ad_revenue_monthly_reconciliations(id) on delete set null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_revenue_reconciliation_audit_created
  on public.ad_revenue_reconciliation_audit_logs(created_at desc);

create or replace function public.touch_ad_revenue_reconciliation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ad_revenue_monthly_reconciliations_updated_at
  on public.ad_revenue_monthly_reconciliations;
create trigger trg_ad_revenue_monthly_reconciliations_updated_at
before update on public.ad_revenue_monthly_reconciliations
for each row execute function public.touch_ad_revenue_reconciliation_updated_at();

drop trigger if exists trg_ad_revenue_creator_allocations_updated_at
  on public.ad_revenue_creator_allocations;
create trigger trg_ad_revenue_creator_allocations_updated_at
before update on public.ad_revenue_creator_allocations
for each row execute function public.touch_ad_revenue_reconciliation_updated_at();

alter table public.ad_revenue_monthly_reconciliations enable row level security;
alter table public.ad_revenue_creator_allocations enable row level security;
alter table public.ad_revenue_reconciliation_audit_logs enable row level security;

drop policy if exists "Admin founder manage ad revenue reconciliations"
  on public.ad_revenue_monthly_reconciliations;
create policy "Admin founder read ad revenue reconciliations"
  on public.ad_revenue_monthly_reconciliations for select
  using (public.is_admin_or_founder(auth.uid()));
create policy "Admin founder insert ad revenue reconciliations"
  on public.ad_revenue_monthly_reconciliations for insert
  with check (public.is_admin_or_founder(auth.uid()));
create policy "Admin founder update ad revenue reconciliations"
  on public.ad_revenue_monthly_reconciliations for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators read own locked ad allocations"
  on public.ad_revenue_creator_allocations;
create policy "Creators read own ad allocations when period locked"
  on public.ad_revenue_creator_allocations for select
  using (
    auth.uid() = author_id
    and exists (
      select 1
      from public.ad_revenue_monthly_reconciliations r
      where r.id = reconciliation_id
        and r.status in ('locked', 'reconciled')
    )
  );
create policy "Admin founder read all ad creator allocations"
  on public.ad_revenue_creator_allocations for select
  using (public.is_admin_or_founder(auth.uid()));
create policy "Admin founder manage ad creator allocations"
  on public.ad_revenue_creator_allocations for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder read reconciliation audit"
  on public.ad_revenue_reconciliation_audit_logs;
create policy "Admin founder read reconciliation audit"
  on public.ad_revenue_reconciliation_audit_logs for select
  using (public.is_admin_or_founder(auth.uid()));
