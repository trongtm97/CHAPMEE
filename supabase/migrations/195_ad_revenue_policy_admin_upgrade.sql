-- Migration 195: Extend creator ad revenue policy admin (no duplicate tables)

alter table public.creator_ad_revenue_policy
  add column if not exists internal_tracking_only boolean not null default true,
  add column if not exists show_estimated_revenue_to_creators boolean not null default true,
  add column if not exists estimated_revenue_disclaimer_enabled boolean not null default true,
  add column if not exists max_invalid_traffic_rate numeric not null default 0.15,
  add column if not exists max_suspicious_ctr numeric not null default 0.08,
  add column if not exists auto_hold_invalid_traffic boolean not null default true,
  add column if not exists auto_hold_suspicious_ctr boolean not null default true,
  add column if not exists auto_hold_traffic_spike boolean not null default true,
  add column if not exists auto_hold_reported_content boolean not null default true,
  add column if not exists auto_hold_copyright_dispute boolean not null default true,
  add column if not exists auto_hold_missing_compliance boolean not null default true,
  add column if not exists policy_version text not null default '1.0',
  add column if not exists policy_status text not null default 'draft',
  add column if not exists policy_effective_at timestamptz,
  add column if not exists policy_published_at timestamptz;

alter table public.creator_ad_revenue_policy drop constraint if exists creator_ad_revenue_policy_status_check;
alter table public.creator_ad_revenue_policy
  add constraint creator_ad_revenue_policy_status_check
  check (policy_status in ('draft', 'published', 'archived'));

alter table public.creator_ad_monetization_profiles
  add column if not exists internal_note text,
  add column if not exists fraud_hold boolean not null default false;

alter table public.creator_ad_monetization_profiles drop constraint if exists creator_ad_monetization_profiles_status_check;
alter table public.creator_ad_monetization_profiles
  add constraint creator_ad_monetization_profiles_status_check
  check (status in (
    'not_enabled', 'pending_review', 'eligible', 'suspended', 'rejected', 'fraud_hold'
  ));

alter table public.creator_ad_policy_audit_logs
  add column if not exists note text;

create table if not exists public.creator_ad_policy_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  status text not null default 'draft',
  title text not null default 'Chính sách chia sẻ doanh thu quảng cáo',
  body_markdown text not null,
  effective_at timestamptz,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_ad_policy_versions_status_check
    check (status in ('draft', 'published', 'archived'))
);

create index if not exists idx_creator_ad_policy_versions_status
  on public.creator_ad_policy_versions(status, created_at desc);

drop trigger if exists creator_ad_policy_versions_set_updated_at on public.creator_ad_policy_versions;
create trigger creator_ad_policy_versions_set_updated_at
before update on public.creator_ad_policy_versions
for each row execute function public.touch_creator_ad_policy_updated_at();

alter table public.creator_ad_policy_versions enable row level security;

drop policy if exists "Admin read creator ad policy versions" on public.creator_ad_policy_versions;
create policy "Admin read creator ad policy versions"
  on public.creator_ad_policy_versions for select
  using (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin write creator ad policy versions" on public.creator_ad_policy_versions;
create policy "Admin write creator ad policy versions"
  on public.creator_ad_policy_versions for insert
  with check (public.is_admin_or_founder(auth.uid()));

create policy "Admin update creator ad policy versions"
  on public.creator_ad_policy_versions for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));
