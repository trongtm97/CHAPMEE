-- Rollback story transfer / marketplace feature (migration 125)
-- Safe to run if 125 was applied. No-op for tables/columns that do not exist.

-- Revert transaction type enum (remove story_transfer_purchase)
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (
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
    'reversal',
    'sponsored_campaign_revenue'
  )
);

-- Drop story ownership FK on stories before dropping transfer table
alter table public.stories drop constraint if exists stories_last_transfer_id_fkey;

-- RLS policies
drop policy if exists story_sale_listings_select_active on public.story_sale_listings;
drop policy if exists story_sale_listings_insert_seller on public.story_sale_listings;
drop policy if exists story_sale_listings_update_seller on public.story_sale_listings;
drop policy if exists story_transfer_transactions_select_party on public.story_transfer_transactions;
drop policy if exists story_transfer_transactions_insert_buyer on public.story_transfer_transactions;
drop policy if exists story_transfer_snapshots_select on public.story_transfer_snapshots;
drop policy if exists story_ownership_history_select on public.story_ownership_history;
drop policy if exists story_transfer_audit_select on public.story_transfer_audit_logs;

-- Tables (child first)
drop table if exists public.story_transfer_audit_logs cascade;
drop table if exists public.story_ownership_history cascade;
drop table if exists public.story_transfer_snapshots cascade;
drop table if exists public.story_transfer_transactions cascade;
drop table if exists public.story_sale_listings cascade;

-- Stories columns added for transfer
alter table public.stories drop constraint if exists stories_ownership_status_check;
alter table public.stories
  drop column if exists original_author_id,
  drop column if exists current_owner_id,
  drop column if exists revenue_recipient_id,
  drop column if exists public_author_id,
  drop column if exists ownership_status,
  drop column if exists last_transferred_at,
  drop column if exists last_transfer_id,
  drop column if exists is_transfer_locked,
  drop column if exists received_via_transfer;

drop index if exists idx_stories_current_owner_id;
drop index if exists idx_stories_ownership_status;

-- Marketplace settings (orphaned keys; harmless if missing)
delete from public.monetization_settings
where key in (
  'marketplace.enabled',
  'marketplace.allow_story_transfer',
  'marketplace.fee_rate',
  'marketplace.minimum_sale_price_coin',
  'marketplace.escrow_hold_days'
);
