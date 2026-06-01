-- Migration 193: Ad fraud rules, signals, audit (MVP — no auto payout block on account)

create table if not exists public.ad_fraud_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text unique not null,
  name text not null,
  description text,
  is_enabled boolean not null default true,
  severity text not null default 'warning',
  threshold_config jsonb not null default '{}'::jsonb,
  action text not null default 'flag',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_fraud_rules_severity_check check (
    severity in ('info', 'warning', 'high', 'critical')
  ),
  constraint ad_fraud_rules_action_check check (
    action in ('flag', 'hold_creator', 'hold_story', 'disable_ads')
  )
);

create table if not exists public.ad_fraud_signals (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null,
  severity text not null,
  author_id uuid references public.profiles(id) on delete set null,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  month text,
  event_date date,
  signal_data jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  constraint ad_fraud_signals_severity_check check (
    severity in ('info', 'warning', 'high', 'critical')
  ),
  constraint ad_fraud_signals_status_check check (
    status in ('open', 'reviewing', 'resolved', 'dismissed')
  ),
  constraint ad_fraud_signals_month_format check (
    month is null or month ~ '^\d{4}-\d{2}$'
  )
);

create index if not exists idx_ad_fraud_signals_status_created
  on public.ad_fraud_signals(status, created_at desc);

create index if not exists idx_ad_fraud_signals_author
  on public.ad_fraud_signals(author_id, created_at desc);

create index if not exists idx_ad_fraud_signals_rule
  on public.ad_fraud_signals(rule_key, status);

create unique index if not exists ad_fraud_signals_dedup_open_idx
  on public.ad_fraud_signals (
    rule_key,
    coalesce(author_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(story_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(event_date, '1970-01-01'::date),
    coalesce(month, '')
  )
  where status in ('open', 'reviewing');

create table if not exists public.ad_fraud_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  signal_id uuid references public.ad_fraud_signals(id) on delete set null,
  allocation_id uuid references public.ad_revenue_creator_allocations(id) on delete set null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_fraud_audit_created
  on public.ad_fraud_audit_logs(created_at desc);

alter table public.ad_revenue_creator_allocations
  add column if not exists fraud_signal_id uuid references public.ad_fraud_signals(id) on delete set null;

drop trigger if exists trg_ad_fraud_rules_updated_at on public.ad_fraud_rules;
create trigger trg_ad_fraud_rules_updated_at
before update on public.ad_fraud_rules
for each row execute function public.touch_ad_revenue_reconciliation_updated_at();

alter table public.ad_fraud_rules enable row level security;
alter table public.ad_fraud_signals enable row level security;
alter table public.ad_fraud_audit_logs enable row level security;

drop policy if exists "Admin read ad fraud rules" on public.ad_fraud_rules;
create policy "Admin read ad fraud rules"
  on public.ad_fraud_rules for select
  using (public.is_admin_or_founder(auth.uid()));
create policy "Admin manage ad fraud rules"
  on public.ad_fraud_rules for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage ad fraud signals" on public.ad_fraud_signals;
create policy "Admin manage ad fraud signals"
  on public.ad_fraud_signals for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin read ad fraud audit" on public.ad_fraud_audit_logs;
create policy "Admin read ad fraud audit"
  on public.ad_fraud_audit_logs for select
  using (public.is_admin_or_founder(auth.uid()));

insert into public.ad_fraud_rules (rule_key, name, description, severity, threshold_config, action)
values
  (
    'sudden_impression_spike',
    'Impression tăng đột biến',
    'Impression tăng bất thường so với trung bình 7 ngày trước.',
    'warning',
    '{"multiplier": 3, "min_baseline": 50}'::jsonb,
    'flag'
  ),
  (
    'high_impression_low_read_time',
    'Nhiều impression, ít đọc',
    'Nhiều impression nhưng tỷ lệ đọc/phiên thấp bất thường (proxy read time).',
    'high',
    '{"min_impressions": 200, "max_read_ratio": 0.08}'::jsonb,
    'flag'
  ),
  (
    'same_session_many_impressions',
    'Session quá nhiều impression',
    'Một session tạo quá nhiều impression quảng cáo trong ngày.',
    'warning',
    '{"max_impressions_per_session": 25}'::jsonb,
    'flag'
  ),
  (
    'suspicious_creator_self_traffic',
    'Traffic nghi tự xem',
    'Nhiều impression từ user trùng author (nếu xác định được).',
    'high',
    '{"min_self_impressions": 15}'::jsonb,
    'hold_creator'
  ),
  (
    'report_or_moderation_hold',
    'Report / moderation đang mở',
    'Nội dung có báo cáo hoặc moderation chưa xử lý — đề xuất giữ doanh thu QC.',
    'high',
    '{"min_pending_reports": 1}'::jsonb,
    'hold_story'
  ),
  (
    'policy_violation_hold',
    'Vi phạm chính sách nội dung',
    'Truyện/chương không còn trạng thái công khai hợp lệ.',
    'critical',
    '{}'::jsonb,
    'hold_story'
  )
on conflict (rule_key) do update set
  name = excluded.name,
  description = excluded.description,
  severity = excluded.severity,
  threshold_config = excluded.threshold_config,
  action = excluded.action;
