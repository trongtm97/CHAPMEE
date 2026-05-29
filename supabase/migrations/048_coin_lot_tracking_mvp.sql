-- Migration 048: Coin lot tracking MVP with FIFO spend allocation

create table if not exists public.user_coin_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_transaction_id uuid references public.transactions(id) on delete set null,
  source_type text not null check (
    source_type in ('coin_purchase', 'bonus', 'rewarded_ad', 'referral', 'admin_grant', 'test')
  ),
  payment_channel text,
  provider text,
  paid_coin_remaining numeric(18, 2) not null default 0 check (paid_coin_remaining >= 0),
  bonus_coin_remaining numeric(18, 2) not null default 0 check (bonus_coin_remaining >= 0),
  original_paid_coin_amount numeric(18, 2) not null default 0 check (original_paid_coin_amount >= 0),
  original_bonus_coin_amount numeric(18, 2) not null default 0 check (original_bonus_coin_amount >= 0),
  gross_amount_vnd numeric(18, 2),
  provider_fee_vnd numeric(18, 2),
  store_fee_vnd numeric(18, 2),
  net_amount_vnd numeric(18, 2),
  fee_percent_applied numeric(8, 4),
  coin_to_vnd_rate numeric(18, 6) not null default 0 check (coin_to_vnd_rate >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_coin_lots_user_created
  on public.user_coin_lots(user_id, created_at asc);
create index if not exists idx_user_coin_lots_user_expires
  on public.user_coin_lots(user_id, expires_at);

drop trigger if exists trg_touch_user_coin_lots_updated_at on public.user_coin_lots;
create trigger trg_touch_user_coin_lots_updated_at
before update on public.user_coin_lots
for each row execute function public.touch_updated_at();

alter table public.user_coin_lots enable row level security;

drop policy if exists "Users read own coin lots" on public.user_coin_lots;
create policy "Users read own coin lots"
  on public.user_coin_lots for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage coin lots" on public.user_coin_lots;
create policy "Admin manage coin lots"
  on public.user_coin_lots for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

create or replace function public.create_user_coin_lot_from_credit_transaction(input_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx public.transactions;
  source_type_value text;
  expires_at_value timestamptz;
  source_meta text;
begin
  select * into tx
  from public.transactions
  where id = input_transaction_id
    and direction = 'credit'
    and coin_amount is not null
    and (coalesce(paid_coin_amount, 0) > 0 or coalesce(bonus_coin_amount, 0) > 0)
  limit 1;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.user_coin_lots
    where source_transaction_id = tx.id
  ) then
    return;
  end if;

  source_meta := coalesce(tx.metadata ->> 'source_type', '');
  source_type_value := case
    when tx.type = 'coin_purchase' then 'coin_purchase'
    when tx.type = 'rewarded_ad_coin' or tx.source = 'rewarded_ad_coin' then 'rewarded_ad'
    when source_meta = 'referral' then 'referral'
    when tx.source = 'admin' and (tx.metadata ->> 'is_test_coin') = 'true' then 'test'
    when tx.source = 'admin' then 'admin_grant'
    when tx.type = 'bonus_coin_grant' then 'bonus'
    else 'bonus'
  end;

  if tx.metadata ? 'bonus_coin_expires_at' then
    begin
      expires_at_value := (tx.metadata ->> 'bonus_coin_expires_at')::timestamptz;
    exception when others then
      expires_at_value := null;
    end;
  else
    expires_at_value := null;
  end if;

  insert into public.user_coin_lots (
    user_id,
    source_transaction_id,
    source_type,
    payment_channel,
    provider,
    paid_coin_remaining,
    bonus_coin_remaining,
    original_paid_coin_amount,
    original_bonus_coin_amount,
    gross_amount_vnd,
    provider_fee_vnd,
    store_fee_vnd,
    net_amount_vnd,
    fee_percent_applied,
    coin_to_vnd_rate,
    expires_at
  ) values (
    tx.user_id,
    tx.id,
    source_type_value,
    tx.payment_channel,
    tx.provider,
    coalesce(tx.paid_coin_amount, 0),
    coalesce(tx.bonus_coin_amount, 0),
    coalesce(tx.paid_coin_amount, 0),
    coalesce(tx.bonus_coin_amount, 0),
    tx.gross_amount_vnd,
    tx.provider_fee_vnd,
    tx.store_fee_vnd,
    tx.net_amount_vnd,
    tx.fee_percent_applied,
    case
      when coalesce(tx.coin_amount, 0) > 0 and coalesce(tx.money_amount_vnd, 0) > 0
        then tx.money_amount_vnd / nullif(tx.coin_amount, 0)
      when coalesce(tx.coin_amount, 0) > 0 and coalesce(tx.gross_amount_vnd, 0) > 0
        then tx.gross_amount_vnd / nullif(tx.coin_amount, 0)
      else 0
    end,
    expires_at_value
  );
end;
$$;

create or replace function public.allocate_coin_spend_fifo(
  input_user_id uuid,
  input_amount_coin numeric,
  input_spend_rule text default 'bonus_first',
  input_apply_deduction boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_amount numeric(18, 2) := round(coalesce(input_amount_coin, 0), 2);
  requested_paid numeric(18, 2) := 0;
  requested_bonus numeric(18, 2) := 0;
  remaining_paid numeric(18, 2) := 0;
  remaining_bonus numeric(18, 2) := 0;
  wallet_row public.user_wallets;
  total_paid_available numeric(18, 2) := 0;
  total_bonus_available numeric(18, 2) := 0;
  lot_row record;
  paid_take numeric(18, 2);
  bonus_take numeric(18, 2);
  allocations jsonb := '[]'::jsonb;
  paid_total numeric(18, 2) := 0;
  bonus_total numeric(18, 2) := 0;
  fallback_amount numeric(18, 2);
begin
  if requested_amount <= 0 then
    raise exception 'amount_coin must be > 0';
  end if;

  select * into wallet_row
  from public.ensure_user_wallet(input_user_id)
  for update;

  total_paid_available := coalesce(wallet_row.paid_coin_balance, 0);
  total_bonus_available := coalesce(wallet_row.bonus_coin_balance, 0);

  if input_spend_rule = 'paid_first' then
    requested_paid := least(total_paid_available, requested_amount);
    requested_bonus := requested_amount - requested_paid;
  else
    requested_bonus := least(total_bonus_available, requested_amount);
    requested_paid := requested_amount - requested_bonus;
  end if;
  remaining_paid := requested_paid;
  remaining_bonus := requested_bonus;

  for lot_row in
    select *
    from public.user_coin_lots
    where user_id = input_user_id
      and (paid_coin_remaining > 0 or bonus_coin_remaining > 0)
      and (expires_at is null or expires_at > now())
    order by created_at asc, id asc
    for update
  loop
    paid_take := 0;
    bonus_take := 0;

    if remaining_paid > 0 and lot_row.paid_coin_remaining > 0 then
      paid_take := least(lot_row.paid_coin_remaining, remaining_paid);
      remaining_paid := remaining_paid - paid_take;
    end if;

    if remaining_bonus > 0 and lot_row.bonus_coin_remaining > 0 then
      bonus_take := least(lot_row.bonus_coin_remaining, remaining_bonus);
      remaining_bonus := remaining_bonus - bonus_take;
    end if;

    if paid_take > 0 or bonus_take > 0 then
      paid_total := paid_total + paid_take;
      bonus_total := bonus_total + bonus_take;

      allocations := allocations || jsonb_build_array(
        jsonb_build_object(
          'lot_id', lot_row.id,
          'paid_coin_amount', paid_take,
          'bonus_coin_amount', bonus_take,
          'payment_channel', lot_row.payment_channel,
          'provider', lot_row.provider,
          'source_type', lot_row.source_type,
          'gross_amount_vnd', lot_row.gross_amount_vnd,
          'provider_fee_vnd', lot_row.provider_fee_vnd,
          'store_fee_vnd', lot_row.store_fee_vnd,
          'net_amount_vnd', lot_row.net_amount_vnd,
          'fee_percent_applied', lot_row.fee_percent_applied,
          'coin_to_vnd_rate', lot_row.coin_to_vnd_rate,
          'net_ratio',
            case
              when coalesce(lot_row.gross_amount_vnd, 0) > 0 and lot_row.net_amount_vnd is not null
              then round((lot_row.net_amount_vnd / lot_row.gross_amount_vnd)::numeric, 6)
              else null
            end,
          'estimated',
            (lot_row.gross_amount_vnd is null or lot_row.net_amount_vnd is null)
        )
      );

      if input_apply_deduction then
        update public.user_coin_lots
        set
          paid_coin_remaining = greatest(paid_coin_remaining - paid_take, 0),
          bonus_coin_remaining = greatest(bonus_coin_remaining - bonus_take, 0)
        where id = lot_row.id;
      end if;
    end if;

    exit when remaining_paid <= 0 and remaining_bonus <= 0;
  end loop;

  if paid_total < requested_paid then
    fallback_amount := requested_paid - paid_total;
    allocations := allocations || jsonb_build_array(
      jsonb_build_object(
        'lot_id', null,
        'paid_coin_amount', fallback_amount,
        'bonus_coin_amount', 0,
        'payment_channel', null,
        'provider', null,
        'source_type', 'unknown',
        'gross_amount_vnd', null,
        'provider_fee_vnd', null,
        'store_fee_vnd', null,
        'net_amount_vnd', null,
        'fee_percent_applied', null,
        'coin_to_vnd_rate', null,
        'net_ratio', null,
        'estimated', true
      )
    );
    paid_total := paid_total + fallback_amount;
  end if;

  if bonus_total < requested_bonus then
    fallback_amount := requested_bonus - bonus_total;
    allocations := allocations || jsonb_build_array(
      jsonb_build_object(
        'lot_id', null,
        'paid_coin_amount', 0,
        'bonus_coin_amount', fallback_amount,
        'payment_channel', null,
        'provider', null,
        'source_type', 'unknown',
        'gross_amount_vnd', null,
        'provider_fee_vnd', null,
        'store_fee_vnd', null,
        'net_amount_vnd', null,
        'fee_percent_applied', null,
        'coin_to_vnd_rate', null,
        'net_ratio', null,
        'estimated', true
      )
    );
    bonus_total := bonus_total + fallback_amount;
  end if;

  return jsonb_build_object(
    'allocations', allocations,
    'paid_coin_amount', paid_total,
    'bonus_coin_amount', bonus_total
  );
end;
$$;

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

grant execute on function public.create_user_coin_lot_from_credit_transaction(uuid) to authenticated;
grant execute on function public.allocate_coin_spend_fifo(uuid, numeric, text, boolean) to authenticated;
