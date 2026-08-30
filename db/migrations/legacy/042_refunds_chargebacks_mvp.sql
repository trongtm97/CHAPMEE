create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  original_transaction_id uuid not null references public.transactions(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  amount_vnd numeric(18, 2),
  coin_amount numeric(18, 2),
  reason text,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'processed', 'failed')),
  provider text,
  provider_reference text,
  created_by uuid references public.profiles(id) on delete set null,
  processed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create table public.chargebacks (
  id uuid primary key default gen_random_uuid(),
  original_transaction_id uuid not null references public.transactions(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  amount_vnd numeric(18, 2) not null,
  provider text not null,
  provider_reference text,
  status text not null default 'opened' check (status in ('opened', 'under_review', 'won', 'lost', 'accepted', 'closed')),
  received_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb default '{}'::jsonb
);

create unique index refunds_unique_processed_original_idx
  on public.refunds(original_transaction_id)
  where status in ('processed', 'approved');

create index refunds_status_created_idx on public.refunds(status, created_at desc);
create index chargebacks_status_received_idx on public.chargebacks(status, received_at desc);
create index chargebacks_original_tx_idx on public.chargebacks(original_transaction_id);

alter table public.refunds enable row level security;
alter table public.chargebacks enable row level security;

create policy "Admin manage refunds"
  on public.refunds for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

create policy "Admin manage chargebacks"
  on public.chargebacks for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

alter table public.transactions
  drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check check (
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

alter table public.transactions
  drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check check (
    source in ('system', 'payment', 'tip', 'unlock', 'vip', 'gift', 'admin', 'bonus', 'payout', 'refund', 'sponsor')
  );
