-- Migration 034: VIP plans and user subscriptions

create table if not exists public.vip_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_vnd numeric(18, 2) not null default 0,
  duration_days integer not null default 30,
  coin_bonus_amount numeric(18, 2) not null default 0,
  benefits jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.vip_plans(id) on delete restrict,
  status text not null check (status in ('active', 'expired', 'cancelled', 'pending')),
  started_at timestamptz,
  expires_at timestamptz,
  renewal_enabled boolean not null default false,
  provider text,
  provider_subscription_id text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vip_plans_active_sort
  on public.vip_plans(is_active, sort_order);
create index if not exists idx_user_subscriptions_user_created
  on public.user_subscriptions(user_id, created_at desc);
create index if not exists idx_user_subscriptions_user_status
  on public.user_subscriptions(user_id, status);

drop trigger if exists trg_touch_vip_plans_updated_at on public.vip_plans;
create trigger trg_touch_vip_plans_updated_at
before update on public.vip_plans
for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_user_subscriptions_updated_at on public.user_subscriptions;
create trigger trg_touch_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row execute function public.touch_updated_at();

alter table public.vip_plans enable row level security;
alter table public.user_subscriptions enable row level security;

drop policy if exists "Public read active vip plans" on public.vip_plans;
create policy "Public read active vip plans"
  on public.vip_plans for select
  using (is_active = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin write vip plans" on public.vip_plans;
create policy "Admin write vip plans"
  on public.vip_plans for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users read own subscriptions" on public.user_subscriptions;
create policy "Users read own subscriptions"
  on public.user_subscriptions for select
  using (user_id = auth.uid() or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users insert own subscriptions" on public.user_subscriptions;
create policy "Users insert own subscriptions"
  on public.user_subscriptions for insert
  with check (user_id = auth.uid() or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin update subscriptions" on public.user_subscriptions;
create policy "Admin update subscriptions"
  on public.user_subscriptions for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

insert into public.monetization_settings (key, value, description, is_public)
values
  ('vip_subscription.default_price_vnd', '49000'::jsonb, 'Gia mac dinh goi VIP.', false),
  ('vip_subscription.default_duration_days', '30'::jsonb, 'So ngay mac dinh cua VIP.', false),
  ('vip_subscription.default_coin_bonus_amount', '0'::jsonb, 'Coin bonus mac dinh cua VIP.', false),
  ('vip_subscription.mock_purchase_enabled', 'true'::jsonb, 'Cho phep mock purchase trong test mode.', false)
on conflict (key) do nothing;
