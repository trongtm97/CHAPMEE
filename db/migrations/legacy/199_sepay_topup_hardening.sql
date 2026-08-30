-- Migration 199: SePay top-up settings, idempotency, and webhook-safe fulfillment.

alter table public.payment_provider_settings
  add column if not exists private_config_reference text;

insert into public.payment_provider_settings (
  provider_key,
  enabled,
  test_mode,
  public_config
)
values (
  'sepay',
  false,
  true,
  jsonb_build_object(
    'sepay_display_name', 'Chuyen khoan ngan hang',
    'bank_code', '',
    'bank_account_number', '',
    'bank_account_name', '',
    'qr_provider', 'sepay_vietqr',
    'qr_base_url', 'https://qr.sepay.vn/img',
    'qr_template_enabled', true,
    'manual_bank_transfer_enabled', true,
    'sepay_auth_method', 'hmac_sha256',
    'allowed_transfer_type', 'in',
    'allowed_account_numbers', jsonb_build_array(),
    'topup_order_expire_minutes', 30,
    'payment_code_mode', 'numeric_only',
    'payment_code_length', 12,
    'payment_code_description_template', '{payment_code}',
    'require_exact_amount', true,
    'require_exact_code', true,
    'allow_amount_tolerance_vnd', 0,
    'auto_match_window_hours', 24,
    'enable_sepay_on_web', true,
    'enable_sepay_on_pwa', true,
    'enable_sepay_on_ios_native', false,
    'enable_sepay_on_android_native', false
  )
)
on conflict (provider_key) do update
set public_config = public.payment_provider_settings.public_config || excluded.public_config;

create unique index if not exists idx_payment_webhook_events_provider_event_unique
  on public.payment_webhook_events(provider, event_id)
  where event_id is not null;

create unique index if not exists idx_payment_webhook_events_provider_ref_unique
  on public.payment_webhook_events(provider, provider_reference)
  where provider_reference is not null and status = 'processed';

create index if not exists idx_checkout_sessions_sepay_code_pending
  on public.checkout_sessions(checkout_code, status)
  where provider = 'sepay';

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
  jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  select * into session_row
  from public.checkout_sessions
  where id = input_session_id
  for update;

  if not found then
    raise exception 'checkout session not found';
  end if;

  if jwt_role <> 'service_role'
     and session_row.user_id is distinct from auth.uid()
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
        'payment_code', session_row.checkout_code,
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

grant execute on function public.process_coin_purchase_checkout(uuid) to authenticated, service_role;
