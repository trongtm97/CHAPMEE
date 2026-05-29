-- Migration 057: Payout insert hardening, auto-approve RPC, shift_creator_wallet none

-- ---------------------------------------------------------------------------
-- shift_creator_wallet_balances: explicit input_to = 'none' (paid / withdrawn)
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

  if input_to not in ('available', 'locked', 'pending', 'none') then
    raise exception 'Invalid input_to';
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
  -- input_to = 'none': only subtract from input_from (payout completed)

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
-- Creators cannot INSERT payout with finance-only statuses
-- ---------------------------------------------------------------------------
drop policy if exists "Creators insert own payout requests" on public.payout_requests;

create policy "Creators insert own payout requests"
  on public.payout_requests for insert
  to authenticated
  with check (
    auth.uid() = creator_user_id
    and status in ('requested', 'under_review')
    and not public.is_user_write_blocked(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Auto-approve when manual review is disabled (server-side, not client INSERT)
-- ---------------------------------------------------------------------------
create or replace function public.maybe_auto_approve_own_payout_request(p_request_id uuid)
returns public.payout_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.payout_requests;
  manual_review boolean := true;
  setting_value jsonb;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  select * into req
  from public.payout_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Payout request not found';
  end if;

  if req.creator_user_id <> auth.uid() then
    raise exception 'Forbidden';
  end if;

  if req.status not in ('requested', 'under_review') then
    return req;
  end if;

  select ms.value into setting_value
  from public.monetization_settings ms
  where ms.key = 'payout.manual_review_required'
  limit 1;

  if setting_value is not null then
    manual_review := coalesce(setting_value::text = 'true', true);
  end if;

  if manual_review then
    return req;
  end if;

  update public.payout_requests
  set
    status = 'approved',
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id
  returning * into req;

  return req;
end;
$$;

grant execute on function public.maybe_auto_approve_own_payout_request(uuid) to authenticated;
