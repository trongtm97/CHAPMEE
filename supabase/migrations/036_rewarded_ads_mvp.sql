-- Migration 036: Rewarded ads MVP sessions + config defaults

create table if not exists public.rewarded_ad_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'mock',
  status text not null check (status in ('started', 'completed', 'rewarded', 'failed', 'cancelled')),
  reward_coin_amount numeric(18, 2) not null default 0 check (reward_coin_amount >= 0),
  watched_seconds int,
  provider_reference text,
  transaction_id uuid references public.transactions(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  rewarded_at timestamptz
);

create index if not exists idx_rewarded_ad_sessions_user_created
  on public.rewarded_ad_sessions(user_id, created_at desc);
create index if not exists idx_rewarded_ad_sessions_user_status_created
  on public.rewarded_ad_sessions(user_id, status, created_at desc);
create unique index if not exists idx_rewarded_ad_sessions_transaction_unique
  on public.rewarded_ad_sessions(transaction_id)
  where transaction_id is not null;

alter table public.transactions
  drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check
  check (source in ('system', 'payment', 'tip', 'unlock', 'vip', 'gift', 'admin', 'bonus', 'rewarded_ad_coin', 'payout', 'refund'));

alter table public.rewarded_ad_sessions enable row level security;

drop policy if exists "Users read own rewarded ad sessions" on public.rewarded_ad_sessions;
create policy "Users read own rewarded ad sessions"
  on public.rewarded_ad_sessions for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users insert own rewarded ad sessions" on public.rewarded_ad_sessions;
create policy "Users insert own rewarded ad sessions"
  on public.rewarded_ad_sessions for insert
  with check (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users update own rewarded ad sessions" on public.rewarded_ad_sessions;
create policy "Users update own rewarded ad sessions"
  on public.rewarded_ad_sessions for update
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()))
  with check (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

insert into public.monetization_settings (key, value, description, is_public)
values
  ('rewarded_ads.provider_mock_enabled', 'true'::jsonb, 'Bat mock provider rewarded ads cho MVP/test mode.', false),
  ('rewarded_ads.reward_coin_amount', '10'::jsonb, 'So coin thuong moi luot rewarded ad.', true),
  ('rewarded_ads.daily_limit_per_user', '3'::jsonb, 'So luot rewarded ad toi da moi user trong ngay.', false),
  ('rewarded_ads.cooldown_minutes', '5'::jsonb, 'Thoi gian cho giua 2 luot rewarded ad.', false),
  ('rewarded_ads.min_watch_seconds', '15'::jsonb, 'Thoi luong xem toi thieu de nhan thuong.', false),
  ('rewarded_ads.bonus_coin_expires_days', '0'::jsonb, '0 = khong het han. >0 de danh dau metadata het han.', false),
  ('rewarded_ads.allowed_use_for_paid_chapters', 'true'::jsonb, 'Cho phep bonus coin rewarded ad dung cho paid chapter.', true),
  ('rewarded_ads.allowed_use_for_tips', 'true'::jsonb, 'Cho phep bonus coin rewarded ad dung de tip.', true)
on conflict (key) do nothing;
