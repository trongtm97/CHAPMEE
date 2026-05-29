-- Migration 083: ChapMee Studio creator finance (immutable ledger, withdrawal PIN, security logs)

create table if not exists public.creator_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in (
      'chapter_unlock_revenue',
      'story_unlock_revenue',
      'tip_revenue',
      'bonus',
      'adjustment',
      'withdrawal_hold',
      'withdrawal_paid',
      'withdrawal_refund',
      'penalty_hold',
      'penalty_release'
    )
  ),
  amount_vnd numeric(18, 2) not null check (amount_vnd >= 0),
  amount_coin numeric(18, 2),
  direction text not null check (direction in ('credit', 'debit')),
  source_type text,
  source_id uuid,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  withdrawal_request_id uuid references public.payout_requests(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_wallet_ledger_creator_created
  on public.creator_wallet_ledger(creator_user_id, created_at desc);
create index if not exists idx_creator_wallet_ledger_withdrawal
  on public.creator_wallet_ledger(withdrawal_request_id)
  where withdrawal_request_id is not null;
create index if not exists idx_creator_wallet_ledger_transaction
  on public.creator_wallet_ledger(transaction_id)
  where transaction_id is not null;

create or replace function public.prevent_creator_wallet_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'creator_wallet_ledger is append-only';
end;
$$;

drop trigger if exists trg_creator_wallet_ledger_no_update on public.creator_wallet_ledger;
create trigger trg_creator_wallet_ledger_no_update
before update or delete on public.creator_wallet_ledger
for each row
execute function public.prevent_creator_wallet_ledger_mutation();

create table if not exists public.creator_withdrawal_security (
  creator_user_id uuid primary key references public.profiles(id) on delete cascade,
  pin_hash text,
  pin_set_at timestamptz,
  failed_attempts int not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_touch_creator_withdrawal_security_updated_at on public.creator_withdrawal_security;
create trigger trg_touch_creator_withdrawal_security_updated_at
before update on public.creator_withdrawal_security
for each row
execute function public.touch_updated_at();

create table if not exists public.creator_finance_security_logs (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'withdrawal_pin_set',
      'withdrawal_pin_changed',
      'withdrawal_pin_failed',
      'payout_profile_created',
      'payout_profile_changed',
      'withdrawal_requested',
      'withdrawal_canceled'
    )
  ),
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_finance_security_logs_creator_created
  on public.creator_finance_security_logs(creator_user_id, created_at desc);

alter table public.payout_requests
  add column if not exists creator_note text;

alter table public.creator_wallet_ledger enable row level security;
alter table public.creator_withdrawal_security enable row level security;
alter table public.creator_finance_security_logs enable row level security;

drop policy if exists "Creators read own wallet ledger" on public.creator_wallet_ledger;
create policy "Creators read own wallet ledger"
  on public.creator_wallet_ledger for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Service insert wallet ledger" on public.creator_wallet_ledger;
create policy "Service insert wallet ledger"
  on public.creator_wallet_ledger for insert
  with check (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators manage own withdrawal security" on public.creator_withdrawal_security;
create policy "Creators manage own withdrawal security"
  on public.creator_withdrawal_security for all
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()))
  with check (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators read own finance security logs" on public.creator_finance_security_logs;
create policy "Creators read own finance security logs"
  on public.creator_finance_security_logs for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators insert own finance security logs" on public.creator_finance_security_logs;
create policy "Creators insert own finance security logs"
  on public.creator_finance_security_logs for insert
  with check (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

insert into public.monetization_settings (key, value, description, is_public)
values
  ('payout.withdrawal_pin_required', 'true'::jsonb, 'Yeu cau ma PIN khi rut tien.', false),
  ('payout.processing_days', '7'::jsonb, 'So ngay xu ly rut tien hien thi cho tac gia.', true)
on conflict (key) do nothing;
