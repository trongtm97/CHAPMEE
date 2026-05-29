-- Community auto moderation: settings, keyword rules, decisions, profile flags

alter table public.profiles
  add column if not exists community_trusted boolean not null default false,
  add column if not exists community_restricted boolean not null default false,
  add column if not exists community_restricted_until timestamptz,
  add column if not exists community_trust_note text;

alter table public.community_posts
  add column if not exists auto_decision text,
  add column if not exists auto_decision_reason_codes text[] default '{}',
  add column if not exists latest_moderation_decision_id uuid;

create table if not exists public.community_auto_moderation_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default true,
  mode text not null default 'balanced'
    check (mode in ('safe', 'balanced', 'relaxed')),
  auto_approve_min_trust_score int not null default 70,
  trusted_author_min_score int not null default 60,
  prioritize_verified_authors boolean not null default true,
  require_email_verified boolean not null default true,
  require_no_active_strikes boolean not null default true,
  max_rejected_posts_30d int not null default 1,
  max_valid_reports_30d int not null default 0,
  allow_external_links_for_trusted boolean not null default false,
  review_external_links boolean not null default true,
  auto_reject_blocked_keywords boolean not null default true,
  review_new_accounts boolean not null default true,
  new_account_days int not null default 7,
  min_post_length int not null default 10,
  max_post_length int not null default 5000,
  min_approved_posts_for_auto int not null default 0,
  rate_limits jsonb not null default '{
    "new_user_posts_per_day": 3,
    "normal_posts_per_day": 10,
    "trusted_posts_per_day": 30,
    "comments_per_minute": 30,
    "polls_per_day": 5,
    "challenges_per_day": 3,
    "post_cooldown_seconds": 60,
    "external_link_posts_per_day": 2
  }'::jsonb,
  allowed_domains text[] not null default array['chapmee.com', 'www.chapmee.com'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.community_auto_moderation_settings (id)
select gen_random_uuid()
where not exists (select 1 from public.community_auto_moderation_settings limit 1);

create table if not exists public.moderation_keyword_rules (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  match_type text not null default 'contains'
    check (match_type in ('contains', 'exact', 'starts_with')),
  action text not null check (action in ('block', 'review', 'allow')),
  category text,
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moderation_keyword_rules_action_active_idx
  on public.moderation_keyword_rules(action, is_active);

create table if not exists public.community_moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check (
    decision in (
      'auto_approved',
      'needs_review',
      'auto_rejected',
      'auto_hidden',
      'rate_limited'
    )
  ),
  trust_score int,
  matched_rules jsonb not null default '[]'::jsonb,
  reason_codes text[] not null default '{}',
  final_status text not null,
  overridden_by uuid references public.profiles(id) on delete set null,
  overridden_at timestamptz,
  override_reason text,
  created_at timestamptz not null default now()
);

create index if not exists community_moderation_decisions_post_idx
  on public.community_moderation_decisions(post_id, created_at desc);

create index if not exists community_moderation_decisions_user_idx
  on public.community_moderation_decisions(user_id, created_at desc);

create index if not exists community_moderation_decisions_created_idx
  on public.community_moderation_decisions(created_at desc);

alter table public.community_posts
  add constraint community_posts_latest_decision_fkey
  foreign key (latest_moderation_decision_id)
  references public.community_moderation_decisions(id)
  on delete set null;

alter table public.community_auto_moderation_settings enable row level security;
alter table public.moderation_keyword_rules enable row level security;
alter table public.community_moderation_decisions enable row level security;

drop policy if exists "Staff read auto moderation settings" on public.community_auto_moderation_settings;
create policy "Staff read auto moderation settings"
  on public.community_auto_moderation_settings for select
  to authenticated
  using (
    public.current_profile_role() in ('admin', 'moderator')
    or public.user_has_permission(auth.uid(), 'community.post.moderate')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Staff manage auto moderation settings" on public.community_auto_moderation_settings;
create policy "Staff manage auto moderation settings"
  on public.community_auto_moderation_settings for all
  to authenticated
  using (public.user_has_permission(auth.uid(), 'admin.settings.update'))
  with check (public.user_has_permission(auth.uid(), 'admin.settings.update'));

drop policy if exists "Staff read keyword rules" on public.moderation_keyword_rules;
create policy "Staff read keyword rules"
  on public.moderation_keyword_rules for select
  to authenticated
  using (
    public.current_profile_role() in ('admin', 'moderator')
    or public.user_has_permission(auth.uid(), 'community.post.moderate')
  );

drop policy if exists "Staff manage keyword rules" on public.moderation_keyword_rules;
create policy "Staff manage keyword rules"
  on public.moderation_keyword_rules for all
  to authenticated
  using (public.user_has_permission(auth.uid(), 'admin.settings.update'))
  with check (public.user_has_permission(auth.uid(), 'admin.settings.update'));

drop policy if exists "Staff read moderation decisions" on public.community_moderation_decisions;
create policy "Staff read moderation decisions"
  on public.community_moderation_decisions for select
  to authenticated
  using (
    public.current_profile_role() in ('admin', 'moderator')
    or public.user_has_permission(auth.uid(), 'community.post.moderate')
  );

drop policy if exists "Users insert own moderation decisions" on public.community_moderation_decisions;
create policy "Users insert own moderation decisions"
  on public.community_moderation_decisions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Staff update moderation decisions" on public.community_moderation_decisions;
create policy "Staff update moderation decisions"
  on public.community_moderation_decisions for update
  to authenticated
  using (public.user_has_permission(auth.uid(), 'community.post.moderate'))
  with check (public.user_has_permission(auth.uid(), 'community.post.moderate'));

-- Seed keyword rules (admin có thể sửa sau)
insert into public.moderation_keyword_rules (keyword, action, severity, category)
select v.keyword, v.action, v.severity, v.category
from (
  values
    ('lừa đảo', 'block', 'high', 'scam'),
    ('hack acc', 'block', 'high', 'abuse'),
    ('giả mạo admin', 'block', 'high', 'impersonation'),
    ('bóc phốt', 'review', 'medium', 'dispute'),
    ('refund', 'review', 'medium', 'finance'),
    ('tranh cãi', 'review', 'low', 'dispute')
) as v(keyword, action, severity, category)
where not exists (select 1 from public.moderation_keyword_rules limit 1);
