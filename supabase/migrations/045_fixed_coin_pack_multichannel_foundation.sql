-- Migration 045: Fixed coin packs + multi-channel payment foundation

alter table public.checkout_sessions
  add column if not exists checkout_code text,
  add column if not exists payment_channel text,
  add column if not exists provider_product_id text,
  add column if not exists provider_reference text,
  add column if not exists gross_amount_vnd numeric(18, 2),
  add column if not exists provider_fee_vnd numeric(18, 2) not null default 0,
  add column if not exists store_fee_vnd numeric(18, 2) not null default 0,
  add column if not exists net_amount_vnd numeric(18, 2),
  add column if not exists platform text not null default 'web',
  add column if not exists admin_note text,
  add column if not exists transfer_content text,
  add column if not exists qr_url text;

do $$
begin
  alter table public.payment_provider_settings
    drop constraint if exists payment_provider_settings_provider_key_check;
  alter table public.payment_provider_settings
    add constraint payment_provider_settings_provider_key_check check (
      provider_key in (
        'sepay',
        'google_play_billing',
        'apple_iap',
        'manual',
        'mock_test',
        'vnpay',
        'momo',
        'zalopay',
        'vietqr',
        'app_store_iap'
      )
    );

  alter table public.checkout_sessions
    drop constraint if exists checkout_sessions_provider_check;
  alter table public.checkout_sessions
    add constraint checkout_sessions_provider_check check (
      provider in (
        'sepay',
        'google_play_billing',
        'apple_iap',
        'manual',
        'mock_test',
        'vnpay',
        'momo',
        'zalopay',
        'vietqr',
        'app_store_iap'
      )
    );
end $$;

update public.checkout_sessions
set
  provider_reference = coalesce(provider_reference, payment_reference),
  payment_channel = coalesce(payment_channel, 'web_sepay'),
  gross_amount_vnd = coalesce(gross_amount_vnd, amount_vnd, 0),
  net_amount_vnd = coalesce(net_amount_vnd, amount_vnd, 0),
  provider_fee_vnd = coalesce(provider_fee_vnd, 0),
  store_fee_vnd = coalesce(store_fee_vnd, 0)
where provider_reference is null
   or payment_channel is null
   or gross_amount_vnd is null
   or net_amount_vnd is null;

alter table public.checkout_sessions
  alter column payment_channel set not null,
  alter column gross_amount_vnd set not null,
  alter column net_amount_vnd set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_status_v2_check'
  ) then
    alter table public.checkout_sessions
      drop constraint if exists checkout_sessions_status_check;

    alter table public.checkout_sessions
      add constraint checkout_sessions_status_v2_check check (
        status in (
          'created',
          'pending',
          'paid',
          'expired',
          'failed',
          'cancelled',
          'manual_review'
        )
      );
  end if;
end $$;

create unique index if not exists idx_checkout_sessions_checkout_code_unique
  on public.checkout_sessions(checkout_code)
  where checkout_code is not null;

create unique index if not exists idx_checkout_sessions_provider_reference_unique
  on public.checkout_sessions(provider_reference)
  where provider_reference is not null;

create table if not exists public.coin_pack_channel_overrides (
  id uuid primary key default gen_random_uuid(),
  coin_pack_id uuid not null references public.coin_packs(id) on delete cascade,
  payment_channel text not null check (
    payment_channel in ('web_sepay', 'google_play_billing', 'apple_iap', 'manual_admin')
  ),
  provider_product_id text,
  price_vnd numeric(18, 2),
  base_coin_amount numeric(18, 2),
  bonus_coin_amount numeric(18, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coin_pack_channel_overrides_price_non_negative
    check (price_vnd is null or price_vnd >= 0),
  constraint coin_pack_channel_overrides_base_non_negative
    check (base_coin_amount is null or base_coin_amount >= 0),
  constraint coin_pack_channel_overrides_bonus_non_negative
    check (bonus_coin_amount is null or bonus_coin_amount >= 0),
  constraint coin_pack_channel_overrides_unique unique (coin_pack_id, payment_channel)
);

drop trigger if exists trg_touch_coin_pack_channel_overrides_updated_at on public.coin_pack_channel_overrides;
create trigger trg_touch_coin_pack_channel_overrides_updated_at
before update on public.coin_pack_channel_overrides
for each row execute function public.touch_updated_at();

create table if not exists public.payment_provider_products (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('sepay', 'google_play', 'apple_iap', 'manual')),
  payment_channel text not null check (
    payment_channel in ('web_sepay', 'google_play_billing', 'apple_iap', 'manual_admin')
  ),
  product_id text not null,
  coin_pack_id uuid not null references public.coin_packs(id) on delete cascade,
  is_active boolean not null default true,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_provider_products_unique unique (provider, payment_channel, product_id)
);

