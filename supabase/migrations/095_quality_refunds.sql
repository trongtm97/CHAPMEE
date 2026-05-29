-- Migration 095: Quality content monetization + coin refund batches

alter type public.notification_type add value if not exists 'content_quality_free_access';
alter type public.notification_type add value if not exists 'coin_refund_quality';

-- ---------------------------------------------------------------------------
-- Story monetization status
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists monetization_status text not null default 'paid',
  add column if not exists free_access_reason text,
  add column if not exists free_access_set_by uuid references public.profiles(id) on delete set null,
  add column if not exists free_access_set_at timestamptz,
  add column if not exists monetization_disabled_reason text,
  add column if not exists monetization_disabled_at timestamptz,
  add column if not exists monetization_disabled_by uuid references public.profiles(id) on delete set null;

alter table public.stories
  drop constraint if exists stories_monetization_status_check;

alter table public.stories
  add constraint stories_monetization_status_check check (
    monetization_status in (
      'paid',
      'free',
      'disabled',
      'free_due_to_quality',
      'disabled_due_to_quality'
    )
  );

update public.stories
set monetization_status = 'disabled_due_to_quality'
where monetization_disabled_by_quality = true
  and monetization_status = 'paid';

-- ---------------------------------------------------------------------------
-- Chapter unlock refund tracking
-- ---------------------------------------------------------------------------
alter table public.chapter_unlocks
  add column if not exists refund_status text not null default 'none',
  add column if not exists refunded_coin_amount numeric(18, 2) not null default 0,
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_batch_id uuid;

alter table public.chapter_unlocks
  drop constraint if exists chapter_unlocks_refund_status_check;

alter table public.chapter_unlocks
  add constraint chapter_unlocks_refund_status_check check (
    refund_status in ('none', 'partially_refunded', 'fully_refunded')
  );

-- ---------------------------------------------------------------------------
-- Coin refund batches & items
-- ---------------------------------------------------------------------------
create table if not exists public.coin_refund_batches (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('story', 'chapter')),
  target_id uuid not null,
  quality_case_id uuid,
  refund_scope text not null,
  refund_percent numeric(8, 4),
  refund_fixed_amount numeric(18, 2),
  purchase_scope text not null default 'chapter_only',
  date_from timestamptz,
  date_to timestamptz,
  total_users int not null default 0,
  total_transactions int not null default 0,
  total_coin_refunded numeric(18, 2) not null default 0,
  total_paid_coin_refunded numeric(18, 2) not null default 0,
  total_bonus_coin_refunded numeric(18, 2) not null default 0,
  status text not null default 'preview' check (
    status in (
      'preview',
      'pending',
      'processing',
      'completed',
      'partial_failed',
      'failed',
      'cancelled'
    )
  ),
  reason_code text not null,
  admin_note text,
  author_note text,
  created_by uuid references public.profiles(id) on delete set null,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coin_refund_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.coin_refund_batches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  original_transaction_id uuid references public.transactions(id) on delete set null,
  unlock_id uuid references public.chapter_unlocks(id) on delete set null,
  original_coin_amount numeric(18, 2) not null,
  refund_coin_amount numeric(18, 2) not null,
  refund_paid_coin_amount numeric(18, 2) not null default 0,
  refund_bonus_coin_amount numeric(18, 2) not null default 0,
  coin_type text,
  status text not null default 'pending' check (
    status in ('pending', 'completed', 'failed', 'skipped')
  ),
  ledger_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  constraint coin_refund_items_batch_user_tx_unique unique (batch_id, user_id, original_transaction_id)
);

create unique index if not exists idx_coin_refund_items_tx_completed_unique
  on public.coin_refund_items (original_transaction_id)
  where status = 'completed' and original_transaction_id is not null;

create index if not exists idx_coin_refund_batches_target
  on public.coin_refund_batches (target_type, target_id, created_at desc);

create index if not exists idx_coin_refund_items_batch
  on public.coin_refund_items (batch_id, status);

alter table public.chapter_unlocks
  drop constraint if exists chapter_unlocks_refund_batch_fk;

alter table public.chapter_unlocks
  add constraint chapter_unlocks_refund_batch_fk
  foreign key (refund_batch_id) references public.coin_refund_batches(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Extend content quality review actions
-- ---------------------------------------------------------------------------
alter table public.content_quality_reviews
  drop constraint if exists content_quality_reviews_action_check;

alter table public.content_quality_reviews
  add constraint content_quality_reviews_action_check check (
    action_taken is null
    or action_taken in (
      'warning_only',
      'hidden_temporarily',
      'restored',
      'resubmitted',
      'permanently_hidden',
      'monetization_disabled',
      'set_free_due_to_quality',
      'coin_refund_confirmed',
      'paid_restored'
    )
  );

-- ---------------------------------------------------------------------------
-- Admin settings
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, is_public)
values (
  'quality_refund_requires_confirm_over_coin_amount',
  '100000'::jsonb,
  false
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.coin_refund_batches enable row level security;
alter table public.coin_refund_items enable row level security;

drop policy if exists "Finance staff manage refund batches" on public.coin_refund_batches;
create policy "Finance staff manage refund batches"
  on public.coin_refund_batches for all
  to authenticated
  using (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.refund.create')
    or public.is_admin_or_founder(auth.uid())
  )
  with check (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.refund.create')
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Finance staff manage refund items" on public.coin_refund_items;
create policy "Finance staff manage refund items"
  on public.coin_refund_items for all
  to authenticated
  using (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.refund.create')
    or public.is_admin_or_founder(auth.uid())
  )
  with check (
    public.is_finance_staff(auth.uid())
    or public.user_has_permission(auth.uid(), 'finance.refund.create')
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users read own refund items" on public.coin_refund_items;
create policy "Users read own refund items"
  on public.coin_refund_items for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Creators read refund batches for their stories" on public.coin_refund_batches;
create policy "Creators read refund batches for their stories"
  on public.coin_refund_batches for select
  to authenticated
  using (
    exists (
      select 1
      from public.stories s
      join public.creator_profiles cp on cp.id = s.creator_id
      where cp.user_id = auth.uid()
        and (
          (target_type = 'story' and target_id = s.id)
          or (target_type = 'chapter' and s.id in (
            select e.story_id from public.episodes e where e.id = target_id
          ))
        )
    )
  );

drop trigger if exists trg_coin_refund_batches_updated_at on public.coin_refund_batches;
create trigger trg_coin_refund_batches_updated_at
before update on public.coin_refund_batches
for each row execute function public.touch_updated_at();
