-- Message Safety Center: settings, keyword rules, decisions, messaging restrictions

-- ---------------------------------------------------------------------------
-- message_safety_settings (singleton row)
-- ---------------------------------------------------------------------------
create table if not exists public.message_safety_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default true,
  default_dm_policy text not null default 'open',
  new_account_days int not null default 7,
  unverified_daily_message_limit int not null default 5,
  verified_daily_message_limit int not null default 50,
  trusted_daily_message_limit int not null default 200,
  max_messages_per_minute int not null default 20,
  max_messages_per_day int not null default 200,
  max_new_recipients_per_day int not null default 10,
  duplicate_message_limit_per_day int not null default 3,
  duplicate_cooldown_seconds int not null default 600,
  block_external_links_for_new_users boolean not null default true,
  block_external_links_for_unverified boolean not null default true,
  allow_internal_links boolean not null default true,
  author_protection_enabled boolean not null default true,
  author_dm_new_user_limit int not null default 2,
  auto_restrict_report_threshold int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_safety_settings_dm_policy_check check (
    default_dm_policy in ('open', 'mutual_follow_only', 'request_first', 'disabled')
  )
);

insert into public.message_safety_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.message_safety_settings limit 1);

-- ---------------------------------------------------------------------------
-- message_safety_keyword_rules
-- ---------------------------------------------------------------------------
create table if not exists public.message_safety_keyword_rules (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  action text not null,
  severity text not null default 'medium',
  category text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_safety_keyword_rules_action_check check (
    action in ('block', 'review', 'allow')
  ),
  constraint message_safety_keyword_rules_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint message_safety_keyword_rules_category_check check (
    category is null or category in (
      'profanity', 'harassment', 'scam', 'sexual', 'personal_info',
      'impersonation', 'spam'
    )
  )
);

create index if not exists idx_message_safety_keyword_rules_active
  on public.message_safety_keyword_rules(is_active) where is_active = true;

-- ---------------------------------------------------------------------------
-- message_safety_decisions
-- ---------------------------------------------------------------------------
create table if not exists public.message_safety_decisions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.messages(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete set null,
  decision text not null,
  risk_level text not null default 'low',
  matched_rules jsonb,
  reason_codes text[] not null default '{}',
  message_excerpt_masked text,
  created_at timestamptz not null default now(),
  constraint message_safety_decisions_decision_check check (
    decision in ('allowed', 'blocked', 'needs_review', 'rate_limited')
  ),
  constraint message_safety_decisions_risk_check check (
    risk_level in ('low', 'medium', 'high', 'critical')
  )
);

create index if not exists idx_message_safety_decisions_created
  on public.message_safety_decisions(created_at desc);

create index if not exists idx_message_safety_decisions_sender
  on public.message_safety_decisions(sender_id, created_at desc);

-- ---------------------------------------------------------------------------
-- messaging_restrictions
-- ---------------------------------------------------------------------------
create table if not exists public.messaging_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restriction_type text not null,
  reason_code text not null,
  note text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  revoke_reason text,
  constraint messaging_restrictions_type_check check (
    restriction_type in (
      'mute_24h', 'mute_7d', 'mute_30d', 'permanent_messaging_ban',
      'link_block_only', 'strangers_block_only', 'author_dm_block_only'
    )
  )
);

create index if not exists idx_messaging_restrictions_user_active
  on public.messaging_restrictions(user_id, is_active)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- Extend message_reports
-- ---------------------------------------------------------------------------
alter table public.message_reports
  add column if not exists risk_level text default 'medium';

alter table public.message_reports
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

alter table public.message_reports
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

alter table public.message_reports
  add column if not exists resolved_at timestamptz;

alter table public.message_reports
  drop constraint if exists message_reports_status_check;

alter table public.message_reports
  add constraint message_reports_status_check check (
    status in ('open', 'reviewing', 'resolved', 'dismissed', 'rejected')
  );

alter table public.message_reports
  drop constraint if exists message_reports_risk_check;

alter table public.message_reports
  add constraint message_reports_risk_check check (
    risk_level in ('low', 'medium', 'high', 'critical')
  );

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.message_safety_settings enable row level security;
alter table public.message_safety_keyword_rules enable row level security;
alter table public.message_safety_decisions enable row level security;
alter table public.messaging_restrictions enable row level security;

create policy "Staff read message safety settings"
  on public.message_safety_settings for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));

create policy "Staff update message safety settings"
  on public.message_safety_settings for update
  to authenticated
  using (public.user_has_permission(auth.uid(), 'moderation.action.create'))
  with check (public.user_has_permission(auth.uid(), 'moderation.action.create'));

create policy "Staff read keyword rules"
  on public.message_safety_keyword_rules for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));

create policy "Staff manage keyword rules"
  on public.message_safety_keyword_rules for all
  to authenticated
  using (public.user_has_permission(auth.uid(), 'moderation.action.create'))
  with check (public.user_has_permission(auth.uid(), 'moderation.action.create'));

create policy "Users insert own safety decisions"
  on public.message_safety_decisions for insert
  to authenticated
  with check (auth.uid() = sender_id);

create policy "Staff read safety decisions"
  on public.message_safety_decisions for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));

create policy "Staff read messaging restrictions"
  on public.messaging_restrictions for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));

create policy "Staff manage messaging restrictions"
  on public.messaging_restrictions for all
  to authenticated
  using (public.user_has_permission(auth.uid(), 'moderation.action.create'))
  with check (public.user_has_permission(auth.uid(), 'moderation.action.create'));

create policy "Users read own messaging restrictions"
  on public.messaging_restrictions for select
  to authenticated
  using (auth.uid() = user_id);
