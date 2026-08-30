-- Migration 084: Backfill creator_wallet_ledger from historical transactions (idempotent)

create unique index if not exists idx_creator_wallet_ledger_transaction_unique
  on public.creator_wallet_ledger (transaction_id)
  where transaction_id is not null;

create or replace function public.map_transaction_to_ledger_type(
  p_type text,
  p_source text,
  p_chapter_id uuid,
  p_story_id uuid
)
returns text
language plpgsql
immutable
as $$
begin
  if p_type = 'creator_bonus' then
    return 'bonus';
  end if;

  if p_type in ('reversal', 'admin_coin_adjustment', 'refund') then
    return 'adjustment';
  end if;

  if p_type = 'payout_request' then
    return 'withdrawal_hold';
  end if;

  if p_type = 'payout_completed' then
    return 'withdrawal_paid';
  end if;

  if p_type = 'fraud_hold' then
    return 'penalty_hold';
  end if;

  if p_type = 'creator_revenue_share' then
    if p_source in ('tip', 'gift') then
      return 'tip_revenue';
    end if;
    if p_chapter_id is not null then
      return 'chapter_unlock_revenue';
    end if;
    if p_story_id is not null then
      return 'story_unlock_revenue';
    end if;
    if p_source = 'unlock' then
      return 'chapter_unlock_revenue';
    end if;
    return 'adjustment';
  end if;

  return null;
end;
$$;

create or replace function public.transaction_ledger_amount_vnd(
  p_creator_net numeric,
  p_net numeric,
  p_money numeric,
  p_gross numeric
)
returns numeric
language sql
immutable
as $$
  select coalesce(
    nullif(abs(p_creator_net), 0),
    nullif(abs(p_net), 0),
    nullif(abs(p_money), 0),
    nullif(abs(p_gross), 0),
    0::numeric
  );
$$;

create or replace function public.transaction_ledger_direction(
  p_type text,
  p_direction text
)
returns text
language plpgsql
immutable
as $$
begin
  if p_type in ('payout_request', 'payout_completed', 'fraud_hold') then
    return 'debit';
  end if;

  if p_type in ('reversal', 'refund') and p_direction = 'debit' then
    return 'debit';
  end if;

  if p_direction in ('credit', 'debit') then
    return p_direction;
  end if;

  return 'credit';
end;
$$;

