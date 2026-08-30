-- Migration 047: Align Google Play ledger metadata/provider semantics

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

  return jsonb_build_object(
    'already_processed', false,
    'transaction_id', existing_tx.id::text
  );
end;
$$;
