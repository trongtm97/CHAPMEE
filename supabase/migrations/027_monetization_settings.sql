-- Migration 027: Monetization settings foundation (admin controlled)

do $$
begin
  alter type public.profile_role add value if not exists 'founder';
exception
  when duplicate_object then null;
end $$;

create table if not exists public.monetization_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_monetization_settings_is_public
  on public.monetization_settings(is_public);

create or replace function public.touch_monetization_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_monetization_settings_updated_at on public.monetization_settings;
create trigger trg_touch_monetization_settings_updated_at
before update on public.monetization_settings
for each row
execute function public.touch_monetization_settings_updated_at();

create or replace function public.is_admin_or_founder(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = input_user_id
      and p.role::text in ('admin', 'founder')
  );
$$;

grant execute on function public.is_admin_or_founder(uuid) to anon, authenticated;

alter table public.monetization_settings enable row level security;

drop policy if exists "Public can read monetization public settings" on public.monetization_settings;
create policy "Public can read monetization public settings"
  on public.monetization_settings for select
  using (is_public = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder can insert monetization settings" on public.monetization_settings;
create policy "Admin founder can insert monetization settings"
  on public.monetization_settings for insert
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder can update monetization settings" on public.monetization_settings;
create policy "Admin founder can update monetization settings"
  on public.monetization_settings for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder can delete monetization settings" on public.monetization_settings;
create policy "Admin founder can delete monetization settings"
  on public.monetization_settings for delete
  using (public.is_admin_or_founder(auth.uid()));

insert into public.monetization_settings (key, value, description, is_public)
values
  ('monetization.enabled', 'false'::jsonb, 'Cong tac tong. Tat = an toan bo money UI user-facing.', true),
  ('monetization.test_mode', 'false'::jsonb, 'Chi dung thu noi bo, khong xu ly tien that.', false),
  ('monetization.show_money_ui_to_users', 'false'::jsonb, 'Cho phep reader thay money UI.', true),
  ('monetization.show_money_ui_to_creators', 'false'::jsonb, 'Cho phep creator thay money UI.', true),
  ('coin.enabled', 'false'::jsonb, 'Bat nen tang coin.', true),
  ('coin.purchase_enabled', 'false'::jsonb, 'Bat mua coin.', true),
  ('coin.reward_enabled', 'false'::jsonb, 'Bat coin thuong.', true),
  ('coin.display_name', '"Coin"'::jsonb, 'Ten hien thi coin.', true),
  ('coin.exchange_rate_vnd', '1000'::jsonb, 'Ty gia VND/coin.', true),
  ('coin.min_purchase_amount_vnd', '10000'::jsonb, 'Mua coin toi thieu.', true),
  ('payments.enabled', 'false'::jsonb, 'Cong tac tong payment.', true),
  ('payments.provider_vnpay_enabled', 'false'::jsonb, 'Bat VNPay.', true),
  ('payments.provider_momo_enabled', 'false'::jsonb, 'Bat MoMo.', true),
  ('payments.provider_zalopay_enabled', 'false'::jsonb, 'Bat ZaloPay.', true),
  ('payments.provider_vietqr_enabled', 'false'::jsonb, 'Bat VietQR.', true),
  ('payments.provider_app_store_iap_enabled', 'false'::jsonb, 'Bat App Store IAP.', true),
  ('payments.provider_google_play_billing_enabled', 'false'::jsonb, 'Bat Google Play Billing.', true),
  ('creator_monetization.enabled', 'false'::jsonb, 'Bat kiem tien cho creator.', true),
  ('creator_monetization.auto_approval_enabled', 'false'::jsonb, 'Tu dong duyet creator.', false),
  ('creator_monetization.min_followers', '0'::jsonb, 'Follower toi thieu.', false),
  ('creator_monetization.min_reads', '0'::jsonb, 'Luot doc toi thieu.', false),
  ('creator_monetization.min_chapters', '0'::jsonb, 'So chapter toi thieu.', false),
  ('creator_monetization.requires_manual_review', 'true'::jsonb, 'Bat buoc duyet thu cong.', false),
  ('revenue_share.default_creator_percent', '70'::jsonb, 'Ty le creator mac dinh.', false),
  ('revenue_share.default_platform_percent', '30'::jsonb, 'Ty le platform mac dinh.', false),
  ('revenue_share.tip_creator_percent', '90'::jsonb, 'Ty le creator tu tip.', false),
  ('revenue_share.tip_platform_percent', '10'::jsonb, 'Ty le platform tu tip.', false),
  ('revenue_share.paid_chapter_creator_percent', '70'::jsonb, 'Ty le creator paid chapter.', false),
  ('revenue_share.paid_chapter_platform_percent', '30'::jsonb, 'Ty le platform paid chapter.', false),
  ('revenue_share.vip_creator_pool_percent', '60'::jsonb, 'Ty le VIP creator pool.', false),
  ('revenue_share.platform_fee_percent', '30'::jsonb, 'Phi nen tang.', false),
  ('tips.enabled', 'false'::jsonb, 'Bat/tat tip.', true),
  ('virtual_gifts.enabled', 'false'::jsonb, 'Bat/tat qua ao.', true),
  ('paid_chapters.enabled', 'false'::jsonb, 'Bat/tat paid chapters.', true),
  ('early_access.enabled', 'false'::jsonb, 'Bat/tat early access.', true),
  ('vip_subscription.enabled', 'false'::jsonb, 'Bat/tat VIP.', true),
  ('fan_club.enabled', 'false'::jsonb, 'Bat/tat fan club.', true),
  ('rewarded_ads.enabled', 'false'::jsonb, 'Bat/tat rewarded ads.', true),
  ('supporter_ranking.enabled', 'false'::jsonb, 'Bat/tat supporter ranking.', true),
  ('earning_author_ranking.enabled', 'false'::jsonb, 'Bat/tat earning author ranking.', true),
  ('creator_bonus_pool.enabled', 'false'::jsonb, 'Bat/tat creator bonus pool.', true),
  ('originals_enabled', 'false'::jsonb, 'Bat/tat originals.', true),
  ('payout.enabled', 'false'::jsonb, 'Bat/tat payout.', false),
  ('payout.manual_review_required', 'true'::jsonb, 'Yeu cau duyet payout.', false),
  ('payout.min_withdraw_amount_vnd', '100000'::jsonb, 'Nguong rut toi thieu.', false),
  ('payout.hold_days', '14'::jsonb, 'So ngay hold doanh thu.', false),
  ('payout.kyc_required', 'true'::jsonb, 'Yeu cau KYC.', false),
  ('fraud.enabled', 'false'::jsonb, 'Cong tac tong fraud protection.', false),
  ('fraud.delay_creator_revenue_enabled', 'true'::jsonb, 'Delay doanh thu creator.', false),
  ('fraud.block_bonus_coin_withdrawal', 'true'::jsonb, 'Chan rut coin thuong.', false),
  ('fraud.max_daily_tip_amount_per_user', '500000'::jsonb, 'Tran tip/ngay/user.', false),
  ('fraud.max_daily_unlock_amount_per_user', '500000'::jsonb, 'Tran unlock/ngay/user.', false)
on conflict (key) do nothing;
