-- Migration 191: Creator ad revenue sharing policy, profiles, audit (no real payout)

create table if not exists public.creator_ad_revenue_policy (
  id uuid primary key default '22222222-2222-2222-2222-222222222222'::uuid,
  is_enabled boolean not null default false,
  beta_mode boolean not null default true,
  creator_pool_percent numeric not null default 30,
  reserve_percent numeric not null default 15,
  reserve_hold_days int not null default 60,
  min_payout_vnd numeric not null default 200000,
  payout_cycle text not null default 'monthly_m2_day_5_10',
  require_kyc boolean not null default true,
  require_tax_info boolean not null default true,
  require_payout_setup boolean not null default true,
  require_good_standing boolean not null default true,
  min_monthly_valid_reads int not null default 0,
  min_monthly_ad_impressions int not null default 0,
  invalid_traffic_hold_enabled boolean not null default true,
  policy_text text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint creator_ad_revenue_policy_singleton check (
    id = '22222222-2222-2222-2222-222222222222'::uuid
  ),
  constraint creator_ad_revenue_policy_percent_range check (
    creator_pool_percent >= 0 and creator_pool_percent <= 100
    and reserve_percent >= 0 and reserve_percent <= 100
  ),
  constraint creator_ad_revenue_policy_reserve_days check (reserve_hold_days >= 0),
  constraint creator_ad_revenue_policy_min_payout check (min_payout_vnd >= 0)
);

create table if not exists public.creator_ad_monetization_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'not_enabled',
  kyc_status text not null default 'not_started',
  tax_status text not null default 'not_submitted',
  payout_status text not null default 'not_setup',
  ads_revenue_enabled boolean not null default false,
  suspension_reason text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_ad_monetization_profiles_status_check check (
    status in ('not_enabled', 'pending_review', 'eligible', 'suspended', 'rejected')
  ),
  constraint creator_ad_monetization_profiles_kyc_check check (
    kyc_status in ('not_started', 'pending', 'verified', 'rejected')
  ),
  constraint creator_ad_monetization_profiles_tax_check check (
    tax_status in ('not_submitted', 'submitted', 'verified', 'rejected')
  ),
  constraint creator_ad_monetization_profiles_payout_check check (
    payout_status in ('not_setup', 'pending', 'verified', 'blocked')
  )
);

create index if not exists idx_creator_ad_monetization_profiles_status
  on public.creator_ad_monetization_profiles(status);

create index if not exists idx_creator_ad_monetization_profiles_kyc
  on public.creator_ad_monetization_profiles(kyc_status);

create table if not exists public.creator_ad_policy_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_ad_policy_audit_created
  on public.creator_ad_policy_audit_logs(created_at desc);

create index if not exists idx_creator_ad_policy_audit_target
  on public.creator_ad_policy_audit_logs(target_user_id, created_at desc);

create or replace function public.touch_creator_ad_policy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists creator_ad_revenue_policy_set_updated_at on public.creator_ad_revenue_policy;
create trigger creator_ad_revenue_policy_set_updated_at
before update on public.creator_ad_revenue_policy
for each row execute function public.touch_creator_ad_policy_updated_at();

drop trigger if exists creator_ad_monetization_profiles_set_updated_at on public.creator_ad_monetization_profiles;
create trigger creator_ad_monetization_profiles_set_updated_at
before update on public.creator_ad_monetization_profiles
for each row execute function public.touch_creator_ad_policy_updated_at();

alter table public.creator_ad_revenue_policy enable row level security;
alter table public.creator_ad_monetization_profiles enable row level security;
alter table public.creator_ad_policy_audit_logs enable row level security;

drop policy if exists "Authenticated read creator ad revenue policy" on public.creator_ad_revenue_policy;
create policy "Authenticated read creator ad revenue policy"
  on public.creator_ad_revenue_policy for select
  to authenticated
  using (true);

drop policy if exists "Admin founder update creator ad revenue policy" on public.creator_ad_revenue_policy;
create policy "Admin founder update creator ad revenue policy"
  on public.creator_ad_revenue_policy for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator read own ad monetization profile" on public.creator_ad_monetization_profiles;
create policy "Creator read own ad monetization profile"
  on public.creator_ad_monetization_profiles for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder manage ad monetization profiles" on public.creator_ad_monetization_profiles;
create policy "Admin founder insert ad monetization profiles"
  on public.creator_ad_monetization_profiles for insert
  with check (public.is_admin_or_founder(auth.uid()));
create policy "Admin founder update ad monetization profiles"
  on public.creator_ad_monetization_profiles for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder read creator ad policy audit" on public.creator_ad_policy_audit_logs;
create policy "Admin founder read creator ad policy audit"
  on public.creator_ad_policy_audit_logs for select
  using (public.is_admin_or_founder(auth.uid()));

insert into public.creator_ad_revenue_policy (id, policy_text)
values (
  '22222222-2222-2222-2222-222222222222'::uuid,
  $policy$
## Chính sách chia sẻ doanh thu quảng cáo (Tác giả)

Doanh thu được chia là doanh thu quảng cáo hợp lệ đã được đối tác quảng cáo chốt. Dashboard creator chỉ là ước tính. Thanh toán sau khi ChapMee nhận tiền và đối soát.

ChapMee có quyền giữ/chậm/hủy doanh thu nếu invalid traffic, vi phạm nội dung, tranh chấp bản quyền, lỗi hệ thống, yêu cầu pháp lý.

Tác giả không được tự click quảng cáo, kêu gọi click, mua traffic rác, dùng bot, trao đổi view/click. Tác giả chịu trách nhiệm cung cấp thông tin định danh, thuế, thanh toán. ChapMee có thể khấu trừ/kê khai/cung cấp thông tin theo pháp luật. Số liệu cuối cùng có thể khác số liệu ước tính.
$policy$
)
on conflict (id) do nothing;
