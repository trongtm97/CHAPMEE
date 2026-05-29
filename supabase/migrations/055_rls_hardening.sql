-- Migration 055: RBAC + RLS hardening (ledger gates, finance/content policies)

-- ---------------------------------------------------------------------------
-- SQL helpers for RLS (permission-aware, legacy-safe)
-- ---------------------------------------------------------------------------
create or replace function public.can_moderate_content(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_staff_moderator(input_user_id)
    or public.user_has_permission(input_user_id, 'story.moderate')
    or public.user_has_permission(input_user_id, 'comment.moderate')
    or public.user_has_permission(input_user_id, 'community.post.moderate')
    or public.user_has_permission(input_user_id, 'report.review');
$$;

create or replace function public.can_manage_app_settings(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.user_has_permission(input_user_id, 'admin.settings.update')
    or public.user_has_role(input_user_id, 'owner');
$$;

create or replace function public.can_view_all_feedback(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.user_has_permission(input_user_id, 'feedback.view.all')
    or public.user_has_role(input_user_id, 'owner');
$$;

grant execute on function public.can_moderate_content(uuid) to authenticated;
grant execute on function public.can_manage_app_settings(uuid) to authenticated;
grant execute on function public.can_view_all_feedback(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ledger RPC authorization (block direct wallet abuse via PostgREST)
-- ---------------------------------------------------------------------------
create or replace function public.rbac_gate_apply_user_coin_ledger(
  p_user_id uuid,
  p_direction text,
  p_type text,
  p_source text,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_finance boolean;
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  v_finance :=
    public.is_finance_staff(v_uid)
    or public.user_has_permission(v_uid, 'finance.wallet.adjust');

  if p_user_id is distinct from v_uid and not v_finance then
    raise exception 'Forbidden';
  end if;

  if p_user_id = v_uid and not v_finance then
    if public.is_user_write_blocked(v_uid) then
      raise exception 'Account restricted';
    end if;

    if p_status <> 'completed' then
      if p_type not in ('coin_purchase') or p_source <> 'payment' then
        raise exception 'Forbidden pending transaction';
      end if;
      return;
    end if;

    if p_direction = 'credit' then
      if p_type not in ('rewarded_ad_coin', 'coin_purchase') then
        raise exception 'Forbidden credit';
      end if;
      if p_type = 'coin_purchase' and p_source <> 'payment' then
        raise exception 'Forbidden credit source';
      end if;
    elsif p_direction = 'debit' then
      if p_type not in (
        'chapter_unlock',
        'story_unlock',
        'author_tip',
        'virtual_gift',
        'vip_subscription',
        'fan_club_subscription'
      ) then
        raise exception 'Forbidden debit';
      end if;
    else
      raise exception 'Invalid direction';
    end if;
  end if;
end;
$$;

create or replace function public.rbac_gate_apply_creator_revenue_ledger(
  p_creator_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_creator_user_id is distinct from v_uid
     and not public.is_finance_staff(v_uid)
     and not public.user_has_permission(v_uid, 'finance.wallet.adjust') then
    raise exception 'Forbidden';
  end if;
end;
$$;

create or replace function public.rbac_gate_ensure_wallet(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Unauthorized';
  end if;

  if p_user_id is distinct from v_uid
     and not public.is_finance_staff(v_uid) then
    raise exception 'Forbidden';
  end if;
end;
$$;

grant execute on function public.rbac_gate_apply_user_coin_ledger(uuid, text, text, text, text) to authenticated;
grant execute on function public.rbac_gate_apply_creator_revenue_ledger(uuid) to authenticated;
grant execute on function public.rbac_gate_ensure_wallet(uuid) to authenticated;

create or replace function public.ensure_user_wallet(input_user_id uuid)
returns public.user_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.user_wallets;
begin
  perform public.rbac_gate_ensure_wallet(input_user_id);

  insert into public.user_wallets (user_id)
  values (input_user_id)
  on conflict (user_id) do nothing;

  select *
  into wallet_row
  from public.user_wallets
  where user_id = input_user_id;

  return wallet_row;
end;
$$;

create or replace function public.ensure_creator_wallet(input_user_id uuid)
returns public.creator_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.creator_wallets;
begin
  perform public.rbac_gate_ensure_wallet(input_user_id);

  insert into public.creator_wallets (user_id)
  values (input_user_id)
  on conflict (user_id) do nothing;

  select *
  into wallet_row
  from public.creator_wallets
  where user_id = input_user_id;

  return wallet_row;
end;
$$;

create or replace function public.apply_creator_revenue_ledger(
  input_creator_user_id uuid,
  input_transaction_code text,
  input_type text,
  input_source text,
  input_amount_vnd numeric,
  input_revenue_status text default 'pending',
  input_status text default 'completed',
  input_metadata jsonb default '{}'::jsonb,
  input_user_id uuid default null,
  input_story_id uuid default null,
  input_chapter_id uuid default null,
  input_currency text default 'VND'
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_amount numeric(18, 2) := coalesce(input_amount_vnd, 0);
  tx_row public.transactions;
begin
  perform public.rbac_gate_apply_creator_revenue_ledger(input_creator_user_id);

  if requested_amount <= 0 then
    raise exception 'amount_vnd must be > 0';
  end if;

  if input_status <> 'completed' then
    insert into public.transactions (
      transaction_code, user_id, creator_user_id, story_id, chapter_id,
      type, direction, money_amount_vnd, creator_gross_vnd, creator_net_vnd,
      status, source, metadata, currency
    )
    values (
      input_transaction_code, input_user_id, input_creator_user_id, input_story_id, input_chapter_id,
      input_type, 'credit', requested_amount, requested_amount, requested_amount,
      input_status, input_source, coalesce(input_metadata, '{}'::jsonb), input_currency
    )
    returning * into tx_row;

    return tx_row;
  end if;

  perform public.ensure_creator_wallet(input_creator_user_id);

  if input_revenue_status = 'available' then
    update public.creator_wallets
    set
      available_revenue_vnd = available_revenue_vnd + requested_amount,
      total_earned_vnd = total_earned_vnd + requested_amount
    where user_id = input_creator_user_id;
  elsif input_revenue_status = 'locked' then
    update public.creator_wallets
    set
      locked_revenue_vnd = locked_revenue_vnd + requested_amount,
      total_earned_vnd = total_earned_vnd + requested_amount
    where user_id = input_creator_user_id;
  else
    update public.creator_wallets
    set
      pending_revenue_vnd = pending_revenue_vnd + requested_amount,
      total_earned_vnd = total_earned_vnd + requested_amount
    where user_id = input_creator_user_id;
  end if;

  insert into public.transactions (
    transaction_code, user_id, creator_user_id, story_id, chapter_id,
    type, direction, money_amount_vnd, creator_gross_vnd, creator_net_vnd,
    status, source, metadata, currency
  )
  values (
    input_transaction_code, input_user_id, input_creator_user_id, input_story_id, input_chapter_id,
    input_type, 'credit', requested_amount, requested_amount, requested_amount,
    input_status, input_source, coalesce(input_metadata, '{}'::jsonb), input_currency
  )
  returning * into tx_row;

  return tx_row;
end;
$$;

-- apply_user_coin_ledger (048 body + gate)
create or replace function public.apply_user_coin_ledger(
  input_user_id uuid,
  input_transaction_code text,
  input_type text,
  input_source text,
  input_direction text,
  input_coin_amount numeric,
  input_coin_type text default 'paid',
  input_spend_rule text default 'bonus_first',
  input_status text default 'completed',
  input_metadata jsonb default '{}'::jsonb,
  input_creator_user_id uuid default null,
  input_story_id uuid default null,
  input_chapter_id uuid default null,
  input_currency text default 'VND'
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.user_wallets;
  tx_row public.transactions;
  requested_amount numeric(18, 2) := coalesce(input_coin_amount, 0);
  consume_bonus numeric(18, 2) := 0;
  consume_paid numeric(18, 2) := 0;
  allocation_payload jsonb;
  allocation_list jsonb := '[]'::jsonb;
begin
  perform public.rbac_gate_apply_user_coin_ledger(
    input_user_id,
    input_direction,
    input_type,
    input_source,
    input_status
  );

  if requested_amount <= 0 then
    raise exception 'coin amount must be > 0';
  end if;

  if input_direction not in ('credit', 'debit') then
    raise exception 'input_direction must be credit or debit';
  end if;

  if input_status <> 'completed' then
    insert into public.transactions (
      transaction_code, user_id, creator_user_id, story_id, chapter_id,
      type, direction, coin_amount, paid_coin_amount, bonus_coin_amount,
      status, source, metadata, currency
    )
    values (
      input_transaction_code, input_user_id, input_creator_user_id, input_story_id, input_chapter_id,
      input_type, input_direction, requested_amount, null, null,
      input_status, input_source, coalesce(input_metadata, '{}'::jsonb), input_currency
    )
    returning * into tx_row;

    return tx_row;
  end if;

  select * into wallet_row
  from public.ensure_user_wallet(input_user_id)
  for update;

  if input_direction = 'credit' then
    if input_coin_type = 'bonus' then
      update public.user_wallets
      set
        bonus_coin_balance = bonus_coin_balance + requested_amount,
        total_received_coin = total_received_coin + requested_amount
      where user_id = input_user_id
      returning * into wallet_row;

      insert into public.transactions (
        transaction_code, user_id, creator_user_id, story_id, chapter_id,
        type, direction, coin_amount, paid_coin_amount, bonus_coin_amount,
        status, source, metadata, currency
      )
      values (
        input_transaction_code, input_user_id, input_creator_user_id, input_story_id, input_chapter_id,
        input_type, input_direction, requested_amount, 0, requested_amount,
        input_status, input_source, coalesce(input_metadata, '{}'::jsonb), input_currency
      )
      returning * into tx_row;
    else
      update public.user_wallets
      set
        paid_coin_balance = paid_coin_balance + requested_amount,
        total_received_coin = total_received_coin + requested_amount
      where user_id = input_user_id
      returning * into wallet_row;

      insert into public.transactions (
        transaction_code, user_id, creator_user_id, story_id, chapter_id,
        type, direction, coin_amount, paid_coin_amount, bonus_coin_amount,
        status, source, metadata, currency
      )
      values (
        input_transaction_code, input_user_id, input_creator_user_id, input_story_id, input_chapter_id,
        input_type, input_direction, requested_amount, requested_amount, 0,
        input_status, input_source, coalesce(input_metadata, '{}'::jsonb), input_currency
      )
      returning * into tx_row;
    end if;

    perform public.create_user_coin_lot_from_credit_transaction(tx_row.id);
  else
    if input_spend_rule = 'paid_first' then
      consume_paid := least(wallet_row.paid_coin_balance, requested_amount);
      consume_bonus := requested_amount - consume_paid;
    else
      consume_bonus := least(wallet_row.bonus_coin_balance, requested_amount);
      consume_paid := requested_amount - consume_bonus;
    end if;

    if consume_paid > wallet_row.paid_coin_balance or consume_bonus > wallet_row.bonus_coin_balance then
      raise exception 'insufficient balance';
    end if;

    allocation_payload := public.allocate_coin_spend_fifo(
      input_user_id,
      requested_amount,
      input_spend_rule,
      true
    );
    allocation_list := coalesce(allocation_payload -> 'allocations', '[]'::jsonb);

    update public.user_wallets
    set
      paid_coin_balance = paid_coin_balance - consume_paid,
      bonus_coin_balance = bonus_coin_balance - consume_bonus,
      total_spent_coin = total_spent_coin + requested_amount
    where user_id = input_user_id
    returning * into wallet_row;

    insert into public.transactions (
      transaction_code, user_id, creator_user_id, story_id, chapter_id,
      type, direction, coin_amount, paid_coin_amount, bonus_coin_amount,
      status, source, metadata, currency
    )
    values (
      input_transaction_code, input_user_id, input_creator_user_id, input_story_id, input_chapter_id,
      input_type, input_direction, requested_amount, consume_paid, consume_bonus,
      input_status, input_source,
      coalesce(input_metadata, '{}'::jsonb) || jsonb_build_object(
        'coin_lot_allocations', allocation_list
      ),
      input_currency
    )
    returning * into tx_row;
  end if;

  return tx_row;
end;
$$;

-- ---------------------------------------------------------------------------
-- Wallets & transactions RLS
-- ---------------------------------------------------------------------------
drop policy if exists "User writes own wallet restricted" on public.user_wallets;
drop policy if exists "Creator wallet admin write" on public.creator_wallets;

drop policy if exists "Users insert own transactions" on public.transactions;
drop policy if exists "Admin update transactions" on public.transactions;

drop policy if exists "Users read own transactions" on public.transactions;
create policy "Users read own transactions"
  on public.transactions for select
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = creator_user_id
    or public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'wallet.transaction.view.all')
  );

create policy "Finance staff can update transactions"
  on public.transactions for update
  to authenticated
  using (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.wallet.adjust')
  )
  with check (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.wallet.adjust')
  );

create policy "Finance staff insert transactions"
  on public.transactions for insert
  to authenticated
  with check (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.wallet.adjust')
  );

drop policy if exists "User reads own wallet" on public.user_wallets;
create policy "User reads own wallet"
  on public.user_wallets for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'wallet.transaction.view.all')
  );

drop policy if exists "Creator reads own wallet" on public.creator_wallets;
create policy "Creator reads own wallet"
  on public.creator_wallets for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.payout.view')
  );

-- ---------------------------------------------------------------------------
-- RBAC tables tighten
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read own roles" on public.user_roles;
create policy "Users can read own roles"
  on public.user_roles for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_assign_roles(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.user.view')
  );

drop policy if exists "Staff can insert audit logs" on public.admin_audit_logs;
create policy "Staff can insert audit logs"
  on public.admin_audit_logs for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and public.can_view_admin_audit(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- App settings & feedback
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read public app settings" on public.app_settings;
create policy "Public can read public app settings"
  on public.app_settings for select
  using (
    is_public = true
    or public.can_manage_app_settings(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
  );

drop policy if exists "Admin founder can insert app settings" on public.app_settings;
drop policy if exists "Admin founder can update app settings" on public.app_settings;
drop policy if exists "Admin founder can delete app settings" on public.app_settings;

create policy "Settings managers can insert app settings"
  on public.app_settings for insert
  to authenticated
  with check (public.can_manage_app_settings(auth.uid()));

create policy "Settings managers can update app settings"
  on public.app_settings for update
  to authenticated
  using (public.can_manage_app_settings(auth.uid()))
  with check (public.can_manage_app_settings(auth.uid()));

create policy "Settings managers can delete app settings"
  on public.app_settings for delete
  to authenticated
  using (public.can_manage_app_settings(auth.uid()));

drop policy if exists "Admin founder can read feedback" on public.feedback_messages;
create policy "Staff can read feedback"
  on public.feedback_messages for select
  to authenticated
  using (public.can_view_all_feedback(auth.uid()));

drop policy if exists "Users can insert own feedback" on public.feedback_messages;
create policy "Users can insert own feedback"
  on public.feedback_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not public.is_user_write_blocked(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Content moderation policies (permission-aware)
-- ---------------------------------------------------------------------------
drop policy if exists "Moderators can update stories" on public.stories;
create policy "Staff can moderate stories"
  on public.stories for update
  to authenticated
  using (public.can_moderate_content(auth.uid()))
  with check (public.can_moderate_content(auth.uid()));

drop policy if exists "Moderators can update episodes" on public.episodes;
create policy "Staff can moderate episodes"
  on public.episodes for update
  to authenticated
  using (public.can_moderate_content(auth.uid()))
  with check (public.can_moderate_content(auth.uid()));

drop policy if exists "Moderators can update comments" on public.comments;
create policy "Staff can moderate comments"
  on public.comments for update
  to authenticated
  using (public.can_moderate_content(auth.uid()))
  with check (public.can_moderate_content(auth.uid()));

-- ---------------------------------------------------------------------------
-- Payouts (finance staff only for admin updates)
-- ---------------------------------------------------------------------------
drop policy if exists "Admin update payout requests" on public.payout_requests;
create policy "Finance staff update payout requests"
  on public.payout_requests for update
  to authenticated
  using (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.payout.approve')
    or public.user_has_permission(auth.uid(), 'finance.payout.reject')
  )
  with check (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.payout.approve')
    or public.user_has_permission(auth.uid(), 'finance.payout.reject')
  );

drop policy if exists "Creators read own payout requests" on public.payout_requests;
create policy "Creators read own payout requests"
  on public.payout_requests for select
  to authenticated
  using (
    auth.uid() = creator_user_id
    or public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.payout.view')
  );

drop policy if exists "Creators insert own payout requests" on public.payout_requests;
create policy "Creators insert own payout requests"
  on public.payout_requests for insert
  to authenticated
  with check (
    auth.uid() = creator_user_id
    and not public.is_user_write_blocked(auth.uid())
  );

-- Seed community.group.create for reader role (DB alignment with app READER_PERMISSIONS)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code = 'community.group.create'
where r.code = 'reader'
on conflict do nothing;

-- monetization_settings: permission-based write (not legacy profile role only)
drop policy if exists "Admin founder can insert monetization settings" on public.monetization_settings;
drop policy if exists "Admin founder can update monetization settings" on public.monetization_settings;
drop policy if exists "Admin founder can delete monetization settings" on public.monetization_settings;

create policy "Settings managers insert monetization settings"
  on public.monetization_settings for insert
  to authenticated
  with check (public.can_manage_app_settings(auth.uid()));

create policy "Settings managers update monetization settings"
  on public.monetization_settings for update
  to authenticated
  using (public.can_manage_app_settings(auth.uid()))
  with check (public.can_manage_app_settings(auth.uid()));

create policy "Settings managers delete monetization settings"
  on public.monetization_settings for delete
  to authenticated
  using (public.can_manage_app_settings(auth.uid()));

-- Checkout fulfillment: only session owner or finance staff
create or replace function public.process_coin_purchase_checkout(input_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.checkout_sessions;
  existing_tx public.transactions;
  provider_payload jsonb;
  tx_provider text;
  tx_source text;
begin
  select * into session_row
  from public.checkout_sessions
  where id = input_session_id
  for update;

  if not found then
    raise exception 'checkout session not found';
  end if;

  if session_row.user_id is distinct from auth.uid()
     and not public.is_finance_staff(auth.uid()) then
    raise exception 'Forbidden';
  end if;

  if session_row.status <> 'paid' then
    raise exception 'checkout session not paid';
  end if;

  perform public.ensure_user_wallet(session_row.user_id);

  select * into existing_tx
  from public.transactions
  where transaction_code = ('COINPUR-' || session_row.id::text)
  limit 1;

  if found then
    return jsonb_build_object(
      'already_processed', true,
      'transaction_id', existing_tx.id::text
    );
  end if;

  update public.user_wallets
  set
    paid_coin_balance = paid_coin_balance + session_row.base_coin_amount,
    bonus_coin_balance = bonus_coin_balance + session_row.bonus_coin_amount,
    total_received_coin = total_received_coin + session_row.total_coin_amount
  where user_id = session_row.user_id;

  provider_payload := coalesce(session_row.provider_payload, '{}'::jsonb);
  tx_provider := case
    when session_row.payment_channel = 'google_play_billing' then 'google_play'
    else session_row.provider
  end;
  tx_source := case
    when session_row.provider = 'sepay' then 'sepay'
    else 'payment'
  end;

  insert into public.transactions (
    transaction_code,
    user_id,
    type,
    direction,
    coin_amount,
    paid_coin_amount,
    bonus_coin_amount,
    money_amount_vnd,
    gross_amount_vnd,
    provider_fee_vnd,
    store_fee_vnd,
    net_amount_vnd,
    payment_channel,
    provider,
    provider_reference,
    revenue_basis,
    fee_percent_applied,
    currency,
    status,
    source,
    metadata
  ) values (
    'COINPUR-' || session_row.id::text,
    session_row.user_id,
    'coin_purchase',
    'credit',
    session_row.total_coin_amount,
    session_row.base_coin_amount,
    session_row.bonus_coin_amount,
    session_row.gross_amount_vnd,
    session_row.gross_amount_vnd,
    session_row.provider_fee_vnd,
    session_row.store_fee_vnd,
    session_row.net_amount_vnd,
    session_row.payment_channel,
    tx_provider,
    session_row.provider_reference,
    'net',
    case
      when session_row.gross_amount_vnd > 0
      then round(((session_row.provider_fee_vnd + session_row.store_fee_vnd) / session_row.gross_amount_vnd) * 100, 2)
      else 0
    end,
    session_row.currency,
    'completed',
    tx_source,
    jsonb_strip_nulls(
      jsonb_build_object(
        'checkout_session_id', session_row.id,
        'coin_pack_id', session_row.coin_pack_id,
        'platform', session_row.platform,
        'purchaseToken', provider_payload ->> 'purchaseToken',
        'orderId', provider_payload ->> 'orderId',
        'productId', provider_payload ->> 'productId'
      )
    )
  )
  returning * into existing_tx;

  perform public.create_user_coin_lot_from_credit_transaction(existing_tx.id);

  return jsonb_build_object(
    'already_processed', false,
    'transaction_id', existing_tx.id::text
  );
end;
$$;