drop trigger if exists trg_touch_payment_provider_products_updated_at on public.payment_provider_products;
create trigger trg_touch_payment_provider_products_updated_at
before update on public.payment_provider_products
for each row execute function public.touch_updated_at();

alter table public.coin_pack_channel_overrides enable row level security;
alter table public.payment_provider_products enable row level security;

drop policy if exists "Public read coin pack channel overrides" on public.coin_pack_channel_overrides;
create policy "Public read coin pack channel overrides"
  on public.coin_pack_channel_overrides for select
  using (is_active = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage coin pack channel overrides" on public.coin_pack_channel_overrides;
create policy "Admin manage coin pack channel overrides"
  on public.coin_pack_channel_overrides for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Public read payment provider products" on public.payment_provider_products;
create policy "Public read payment provider products"
  on public.payment_provider_products for select
  using (is_active = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage payment provider products" on public.payment_provider_products;
create policy "Admin manage payment provider products"
  on public.payment_provider_products for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

alter table public.transactions
  add column if not exists payment_channel text,
  add column if not exists provider text,
  add column if not exists provider_reference text,
  add column if not exists gross_amount_vnd numeric(18, 2),
  add column if not exists provider_fee_vnd numeric(18, 2) not null default 0,
  add column if not exists store_fee_vnd numeric(18, 2) not null default 0,
  add column if not exists net_amount_vnd numeric(18, 2),
  add column if not exists revenue_basis text not null default 'net',
  add column if not exists fee_percent_applied numeric(5, 2) not null default 0;

do $$
begin
  alter table public.transactions
    drop constraint if exists transactions_source_check;
  alter table public.transactions
    add constraint transactions_source_check check (
      source in (
        'system',
        'payment',
        'sepay',
        'tip',
        'unlock',
        'vip',
        'gift',
        'admin',
        'bonus',
        'rewarded_ad_coin',
        'payout',
        'refund',
        'sponsor'
      )
    );
end $$;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text,
  checkout_session_id uuid references public.checkout_sessions(id) on delete set null,
  status text not null check (
    status in (
      'received',
      'processed',
      'ignored',
      'failed',
      'manual_review',
      'ignored_duplicate'
    )
  ),
  raw_payload jsonb not null,
  signature_valid boolean,
  amount_vnd numeric(18, 2),
  transfer_content text,
  provider_reference text,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.payment_webhook_events enable row level security;

drop policy if exists "Admin read payment webhook events" on public.payment_webhook_events;
create policy "Admin read payment webhook events"
  on public.payment_webhook_events for select
  using (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Service insert payment webhook events" on public.payment_webhook_events;
create policy "Service insert payment webhook events"
  on public.payment_webhook_events for insert
  with check (true);

drop policy if exists "Admin update payment webhook events" on public.payment_webhook_events;
create policy "Admin update payment webhook events"
  on public.payment_webhook_events for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

update public.transactions
set
  gross_amount_vnd = coalesce(gross_amount_vnd, money_amount_vnd, 0),
  net_amount_vnd = coalesce(net_amount_vnd, money_amount_vnd, 0),
  provider_fee_vnd = coalesce(provider_fee_vnd, 0),
  store_fee_vnd = coalesce(store_fee_vnd, 0)
where gross_amount_vnd is null
   or net_amount_vnd is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_revenue_basis_check'
  ) then
    alter table public.transactions
      add constraint transactions_revenue_basis_check check (revenue_basis in ('gross', 'net'));
  end if;
end $$;

insert into public.payment_provider_products (
  provider,
  payment_channel,
  product_id,
  coin_pack_id,
  is_active,
  metadata
)
select
  'google_play',
  'google_play_billing',
  product_id,
  cp.id,
  true,
  jsonb_build_object('source', 'default_seed')
from (
  values
    ('chapchap_coin_200', 20000),
    ('chapchap_coin_500', 50000),
    ('chapchap_coin_1000', 100000),
    ('chapchap_coin_2000', 200000),
    ('chapchap_coin_5000', 500000),
    ('chapchap_coin_10000', 1000000)
) as seeds(product_id, price_vnd)
join public.coin_packs cp on cp.price_vnd = seeds.price_vnd
on conflict (provider, payment_channel, product_id) do nothing;

insert into public.payment_provider_products (
  provider,
  payment_channel,
  product_id,
  coin_pack_id,
  is_active,
  metadata
)
select
  'apple_iap',
  'apple_iap',
  product_id,
  cp.id,
  true,
  jsonb_build_object('source', 'default_seed')
from (
  values
    ('chapchap_coin_200', 20000),
    ('chapchap_coin_500', 50000),
    ('chapchap_coin_1000', 100000),
    ('chapchap_coin_2000', 200000),
    ('chapchap_coin_5000', 500000),
    ('chapchap_coin_10000', 1000000)
) as seeds(product_id, price_vnd)
join public.coin_packs cp on cp.price_vnd = seeds.price_vnd
on conflict (provider, payment_channel, product_id) do nothing;

insert into public.monetization_settings (key, value, description, is_public)
values
  ('payments.test_mode', 'false'::jsonb, 'Test mode cho payment foundation.', false),
  ('payments.provider_apple_iap_enabled', 'false'::jsonb, 'Bat Apple IAP.', true),
  ('payments.sepay.default_fee_percent', '2'::jsonb, 'Phi SePay mac dinh (%).', false),
  ('payments.google_play.default_store_fee_percent', '15'::jsonb, 'Phi store Google Play mac dinh (%).', false),
  ('payments.apple_iap.default_store_fee_percent', '15'::jsonb, 'Phi store Apple IAP mac dinh (%).', false),
  ('payments.store.standard_fee_percent', '30'::jsonb, 'Phi fallback cho store (%).', false),
  ('revenue_share.calculate_on_net_after_channel_fee', 'true'::jsonb, 'Tinh revenue share tren net sau channel fee.', false)
on conflict (key) do nothing;

insert into public.payment_provider_settings (provider_key, enabled, test_mode, public_config)
values
  ('sepay', false, true, '{}'::jsonb),
  ('apple_iap', false, true, '{}'::jsonb),
  ('manual', false, true, '{}'::jsonb)
on conflict (provider_key) do nothing;

create or replace function public.process_coin_purchase_checkout(input_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  session_row public.checkout_sessions;
  existing_tx public.transactions;
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
    session_row.provider,
    session_row.provider_reference,
    'net',
    case
      when session_row.gross_amount_vnd > 0
      then round(((session_row.provider_fee_vnd + session_row.store_fee_vnd) / session_row.gross_amount_vnd) * 100, 2)
      else 0
    end,
    session_row.currency,
    'completed',
    case when session_row.provider = 'sepay' then 'sepay' else 'payment' end,
    jsonb_build_object(
      'checkout_session_id', session_row.id,
      'coin_pack_id', session_row.coin_pack_id,
      'platform', session_row.platform
    )
  )
  returning * into existing_tx;

  return jsonb_build_object(
    'already_processed', false,
    'transaction_id', existing_tx.id::text
  );
end;
$$;
