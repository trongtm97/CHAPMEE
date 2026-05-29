-- Migration 087: Backfill creator_earning_transactions from historical creator revenue transactions

insert into public.creator_earning_transactions (
  creator_user_id,
  buyer_user_id,
  source_type,
  story_id,
  chapter_id,
  legacy_transaction_id,
  coin_amount,
  coin_to_vnd_rate,
  gross_amount_vnd,
  platform_fee_vnd,
  payment_processing_fee_vnd,
  tax_or_adjustment_vnd,
  creator_net_amount_vnd,
  creator_revenue_share_percent,
  calculation_snapshot,
  status,
  created_at
)
select
  t.creator_user_id,
  t.user_id,
  case
    when t.type = 'chapter_unlock' then 'chapter_unlock'
    when t.type = 'story_unlock' then 'story_unlock'
    when t.type in ('author_tip', 'virtual_gift') then 'tip'
    when t.type = 'creator_bonus' then 'bonus'
    else 'adjustment'
  end,
  t.story_id,
  t.chapter_id,
  t.id,
  t.coin_amount,
  case
    when coalesce(t.coin_amount, 0) > 0
      and coalesce(t.creator_gross_vnd, t.money_amount_vnd, 0) > 0
      then round(
        (coalesce(t.creator_gross_vnd, t.money_amount_vnd, 0) / t.coin_amount)::numeric,
        4
      )
    else null
  end,
  coalesce(t.creator_gross_vnd, t.money_amount_vnd, t.creator_net_vnd, 0),
  coalesce(t.platform_fee_vnd, 0),
  0,
  0,
  coalesce(t.creator_net_vnd, 0),
  case
    when coalesce(t.creator_gross_vnd, t.money_amount_vnd, 0) > 0
      then round(
        (
          coalesce(t.creator_net_vnd, 0)
          / nullif(coalesce(t.creator_gross_vnd, t.money_amount_vnd), 0)
        ) * 100,
        4
      )
    else nullif(trim(t.metadata->>'creatorPercent'), '')::numeric
  end,
  jsonb_build_object(
    'roundingRule', 'backfill_from_transactions',
    'grossAmountVnd', coalesce(t.creator_gross_vnd, t.money_amount_vnd, 0),
    'platformFeeVnd', coalesce(t.platform_fee_vnd, 0),
    'paymentProcessingFeeVnd', 0,
    'creatorNetAmountVnd', coalesce(t.creator_net_vnd, 0),
    'metadata', coalesce(t.metadata, '{}'::jsonb),
    'calculatedAt', t.created_at
  ),
  case when t.status = 'completed' then 'settled' else 'pending' end,
  t.created_at
from public.transactions t
where t.creator_user_id is not null
  and t.direction = 'credit'
  and t.type in (
    'chapter_unlock',
    'story_unlock',
    'author_tip',
    'virtual_gift',
    'creator_revenue_share',
    'creator_bonus'
  )
  and coalesce(t.creator_net_vnd, 0) > 0
  and not exists (
    select 1
    from public.creator_earning_transactions e
    where e.legacy_transaction_id = t.id
  );