create or replace function public.backfill_creator_wallet_ledger_from_transactions()
returns table(
  inserted_count bigint,
  skipped_existing bigint,
  skipped_unmapped bigint,
  skipped_zero_amount bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted bigint := 0;
  v_skipped_existing bigint := 0;
  v_skipped_unmapped bigint := 0;
  v_skipped_zero bigint := 0;
begin
  with candidates as (
    select
      t.id as transaction_id,
      t.creator_user_id,
      t.type as tx_type,
      t.source as tx_source,
      t.direction as tx_direction,
      t.status as tx_status,
      t.story_id,
      t.chapter_id,
      t.coin_amount,
      t.created_at,
      public.map_transaction_to_ledger_type(t.type, t.source, t.chapter_id, t.story_id) as ledger_type,
      public.transaction_ledger_amount_vnd(
        t.creator_net_vnd,
        t.net_amount_vnd,
        t.money_amount_vnd,
        t.creator_gross_vnd
      ) as amount_vnd,
      public.transaction_ledger_direction(t.type, t.direction) as ledger_direction,
      pr.id as payout_request_id
    from public.transactions t
    left join public.payout_requests pr on pr.transaction_id = t.id
    where t.creator_user_id is not null
      and t.status in ('completed', 'pending')
      and t.type in (
        'creator_revenue_share',
        'creator_bonus',
        'payout_request',
        'payout_completed',
        'reversal',
        'refund',
        'admin_coin_adjustment',
        'fraud_hold'
      )
  ),
  to_insert as (
    select
      c.*
    from candidates c
    where c.ledger_type is not null
      and c.amount_vnd > 0
      and not exists (
        select 1
        from public.creator_wallet_ledger l
        where l.transaction_id = c.transaction_id
      )
  )
  insert into public.creator_wallet_ledger (
    creator_user_id,
    type,
    amount_vnd,
    amount_coin,
    direction,
    source_type,
    source_id,
    story_id,
    chapter_id,
    withdrawal_request_id,
    transaction_id,
    description,
    metadata,
    created_at
  )
  select
    ti.creator_user_id,
    ti.ledger_type,
    ti.amount_vnd,
    nullif(abs(ti.coin_amount), 0),
    ti.ledger_direction,
    'transaction',
    ti.transaction_id,
    ti.story_id,
    ti.chapter_id,
    ti.payout_request_id,
    ti.transaction_id,
    case ti.ledger_type
      when 'chapter_unlock_revenue' then 'Backfill: doanh thu mở khóa chương'
      when 'story_unlock_revenue' then 'Backfill: doanh thu mở khóa truyện'
      when 'tip_revenue' then 'Backfill: tip / quà ảo'
      when 'bonus' then 'Backfill: bonus tác giả'
      when 'adjustment' then 'Backfill: điều chỉnh / hoàn'
      when 'withdrawal_hold' then 'Backfill: giữ số dư rút tiền'
      when 'withdrawal_paid' then 'Backfill: đã thanh toán rút'
      when 'penalty_hold' then 'Backfill: giữ do rủi ro'
      else 'Backfill từ transactions'
    end,
    jsonb_build_object(
      'backfill', true,
      'backfill_migration', '084',
      'original_tx_type', ti.tx_type,
      'original_tx_source', ti.tx_source,
      'original_tx_status', ti.tx_status
    ),
    ti.created_at
  from to_insert ti;

  get diagnostics v_inserted = row_count;

  select count(*)::bigint
  into v_skipped_existing
  from public.transactions t
  where t.creator_user_id is not null
    and exists (
      select 1 from public.creator_wallet_ledger l where l.transaction_id = t.id
    );

  select count(*)::bigint
  into v_skipped_unmapped
  from public.transactions t
  where t.creator_user_id is not null
    and t.status in ('completed', 'pending')
    and public.map_transaction_to_ledger_type(t.type, t.source, t.chapter_id, t.story_id) is null
    and t.type in (
      'creator_revenue_share',
      'creator_bonus',
      'payout_request',
      'payout_completed',
      'reversal',
      'refund',
      'admin_coin_adjustment',
      'fraud_hold'
    );

  select count(*)::bigint
  into v_skipped_zero
  from public.transactions t
  where t.creator_user_id is not null
    and t.status in ('completed', 'pending')
    and public.map_transaction_to_ledger_type(t.type, t.source, t.chapter_id, t.story_id) is not null
    and public.transaction_ledger_amount_vnd(
      t.creator_net_vnd,
      t.net_amount_vnd,
      t.money_amount_vnd,
      t.creator_gross_vnd
    ) <= 0
    and not exists (
      select 1 from public.creator_wallet_ledger l where l.transaction_id = t.id
    );

  return query
  select v_inserted, v_skipped_existing, v_skipped_unmapped, v_skipped_zero;
end;
$$;

comment on function public.backfill_creator_wallet_ledger_from_transactions() is
  'One-shot idempotent backfill of creator_wallet_ledger from transactions. Safe to re-run.';

-- Run backfill when migration applies (no-op if nothing to insert)
select *
from public.backfill_creator_wallet_ledger_from_transactions();

-- Payout requests rejected/failed/cancelled after hold: add refund ledger if hold exists without refund
insert into public.creator_wallet_ledger (
  creator_user_id,
  type,
  amount_vnd,
  direction,
  source_type,
  source_id,
  withdrawal_request_id,
  transaction_id,
  description,
  metadata,
  created_at
)
select
  pr.creator_user_id,
  'withdrawal_refund',
  pr.amount_vnd,
  'credit',
  'payout_request',
  pr.id,
  pr.id,
  pr.transaction_id,
  'Backfill: hoàn giữ — yêu cầu rút kết thúc (từ chối/hủy/thất bại)',
  jsonb_build_object(
    'backfill', true,
    'backfill_migration', '084',
    'payout_status', pr.status
  ),
  coalesce(pr.reviewed_at, pr.updated_at, pr.requested_at)
from public.payout_requests pr
where pr.status in ('rejected', 'cancelled', 'failed')
  and pr.amount_vnd > 0
  and exists (
    select 1
    from public.creator_wallet_ledger h
    where h.withdrawal_request_id = pr.id
      and h.type = 'withdrawal_hold'
  )
  and not exists (
    select 1
    from public.creator_wallet_ledger r
    where r.withdrawal_request_id = pr.id
      and r.type = 'withdrawal_refund'
  );

-- Completed payouts: mark withdrawal_paid if hold exists but paid entry missing
insert into public.creator_wallet_ledger (
  creator_user_id,
  type,
  amount_vnd,
  direction,
  source_type,
  source_id,
  withdrawal_request_id,
  transaction_id,
  description,
  metadata,
  created_at
)
select
  pr.creator_user_id,
  'withdrawal_paid',
  pr.amount_vnd,
  'debit',
  'payout_request',
  pr.id,
  pr.id,
  pr.transaction_id,
  'Backfill: đã thanh toán rút (admin xác nhận)',
  jsonb_build_object(
    'backfill', true,
    'backfill_migration', '084',
    'payout_status', pr.status
  ),
  coalesce(pr.completed_at, pr.reviewed_at, pr.updated_at)
from public.payout_requests pr
where pr.status = 'completed'
  and pr.amount_vnd > 0
  and exists (
    select 1
    from public.creator_wallet_ledger h
    where h.withdrawal_request_id = pr.id
      and h.type = 'withdrawal_hold'
  )
  and not exists (
    select 1
    from public.creator_wallet_ledger p
    where p.withdrawal_request_id = pr.id
      and p.type = 'withdrawal_paid'
  );
