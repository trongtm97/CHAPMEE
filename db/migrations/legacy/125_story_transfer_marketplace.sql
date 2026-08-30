-- Story transfer marketplace: ownership fields, listings, transactions, audit

-- Extend transaction types for story transfer
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (
  type in (
    'coin_purchase',
    'bonus_coin_grant',
    'admin_coin_adjustment',
    'chapter_unlock',
    'story_unlock',
    'story_transfer_purchase',
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

-- Stories ownership columns
alter table public.stories
  add column if not exists original_author_id uuid references public.profiles(id) on delete set null,
  add column if not exists current_owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists revenue_recipient_id uuid references public.profiles(id) on delete set null,
  add column if not exists public_author_id uuid references public.profiles(id) on delete set null,
  add column if not exists ownership_status text not null default 'owned',
  add column if not exists last_transferred_at timestamptz,
  add column if not exists last_transfer_id uuid,
  add column if not exists is_transfer_locked boolean not null default false,
  add column if not exists received_via_transfer boolean not null default false;

alter table public.stories drop constraint if exists stories_ownership_status_check;
alter table public.stories add constraint stories_ownership_status_check check (
  ownership_status in (
    'owned',
    'listed_for_sale',
    'transfer_pending',
    'transferred',
    'locked_dispute'
  )
);

-- Backfill ownership from creator_profiles
update public.stories s
set
  original_author_id = coalesce(s.original_author_id, cp.user_id),
  current_owner_id = coalesce(s.current_owner_id, cp.user_id),
  revenue_recipient_id = coalesce(s.revenue_recipient_id, cp.user_id),
  public_author_id = coalesce(s.public_author_id, cp.user_id)
from public.creator_profiles cp
where cp.id = s.creator_id
  and (
    s.original_author_id is null
    or s.current_owner_id is null
    or s.revenue_recipient_id is null
    or s.public_author_id is null
  );

create index if not exists idx_stories_current_owner_id on public.stories(current_owner_id);
create index if not exists idx_stories_ownership_status on public.stories(ownership_status);

-- Sale listings
create table if not exists public.story_sale_listings (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  sale_type text not null default 'full_transfer',
  asking_price_amount numeric(18, 2) not null,
  currency text not null default 'COIN',
  allow_offer boolean not null default true,
  seller_note text,
  platform_fee_rate numeric(8, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint story_sale_listings_status_check check (
    status in ('draft', 'active', 'paused', 'sold', 'cancelled', 'rejected', 'locked')
  ),
  constraint story_sale_listings_sale_type_check check (sale_type in ('full_transfer')),
  constraint story_sale_listings_price_positive check (asking_price_amount > 0)
);

create unique index if not exists idx_story_sale_listings_one_active_per_story
  on public.story_sale_listings(story_id)
  where status in ('active', 'draft');

create index if not exists idx_story_sale_listings_seller on public.story_sale_listings(seller_id);
create index if not exists idx_story_sale_listings_status on public.story_sale_listings(status);

-- Transfer transactions
create table if not exists public.story_transfer_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.story_sale_listings(id) on delete set null,
  story_id uuid not null references public.stories(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending_buyer_payment',
  sale_price_amount numeric(18, 2) not null,
  currency text not null default 'COIN',
  platform_fee_amount numeric(18, 2) not null default 0,
  seller_receive_amount numeric(18, 2) not null default 0,
  escrow_transaction_id uuid references public.transactions(id) on delete set null,
  seller_confirmed_at timestamptz,
  buyer_paid_at timestamptz,
  transfer_completed_at timestamptz,
  cancelled_at timestamptz,
  dispute_opened_at timestamptz,
  admin_note text,
  buyer_note text,
  seller_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_transfer_transactions_status_check check (
    status in (
      'pending_seller_accept',
      'pending_buyer_payment',
      'escrow_paid',
      'transfer_completed',
      'cancelled',
      'rejected',
      'disputed',
      'refunded',
      'admin_reversed'
    )
  ),
  constraint story_transfer_transactions_price_positive check (sale_price_amount > 0),
  constraint story_transfer_no_self_purchase check (seller_id <> buyer_id)
);

create index if not exists idx_story_transfer_transactions_story on public.story_transfer_transactions(story_id);
create index if not exists idx_story_transfer_transactions_seller on public.story_transfer_transactions(seller_id);
create index if not exists idx_story_transfer_transactions_buyer on public.story_transfer_transactions(buyer_id);
create index if not exists idx_story_transfer_transactions_status on public.story_transfer_transactions(status);

-- Snapshots
create table if not exists public.story_transfer_snapshots (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.story_transfer_transactions(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  snapshot_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_story_transfer_snapshots_transfer
  on public.story_transfer_snapshots(transfer_id);

-- Ownership history
create table if not exists public.story_ownership_history (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  from_owner_id uuid references public.profiles(id) on delete set null,
  to_owner_id uuid not null references public.profiles(id) on delete cascade,
  transfer_id uuid references public.story_transfer_transactions(id) on delete set null,
  transfer_type text not null default 'full_transfer',
  effective_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_ownership_history_story on public.story_ownership_history(story_id);

-- Transfer audit log (user + system actions)
create table if not exists public.story_transfer_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_transfer_audit_target
  on public.story_transfer_audit_logs(target_type, target_id);

alter table public.stories
  add constraint stories_last_transfer_id_fkey
  foreign key (last_transfer_id) references public.story_transfer_transactions(id) on delete set null;

-- Marketplace monetization settings
insert into public.monetization_settings (key, value, description, is_public)
values
  ('marketplace.enabled', 'true'::jsonb, 'Bat cho phep mua ban chuyen nhuong truyen.', true),
  ('marketplace.allow_story_transfer', 'true'::jsonb, 'Cho phep chuyen nhuong truyen.', true),
  ('marketplace.fee_rate', '0.1'::jsonb, 'Phi nen tang (0.1 = 10%).', false),
  ('marketplace.minimum_sale_price_coin', '100'::jsonb, 'Gia ban toi thieu (coin).', true),
  ('marketplace.escrow_hold_days', '0'::jsonb, 'So ngay giu tien truoc khi seller nhan (0 = ngay).', false)
on conflict (key) do nothing;

-- RLS
alter table public.story_sale_listings enable row level security;
alter table public.story_transfer_transactions enable row level security;
alter table public.story_transfer_snapshots enable row level security;
alter table public.story_ownership_history enable row level security;
alter table public.story_transfer_audit_logs enable row level security;

-- Listings: public read active, seller manage own
create policy story_sale_listings_select_active on public.story_sale_listings
  for select using (status = 'active' or seller_id = auth.uid());

create policy story_sale_listings_insert_seller on public.story_sale_listings
  for insert with check (seller_id = auth.uid());

create policy story_sale_listings_update_seller on public.story_sale_listings
  for update using (seller_id = auth.uid());

-- Transactions: parties only
create policy story_transfer_transactions_select_party on public.story_transfer_transactions
  for select using (seller_id = auth.uid() or buyer_id = auth.uid());

create policy story_transfer_transactions_insert_buyer on public.story_transfer_transactions
  for insert with check (buyer_id = auth.uid());

-- Snapshots: via transfer party
create policy story_transfer_snapshots_select on public.story_transfer_snapshots
  for select using (
    exists (
      select 1 from public.story_transfer_transactions t
      where t.id = transfer_id
        and (t.seller_id = auth.uid() or t.buyer_id = auth.uid())
    )
  );

-- Ownership history: owner of story or past owner
create policy story_ownership_history_select on public.story_ownership_history
  for select using (
    from_owner_id = auth.uid()
    or to_owner_id = auth.uid()
    or exists (
      select 1 from public.stories s
      where s.id = story_id and s.current_owner_id = auth.uid()
    )
  );

-- Audit: actor sees own
create policy story_transfer_audit_select on public.story_transfer_audit_logs
  for select using (actor_id = auth.uid());
