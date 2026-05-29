-- Migration 090: User coin ledger (append-only mirror of coin transactions)

create table if not exists public.user_coin_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  direction text not null check (direction in ('credit', 'debit')),
  coin_amount numeric(18, 2) not null check (coin_amount > 0),
  coin_type text not null default 'paid' check (
    coin_type in ('paid', 'bonus', 'promo', 'admin_grant')
  ),
  source_type text,
  source_id uuid,
  admin_id uuid references public.profiles(id) on delete set null,
  description text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint user_coin_ledger_type_check check (
    type in (
      'purchase',
      'spend_unlock_chapter',
      'spend_unlock_story',
      'tip_sent',
      'admin_grant',
      'admin_debit',
      'promo_bonus',
      'refund',
      'adjustment'
    )
  )
);

create unique index if not exists idx_user_coin_ledger_source_unique
  on public.user_coin_ledger (source_type, source_id)
  where source_id is not null;

create index if not exists idx_user_coin_ledger_user_created
  on public.user_coin_ledger (user_id, created_at desc);

create or replace function public.prevent_user_coin_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'user_coin_ledger is append-only';
end;
$$;

drop trigger if exists trg_user_coin_ledger_no_update on public.user_coin_ledger;
create trigger trg_user_coin_ledger_no_update
before update or delete on public.user_coin_ledger
for each row
execute function public.prevent_user_coin_ledger_mutation();

create or replace function public.map_transaction_to_coin_ledger_type(
  tx_type text,
  tx_direction text,
  tx_metadata jsonb
)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(tx_metadata->>'ledger_type'), '') is not null
      then trim(tx_metadata->>'ledger_type')
    when tx_type = 'coin_purchase' then 'purchase'
    when tx_type = 'chapter_unlock' then 'spend_unlock_chapter'
    when tx_type = 'story_unlock' then 'spend_unlock_story'
    when tx_type in ('author_tip', 'virtual_gift') then 'tip_sent'
    when tx_type = 'bonus_coin_grant' then 'promo_bonus'
    when tx_type = 'rewarded_ad_coin' then 'promo_bonus'
    when tx_type = 'refund' then 'refund'
    when tx_type = 'admin_coin_adjustment' and tx_direction = 'credit' then 'admin_grant'
    when tx_type = 'admin_coin_adjustment' and tx_direction = 'debit' then 'admin_debit'
    when tx_type = 'reversal' then 'adjustment'
    else 'adjustment'
  end;
$$;

create or replace function public.map_transaction_to_coin_ledger_coin_type(
  tx_paid numeric,
  tx_bonus numeric,
  tx_metadata jsonb
)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(tx_metadata->>'coin_type'), '') in ('paid', 'bonus', 'promo', 'admin_grant')
      then trim(tx_metadata->>'coin_type')
    when coalesce(tx_bonus, 0) > 0 and coalesce(tx_paid, 0) = 0 then 'bonus'
    when coalesce(tx_paid, 0) > 0 then 'paid'
    else 'bonus'
  end;
$$;

create or replace function public.sync_transaction_to_user_coin_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ledger_type text;
  ledger_coin_type text;
  ledger_description text;
  ledger_admin_id uuid;
begin
  if new.user_id is null then
    return new;
  end if;

  if coalesce(new.coin_amount, 0) <= 0 then
    return new;
  end if;

  if new.status is distinct from 'completed' then
    return new;
  end if;

  ledger_type := public.map_transaction_to_coin_ledger_type(
    new.type,
    new.direction,
    coalesce(new.metadata, '{}'::jsonb)
  );

  ledger_coin_type := public.map_transaction_to_coin_ledger_coin_type(
    new.paid_coin_amount,
    new.bonus_coin_amount,
    coalesce(new.metadata, '{}'::jsonb)
  );

  ledger_description := coalesce(
    nullif(trim(new.metadata->>'reason'), ''),
    nullif(trim(new.metadata->>'description'), ''),
    nullif(trim(new.metadata->>'admin_note'), ''),
    new.type
  );

  begin
    ledger_admin_id := (new.metadata->>'admin_id')::uuid;
  exception when others then
    ledger_admin_id := null;
  end;

  insert into public.user_coin_ledger (
    user_id,
    type,
    direction,
    coin_amount,
    coin_type,
    source_type,
    source_id,
    admin_id,
    description,
    metadata
  )
  values (
    new.user_id,
    ledger_type,
    new.direction,
    new.coin_amount,
    ledger_coin_type,
    'transaction',
    new.id,
    ledger_admin_id,
    ledger_description,
    coalesce(new.metadata, '{}'::jsonb)
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists trg_sync_user_coin_ledger on public.transactions;
create trigger trg_sync_user_coin_ledger
after insert on public.transactions
for each row
execute function public.sync_transaction_to_user_coin_ledger();

insert into public.user_coin_ledger (
  user_id,
  type,
  direction,
  coin_amount,
  coin_type,
  source_type,
  source_id,
  admin_id,
  description,
  metadata,
  created_at
)
select
  t.user_id,
  public.map_transaction_to_coin_ledger_type(t.type, t.direction, coalesce(t.metadata, '{}'::jsonb)),
  t.direction,
  t.coin_amount,
  public.map_transaction_to_coin_ledger_coin_type(
    t.paid_coin_amount,
    t.bonus_coin_amount,
    coalesce(t.metadata, '{}'::jsonb)
  ),
  'transaction',
  t.id,
  nullif(t.metadata->>'admin_id', '')::uuid,
  coalesce(
    nullif(trim(t.metadata->>'reason'), ''),
    nullif(trim(t.metadata->>'description'), ''),
    t.type
  ),
  coalesce(t.metadata, '{}'::jsonb),
  t.created_at
from public.transactions t
where t.user_id is not null
  and coalesce(t.coin_amount, 0) > 0
  and t.status = 'completed'
  and not exists (
    select 1
    from public.user_coin_ledger l
    where l.source_type = 'transaction'
      and l.source_id = t.id
  );

create or replace function public.get_user_coin_ledger_balance(input_user_id uuid)
returns table (
  total_credit numeric,
  total_debit numeric,
  balance numeric,
  paid_credit numeric,
  bonus_credit numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with sums as (
    select
      coalesce(sum(coin_amount) filter (where direction = 'credit'), 0) as credits,
      coalesce(sum(coin_amount) filter (where direction = 'debit'), 0) as debits,
      coalesce(sum(coin_amount) filter (where direction = 'credit' and coin_type = 'paid'), 0) as paid_c,
      coalesce(sum(coin_amount) filter (where direction = 'credit' and coin_type in ('bonus', 'promo', 'admin_grant')), 0) as bonus_c
    from public.user_coin_ledger
    where user_id = input_user_id
  )
  select credits, debits, credits - debits, paid_c, bonus_c from sums;
$$;

grant execute on function public.get_user_coin_ledger_balance(uuid) to authenticated;

alter table public.user_coin_ledger enable row level security;

drop policy if exists "Users read own coin ledger" on public.user_coin_ledger;
create policy "Users read own coin ledger"
  on public.user_coin_ledger for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.wallet.adjust')
  );

drop policy if exists "Finance staff insert coin ledger" on public.user_coin_ledger;
create policy "Finance staff insert coin ledger"
  on public.user_coin_ledger for insert
  to authenticated
  with check (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.wallet.adjust')
  );

insert into public.app_settings (key, value, is_public)
values ('admin.coin_grant_max_per_action', '10000'::jsonb, false)
on conflict (key) do nothing;
