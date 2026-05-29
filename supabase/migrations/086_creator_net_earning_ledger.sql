-- Migration 086: Creator earning transactions (gross/fee/net snapshot) + NET wallet ledger credits

create table if not exists public.creator_earning_transactions (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  buyer_user_id uuid references public.profiles(id) on delete set null,
  source_type text not null check (
    source_type in ('chapter_unlock', 'story_unlock', 'tip', 'bonus', 'adjustment')
  ),
  source_id uuid,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  legacy_transaction_id uuid references public.transactions(id) on delete set null,
  coin_amount numeric(18, 2),
  coin_to_vnd_rate numeric(18, 4),
  gross_amount_vnd numeric(18, 2) not null check (gross_amount_vnd >= 0),
  platform_fee_vnd numeric(18, 2) not null default 0 check (platform_fee_vnd >= 0),
  payment_processing_fee_vnd numeric(18, 2) not null default 0 check (payment_processing_fee_vnd >= 0),
  tax_or_adjustment_vnd numeric(18, 2) not null default 0 check (tax_or_adjustment_vnd >= 0),
  creator_net_amount_vnd numeric(18, 2) not null check (creator_net_amount_vnd >= 0),
  platform_fee_percent numeric(8, 4),
  creator_revenue_share_percent numeric(8, 4),
  payment_processing_fee_percent numeric(8, 4),
  calculation_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'settled' check (
    status in ('pending', 'settled', 'reversed', 'refunded', 'under_review')
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_earning_tx_creator_created
  on public.creator_earning_transactions(creator_user_id, created_at desc);
create index if not exists idx_creator_earning_tx_story
  on public.creator_earning_transactions(story_id, created_at desc)
  where story_id is not null;

alter table public.creator_wallet_ledger
  add column if not exists earning_transaction_id uuid references public.creator_earning_transactions(id) on delete set null,
  add column if not exists balance_type text not null default 'available';

alter table public.creator_wallet_ledger
  drop constraint if exists creator_wallet_ledger_type_check;

alter table public.creator_wallet_ledger
  add constraint creator_wallet_ledger_type_check check (
    type in (
      'chapter_unlock_revenue',
      'story_unlock_revenue',
      'tip_revenue',
      'bonus',
      'adjustment',
      'earning_net_credit',
      'withdrawal_hold',
      'withdrawal_paid',
      'withdrawal_refund',
      'adjustment_credit',
      'adjustment_debit',
      'penalty_hold',
      'penalty_release'
    )
  );

alter table public.creator_earning_transactions enable row level security;

drop policy if exists "Creators read own earning transactions" on public.creator_earning_transactions;
create policy "Creators read own earning transactions"
  on public.creator_earning_transactions for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Service insert earning transactions" on public.creator_earning_transactions;
create policy "Service insert earning transactions"
  on public.creator_earning_transactions for insert
  with check (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

insert into public.monetization_settings (key, value, description, is_public)
values
  ('finance.payment_processing_fee_percent', '0'::jsonb, 'Phi xu ly thanh toan % tren gross (bo sung channel fee).', false),
  ('finance.payment_processing_fixed_fee_vnd', '0'::jsonb, 'Phi xu ly co dinh VND.', false),
  ('finance.tax_percent', '0'::jsonb, 'Thue/dieu chinh % (MVP 0).', false),
  ('payout.withdrawal_fee_enabled', 'false'::jsonb, 'Bat phi rut tien rieng.', false),
  ('payout.withdrawal_fee_percent', '0'::jsonb, 'Phi rut %.', false),
  ('payout.withdrawal_fee_fixed_vnd', '0'::jsonb, 'Phi rut co dinh VND.', false)
on conflict (key) do nothing;
