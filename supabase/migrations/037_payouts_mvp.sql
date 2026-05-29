-- Migration 037: Payout MVP (manual flow only, no real transfer provider)

create table if not exists public.creator_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('bank_transfer', 'momo', 'zalopay', 'manual')),
  account_holder_name text,
  bank_name text,
  bank_account_number_masked text,
  wallet_phone_masked text,
  metadata jsonb default '{}'::jsonb,
  is_default boolean not null default false,
  verification_status text not null default 'unverified' check (
    verification_status in ('unverified', 'pending', 'verified', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  amount_vnd numeric(18, 2) not null check (amount_vnd > 0),
  method text not null check (method in ('bank_transfer', 'momo', 'zalopay', 'manual')),
  status text not null check (
    status in ('requested', 'under_review', 'approved', 'processing', 'completed', 'rejected', 'cancelled', 'failed')
  ),
  payout_account_snapshot jsonb,
  admin_note text,
  reject_reason text,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  completed_at timestamptz,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_revenue_release_logs (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  source_transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  released_amount_vnd numeric(18, 2) not null check (released_amount_vnd > 0),
  released_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_payout_requests_creator_created
  on public.payout_requests(creator_user_id, created_at desc);
create index if not exists idx_payout_requests_status_created
  on public.payout_requests(status, created_at desc);
create index if not exists idx_creator_payout_accounts_creator
  on public.creator_payout_accounts(creator_user_id, created_at desc);
create index if not exists idx_creator_revenue_release_logs_creator
  on public.creator_revenue_release_logs(creator_user_id, released_at desc);

drop trigger if exists trg_touch_creator_payout_accounts_updated_at on public.creator_payout_accounts;
create trigger trg_touch_creator_payout_accounts_updated_at
before update on public.creator_payout_accounts
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_payout_requests_updated_at on public.payout_requests;
create trigger trg_touch_payout_requests_updated_at
before update on public.payout_requests
for each row
execute function public.touch_updated_at();

alter table public.creator_payout_accounts enable row level security;
alter table public.payout_requests enable row level security;
alter table public.creator_revenue_release_logs enable row level security;

drop policy if exists "Creators read own payout accounts" on public.creator_payout_accounts;
create policy "Creators read own payout accounts"
  on public.creator_payout_accounts for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators write own payout accounts" on public.creator_payout_accounts;
create policy "Creators write own payout accounts"
  on public.creator_payout_accounts for all
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()))
  with check (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators read own payout requests" on public.payout_requests;
create policy "Creators read own payout requests"
  on public.payout_requests for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators insert own payout requests" on public.payout_requests;
create policy "Creators insert own payout requests"
  on public.payout_requests for insert
  with check (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin update payout requests" on public.payout_requests;
create policy "Admin update payout requests"
  on public.payout_requests for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator release logs read owner/admin" on public.creator_revenue_release_logs;
create policy "Creator release logs read owner/admin"
  on public.creator_revenue_release_logs for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manages release logs" on public.creator_revenue_release_logs;
create policy "Admin manages release logs"
  on public.creator_revenue_release_logs for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

insert into public.monetization_settings (key, value, description, is_public)
values
  ('payout.allowed_methods', '"manual"'::jsonb, 'Danh sach payout method cho phep.', false),
  ('payout.processing_note', '""'::jsonb, 'Ghi chu payout hien thi trong UI.', false)
on conflict (key) do nothing;
