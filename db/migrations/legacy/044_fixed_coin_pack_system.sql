-- Migration 044: Fixed coin pack system + strict checkout snapshot + idempotent purchase credit

alter table public.coin_packs
  add column if not exists base_coin_amount numeric(18, 2),
  add column if not exists total_coin_amount numeric(18, 2),
  add column if not exists bonus_percent numeric(5, 2),
  add column if not exists label text;

update public.coin_packs
set
  base_coin_amount = coalesce(base_coin_amount, coin_amount, 0),
  total_coin_amount = coalesce(total_coin_amount, coalesce(base_coin_amount, coin_amount, 0) + coalesce(bonus_coin_amount, 0)),
  bonus_percent = coalesce(
    bonus_percent,
    case
      when coalesce(base_coin_amount, coin_amount, 0) > 0
      then round((coalesce(bonus_coin_amount, 0) / coalesce(base_coin_amount, coin_amount, 0)) * 100, 2)
      else 0
    end
  )
where base_coin_amount is null
   or total_coin_amount is null
   or bonus_percent is null;

alter table public.coin_packs
  alter column base_coin_amount set not null,
  alter column total_coin_amount set not null,
  alter column bonus_percent set not null;

alter table public.coin_packs
  alter column is_active set default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coin_packs_base_coin_positive'
  ) then
    alter table public.coin_packs
      add constraint coin_packs_base_coin_positive check (base_coin_amount > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coin_packs_total_coin_non_negative'
  ) then
    alter table public.coin_packs
      add constraint coin_packs_total_coin_non_negative check (total_coin_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'coin_packs_bonus_percent_cap'
  ) then
    alter table public.coin_packs
      add constraint coin_packs_bonus_percent_cap check (bonus_percent >= 0 and bonus_percent <= 15);
  end if;
end $$;

drop index if exists idx_coin_packs_active_price_unique;
create unique index idx_coin_packs_active_price_unique
  on public.coin_packs(price_vnd)
  where is_active = true;

alter table public.checkout_sessions
  add column if not exists base_coin_amount numeric(18, 2),
  add column if not exists total_coin_amount numeric(18, 2);

update public.checkout_sessions
set
  base_coin_amount = coalesce(base_coin_amount, coin_amount, 0),
  total_coin_amount = coalesce(total_coin_amount, coalesce(base_coin_amount, coin_amount, 0) + coalesce(bonus_coin_amount, 0))
where base_coin_amount is null
   or total_coin_amount is null;

alter table public.checkout_sessions
  alter column base_coin_amount set not null,
  alter column total_coin_amount set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_base_coin_non_negative'
  ) then
    alter table public.checkout_sessions
      add constraint checkout_sessions_base_coin_non_negative check (base_coin_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'checkout_sessions_total_coin_non_negative'
  ) then
    alter table public.checkout_sessions
      add constraint checkout_sessions_total_coin_non_negative check (total_coin_amount >= 0);
  end if;
end $$;

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
  select *
  into session_row
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

  select *
  into existing_tx
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
    session_row.amount_vnd,
    'VND',
    'completed',
    'payment',
    jsonb_build_object(
      'checkout_session_id', session_row.id,
      'coin_pack_id', session_row.coin_pack_id,
      'provider', session_row.provider
    )
  )
  returning * into existing_tx;

  return jsonb_build_object(
    'already_processed', false,
    'transaction_id', existing_tx.id::text
  );
end;
$$;

grant execute on function public.process_coin_purchase_checkout(uuid) to authenticated;

insert into public.coin_packs (
  name,
  coin_amount,
  price_vnd,
  base_coin_amount,
  bonus_coin_amount,
  total_coin_amount,
  bonus_percent,
  currency,
  label,
  badge_text,
  is_active,
  sort_order
)
values
  ('Gói 20.000 VND', 200, 20000, 200, 0, 200, 0, 'VND', 'Gói thử', null, true, 1),
  ('Gói 50.000 VND', 500, 50000, 500, 0, 500, 0, 'VND', 'Cơ bản', null, true, 2),
  ('Gói 100.000 VND', 1030, 100000, 1000, 30, 1030, 3, 'VND', 'Phổ biến', 'Popular', true, 3),
  ('Gói 200.000 VND', 2100, 200000, 2000, 100, 2100, 5, 'VND', 'Tiết kiệm', null, true, 4),
  ('Gói 500.000 VND', 5500, 500000, 5000, 500, 5500, 10, 'VND', 'Fan lớn', null, true, 5),
  ('Gói 1.000.000 VND', 11500, 1000000, 10000, 1500, 11500, 15, 'VND', 'Super Fan', 'Best Value', true, 6)
on conflict do nothing;
