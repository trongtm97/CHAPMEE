-- Migration 028: Wallets + transaction ledger foundation

create table if not exists public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  paid_coin_balance numeric(18, 2) not null default 0,
  bonus_coin_balance numeric(18, 2) not null default 0,
  locked_coin_balance numeric(18, 2) not null default 0,
  total_spent_coin numeric(18, 2) not null default 0,
  total_received_coin numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_wallets_non_negative check (
    paid_coin_balance >= 0 and
    bonus_coin_balance >= 0 and
    locked_coin_balance >= 0 and
    total_spent_coin >= 0 and
    total_received_coin >= 0
  )
);

create table if not exists public.creator_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  pending_revenue_vnd numeric(18, 2) not null default 0,
  available_revenue_vnd numeric(18, 2) not null default 0,
  locked_revenue_vnd numeric(18, 2) not null default 0,
  total_earned_vnd numeric(18, 2) not null default 0,
  total_withdrawn_vnd numeric(18, 2) not null default 0,
  currency text not null default 'VND',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_wallets_non_negative check (
    pending_revenue_vnd >= 0 and
    available_revenue_vnd >= 0 and
    locked_revenue_vnd >= 0 and
    total_earned_vnd >= 0 and
    total_withdrawn_vnd >= 0
  )
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  creator_user_id uuid references public.profiles(id) on delete set null,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  type text not null check (
    type in (
      'coin_purchase',
      'bonus_coin_grant',
      'admin_coin_adjustment',
      'chapter_unlock',
      'story_unlock',
      'author_tip',
      'virtual_gift',
      'vip_subscription',
      'fan_club_subscription',
      'rewarded_ad_coin',
      'creator_revenue_share',
      'creator_bonus',
      'platform_fee',
      'refund',
      'payout_request',
      'payout_completed',
      'fraud_hold',
      'reversal'
    )
  ),
  direction text not null check (direction in ('credit', 'debit', 'transfer')),
  coin_amount numeric(18, 2),
  paid_coin_amount numeric(18, 2),
  bonus_coin_amount numeric(18, 2),
  money_amount_vnd numeric(18, 2),
  platform_fee_vnd numeric(18, 2),
  creator_gross_vnd numeric(18, 2),
  creator_net_vnd numeric(18, 2),
  currency text not null default 'VND',
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'failed', 'refunded', 'cancelled', 'reversed')
  ),
  source text not null check (
    source in ('system', 'payment', 'tip', 'unlock', 'vip', 'gift', 'admin', 'bonus', 'payout', 'refund')
  ),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_created
  on public.transactions(user_id, created_at desc);
create index if not exists idx_transactions_creator_created
  on public.transactions(creator_user_id, created_at desc);
create index if not exists idx_transactions_status
  on public.transactions(status);
create index if not exists idx_transactions_type
  on public.transactions(type);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_user_wallets_updated_at on public.user_wallets;
create trigger trg_touch_user_wallets_updated_at
before update on public.user_wallets
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_creator_wallets_updated_at on public.creator_wallets;
create trigger trg_touch_creator_wallets_updated_at
before update on public.creator_wallets
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_transactions_updated_at on public.transactions;
create trigger trg_touch_transactions_updated_at
before update on public.transactions
for each row
execute function public.touch_updated_at();

create or replace function public.ensure_user_wallet(input_user_id uuid)
returns public.user_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  wallet_row public.user_wallets;
begin
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
  from public.ensure_user_wallet(input_user_id);

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
      input_status, input_source, coalesce(input_metadata, '{}'::jsonb), input_currency
    )
    returning * into tx_row;
  end if;

  return tx_row;
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

grant execute on function public.ensure_user_wallet(uuid) to authenticated;
grant execute on function public.ensure_creator_wallet(uuid) to authenticated;
grant execute on function public.apply_user_coin_ledger(
  uuid, text, text, text, text, numeric, text, text, text, jsonb, uuid, uuid, uuid, text
) to authenticated;
grant execute on function public.apply_creator_revenue_ledger(
  uuid, text, text, text, numeric, text, text, jsonb, uuid, uuid, uuid, text
) to authenticated;

alter table public.user_wallets enable row level security;
alter table public.creator_wallets enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "User reads own wallet" on public.user_wallets;
create policy "User reads own wallet"
  on public.user_wallets for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "User writes own wallet restricted" on public.user_wallets;
create policy "User writes own wallet restricted"
  on public.user_wallets for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator reads own wallet" on public.creator_wallets;
create policy "Creator reads own wallet"
  on public.creator_wallets for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator wallet admin write" on public.creator_wallets;
create policy "Creator wallet admin write"
  on public.creator_wallets for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users read own transactions" on public.transactions;
create policy "Users read own transactions"
  on public.transactions for select
  using (
    auth.uid() = user_id
    or auth.uid() = creator_user_id
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users insert own transactions" on public.transactions;
create policy "Users insert own transactions"
  on public.transactions for insert
  with check (
    public.is_admin_or_founder(auth.uid())
    or auth.uid() = user_id
    or auth.uid() = creator_user_id
  );

drop policy if exists "Admin update transactions" on public.transactions;
create policy "Admin update transactions"
  on public.transactions for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));
