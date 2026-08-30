-- Migration 029: Coin packs + payment provider settings + checkout sessions

create table if not exists public.coin_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coin_amount numeric(18, 2) not null check (coin_amount > 0),
  bonus_coin_amount numeric(18, 2) not null default 0 check (bonus_coin_amount >= 0),
  price_vnd numeric(18, 2) not null check (price_vnd > 0),
  currency text not null default 'VND',
  is_active boolean not null default false,
  sort_order integer not null default 0,
  badge_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coin_packs_active_sort
  on public.coin_packs(is_active, sort_order asc, created_at desc);

create table if not exists public.payment_provider_settings (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique check (
    provider_key in (
      'mock_test',
      'vnpay',
      'momo',
      'zalopay',
      'vietqr',
      'app_store_iap',
      'google_play_billing'
    )
  ),
  enabled boolean not null default false,
  test_mode boolean not null default true,
  public_config jsonb default '{}'::jsonb,
  private_config_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coin_pack_id uuid not null references public.coin_packs(id) on delete restrict,
  provider text not null check (
    provider in (
      'mock_test',
      'vnpay',
      'momo',
      'zalopay',
      'vietqr',
      'app_store_iap',
      'google_play_billing'
    )
  ),
  status text not null default 'created' check (
    status in ('created', 'pending', 'paid', 'failed', 'expired', 'cancelled')
  ),
  amount_vnd numeric(18, 2) not null check (amount_vnd >= 0),
  coin_amount numeric(18, 2) not null check (coin_amount >= 0),
  bonus_coin_amount numeric(18, 2) not null default 0 check (bonus_coin_amount >= 0),
  payment_reference text,
  provider_payload jsonb default '{}'::jsonb,
  expires_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_checkout_sessions_user_created
  on public.checkout_sessions(user_id, created_at desc);
create index if not exists idx_checkout_sessions_status
  on public.checkout_sessions(status);
create unique index if not exists idx_checkout_sessions_payment_reference
  on public.checkout_sessions(payment_reference)
  where payment_reference is not null;

drop trigger if exists trg_touch_coin_packs_updated_at on public.coin_packs;
create trigger trg_touch_coin_packs_updated_at
before update on public.coin_packs
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_payment_provider_settings_updated_at on public.payment_provider_settings;
create trigger trg_touch_payment_provider_settings_updated_at
before update on public.payment_provider_settings
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_checkout_sessions_updated_at on public.checkout_sessions;
create trigger trg_touch_checkout_sessions_updated_at
before update on public.checkout_sessions
for each row execute function public.touch_updated_at();

alter table public.coin_packs enable row level security;
alter table public.payment_provider_settings enable row level security;
alter table public.checkout_sessions enable row level security;

drop policy if exists "Public read active coin packs" on public.coin_packs;
create policy "Public read active coin packs"
  on public.coin_packs for select
  using (is_active = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage coin packs" on public.coin_packs;
create policy "Admin manage coin packs"
  on public.coin_packs for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Read provider settings admin only" on public.payment_provider_settings;
create policy "Read provider settings admin only"
  on public.payment_provider_settings for select
  using (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Manage provider settings admin only" on public.payment_provider_settings;
create policy "Manage provider settings admin only"
  on public.payment_provider_settings for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "User read own checkout sessions" on public.checkout_sessions;
create policy "User read own checkout sessions"
  on public.checkout_sessions for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "User create own checkout sessions" on public.checkout_sessions;
create policy "User create own checkout sessions"
  on public.checkout_sessions for insert
  with check (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin update checkout sessions" on public.checkout_sessions;
create policy "Admin update checkout sessions"
  on public.checkout_sessions for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

insert into public.payment_provider_settings (provider_key, enabled, test_mode, public_config)
values
  ('mock_test', false, true, '{}'::jsonb),
  ('vnpay', false, true, '{}'::jsonb),
  ('momo', false, true, '{}'::jsonb),
  ('zalopay', false, true, '{}'::jsonb),
  ('vietqr', false, true, '{}'::jsonb),
  ('app_store_iap', false, true, '{}'::jsonb),
  ('google_play_billing', false, true, '{}'::jsonb)
on conflict (provider_key) do nothing;
