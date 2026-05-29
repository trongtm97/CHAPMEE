-- Migration 056: Finance/coin hardening — permission-only finance staff, wallet RPC, payout RLS

-- ---------------------------------------------------------------------------
-- Finance helpers (no legacy admin/founder blanket access)
-- ---------------------------------------------------------------------------
create or replace function public.is_finance_staff(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.user_has_permission(input_user_id, 'finance.dashboard.view')
    or public.user_has_permission(input_user_id, 'finance.wallet.adjust')
    or public.user_has_permission(input_user_id, 'finance.refund.create')
    or public.user_has_permission(input_user_id, 'finance.payout.view')
    or public.user_has_permission(input_user_id, 'finance.payout.approve')
    or public.user_has_permission(input_user_id, 'finance.payout.reject')
    or public.user_has_permission(input_user_id, 'wallet.transaction.view.all')
    or public.user_has_role(input_user_id, 'owner');
$$;

create or replace function public.can_view_creator_wallet(input_user_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    input_user_id = target_user_id
    or public.user_has_permission(input_user_id, 'finance.payout.view')
    or public.user_has_permission(input_user_id, 'wallet.transaction.view.all')
    or public.user_has_role(input_user_id, 'owner');
$$;

-- ---------------------------------------------------------------------------
-- Creator wallet shifts only via RPC (no direct client UPDATE)
-- ---------------------------------------------------------------------------
create or replace function public.shift_creator_wallet_balances(
  input_creator_user_id uuid,
  input_from text,
  input_to text,
  input_amount_vnd numeric,
  input_increase_withdrawn boolean default false
)
returns public.creator_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.creator_wallets;
  amount numeric(18, 2) := round(coalesce(input_amount_vnd, 0), 2);
  current_from numeric(18, 2);
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  if amount <= 0 then
    raise exception 'amount_vnd must be > 0';
  end if;

  if input_creator_user_id is distinct from auth.uid()
     and not public.is_finance_staff(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  perform public.ensure_creator_wallet(input_creator_user_id);

  select * into wallet_row
  from public.creator_wallets
  where user_id = input_creator_user_id
  for update;

  current_from := case input_from
    when 'available' then wallet_row.available_revenue_vnd
    when 'locked' then wallet_row.locked_revenue_vnd
    when 'pending' then wallet_row.pending_revenue_vnd
    else 0
  end;

  if current_from < amount then
    raise exception 'Insufficient % revenue', input_from;
  end if;

  if input_from = 'available' then
    wallet_row.available_revenue_vnd := wallet_row.available_revenue_vnd - amount;
  elsif input_from = 'locked' then
    wallet_row.locked_revenue_vnd := wallet_row.locked_revenue_vnd - amount;
  elsif input_from = 'pending' then
    wallet_row.pending_revenue_vnd := wallet_row.pending_revenue_vnd - amount;
  end if;

  if input_to = 'available' then
    wallet_row.available_revenue_vnd := wallet_row.available_revenue_vnd + amount;
  elsif input_to = 'locked' then
    wallet_row.locked_revenue_vnd := wallet_row.locked_revenue_vnd + amount;
  elsif input_to = 'pending' then
    wallet_row.pending_revenue_vnd := wallet_row.pending_revenue_vnd + amount;
  end if;

  if input_increase_withdrawn then
    wallet_row.total_withdrawn_vnd := wallet_row.total_withdrawn_vnd + amount;
  end if;

  update public.creator_wallets
  set
    available_revenue_vnd = wallet_row.available_revenue_vnd,
    locked_revenue_vnd = wallet_row.locked_revenue_vnd,
    pending_revenue_vnd = wallet_row.pending_revenue_vnd,
    total_withdrawn_vnd = wallet_row.total_withdrawn_vnd,
    updated_at = now()
  where user_id = input_creator_user_id
  returning * into wallet_row;

  return wallet_row;
end;
$$;

grant execute on function public.shift_creator_wallet_balances(uuid, text, text, numeric, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Creator wallets: read only via RLS (writes via RPC above)
-- ---------------------------------------------------------------------------
drop policy if exists "Creator reads own wallet" on public.creator_wallets;
create policy "Creator reads own creator wallet"
  on public.creator_wallets for select
  to authenticated
  using (public.can_view_creator_wallet(auth.uid(), user_id));

-- ---------------------------------------------------------------------------
-- Payout accounts & requests
-- ---------------------------------------------------------------------------
drop policy if exists "Creators read own payout accounts" on public.creator_payout_accounts;
drop policy if exists "Creators write own payout accounts" on public.creator_payout_accounts;

create policy "Creators read own payout accounts"
  on public.creator_payout_accounts for select
  to authenticated
  using (
    auth.uid() = creator_user_id
    or public.user_has_permission(auth.uid(), 'finance.payout.view')
    or public.user_has_role(auth.uid(), 'owner')
  );

create policy "Creators manage own payout accounts"
  on public.creator_payout_accounts for insert
  to authenticated
  with check (auth.uid() = creator_user_id);

create policy "Creators update own payout accounts"
  on public.creator_payout_accounts for update
  to authenticated
  using (auth.uid() = creator_user_id)
  with check (auth.uid() = creator_user_id);

drop policy if exists "Creators read own payout requests" on public.payout_requests;
drop policy if exists "Creators insert own payout requests" on public.payout_requests;
drop policy if exists "Finance staff update payout requests" on public.payout_requests;

create policy "Creators read own payout requests"
  on public.payout_requests for select
  to authenticated
  using (
    auth.uid() = creator_user_id
    or public.user_has_permission(auth.uid(), 'finance.payout.view')
    or public.user_has_role(auth.uid(), 'owner')
  );

create policy "Creators insert own payout requests"
  on public.payout_requests for insert
  to authenticated
  with check (
    auth.uid() = creator_user_id
    and status in ('requested', 'under_review', 'approved')
    and not public.is_user_write_blocked(auth.uid())
  );

create policy "Finance staff update payout requests"
  on public.payout_requests for update
  to authenticated
  using (
    public.user_has_permission(auth.uid(), 'finance.payout.approve')
    or public.user_has_permission(auth.uid(), 'finance.payout.reject')
    or public.user_has_role(auth.uid(), 'owner')
  )
  with check (
    public.user_has_permission(auth.uid(), 'finance.payout.approve')
    or public.user_has_permission(auth.uid(), 'finance.payout.reject')
    or public.user_has_role(auth.uid(), 'owner')
  );

-- Release logs: finance read, no broad admin legacy
drop policy if exists "Creator release logs read owner/admin" on public.creator_revenue_release_logs;
drop policy if exists "Admin manages release logs" on public.creator_revenue_release_logs;

create policy "Creator release logs read scoped"
  on public.creator_revenue_release_logs for select
  to authenticated
  using (
    auth.uid() = creator_user_id
    or public.user_has_permission(auth.uid(), 'finance.payout.view')
    or public.user_has_role(auth.uid(), 'owner')
  );

create policy "Finance staff manage release logs"
  on public.creator_revenue_release_logs for all
  to authenticated
  using (public.is_finance_staff(auth.uid()))
  with check (public.is_finance_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Ensure finance_admin role has full finance permission set (idempotent)
-- ---------------------------------------------------------------------------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.dashboard.view',
  'finance.payout.view',
  'finance.payout.approve',
  'finance.payout.reject',
  'finance.wallet.adjust',
  'finance.refund.create',
  'wallet.transaction.view.all'
)
where r.code = 'finance_admin'
on conflict do nothing;

-- super_admin: finance ops (if not already linked)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.dashboard.view',
  'finance.payout.view',
  'finance.payout.approve',
  'finance.payout.reject',
  'finance.wallet.adjust',
  'finance.refund.create',
  'wallet.transaction.view.all'
)
where r.code = 'super_admin'
on conflict do nothing;

-- verified_creator: payout view own
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code = 'creator.payout.view.own'
where r.code in ('creator', 'verified_creator')
on conflict do nothing;
