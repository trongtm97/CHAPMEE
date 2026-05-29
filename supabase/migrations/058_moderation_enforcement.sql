-- Community guidelines enforcement: age ratings, violations, strikes, restrictions, appeals

-- ---------------------------------------------------------------------------
-- Story age rating
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists age_rating text not null default 'all_ages',
  add column if not exists sensitive_flags text[] not null default '{}';

alter table public.stories
  drop constraint if exists stories_age_rating_check;

alter table public.stories
  add constraint stories_age_rating_check check (
    age_rating in ('all_ages', 'teen_13', 'young_adult_16', 'mature_18')
  );

-- ---------------------------------------------------------------------------
-- Reports extensions
-- ---------------------------------------------------------------------------
alter type public.report_status add value if not exists 'reviewing';
alter type public.report_status add value if not exists 'resolved_action_taken';
alter type public.report_status add value if not exists 'resolved_no_violation';
alter type public.report_status add value if not exists 'rejected_abuse';
alter type public.report_status add value if not exists 'escalated';

alter table public.reports
  add column if not exists reason_code text,
  add column if not exists reason_detail text,
  add column if not exists priority text not null default 'normal',
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.reports
set reason_code = coalesce(reason_code, reason),
    reason_detail = coalesce(reason_detail, details)
where reason_code is null or reason_detail is null;

create index if not exists idx_reports_status_created
  on public.reports(status, created_at desc);

create index if not exists idx_reports_priority
  on public.reports(priority, created_at desc);

-- ---------------------------------------------------------------------------
-- Violations
-- ---------------------------------------------------------------------------
create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text,
  target_id text,
  policy_area text not null,
  severity text not null,
  action_taken text not null,
  strike_count int not null default 0,
  note text,
  report_id uuid references public.reports(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint violations_policy_area_check check (
    policy_area in (
      'safety', 'harassment', 'hate_speech', 'privacy', 'sexual_content',
      'violence', 'self_harm', 'copyright', 'spam', 'scam', 'monetization',
      'age_rating', 'platform_integrity'
    )
  ),
  constraint violations_severity_check check (
    severity in ('warning', 'minor', 'moderate', 'severe', 'critical')
  )
);

create index if not exists idx_violations_user_created
  on public.violations(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Account strikes
-- ---------------------------------------------------------------------------
create table if not exists public.account_strikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  violation_id uuid references public.violations(id) on delete set null,
  policy_area text not null,
  points int not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_active boolean not null default true
);

create index if not exists idx_account_strikes_user_active
  on public.account_strikes(user_id, is_active, expires_at desc);

-- ---------------------------------------------------------------------------
-- Account restrictions
-- ---------------------------------------------------------------------------
create table if not exists public.account_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restriction_type text not null,
  reason text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  violation_id uuid references public.violations(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint account_restrictions_type_check check (
    restriction_type in (
      'comment_block', 'post_block', 'story_publish_block',
      'creator_monetization_hold', 'payout_hold', 'recommendation_limited',
      'account_suspended', 'account_banned'
    )
  )
);

create index if not exists idx_account_restrictions_user_active
  on public.account_restrictions(user_id, is_active, restriction_type);

-- ---------------------------------------------------------------------------
-- Moderation appeals
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  violation_id uuid not null references public.violations(id) on delete cascade,
  message text not null,
  status text not null default 'open',
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moderation_appeals_status_check check (
    status in ('open', 'reviewing', 'accepted', 'rejected')
  )
);

create trigger moderation_appeals_set_updated_at
before update on public.moderation_appeals
for each row execute function public.set_updated_at();

create index if not exists idx_moderation_appeals_status
  on public.moderation_appeals(status, created_at desc);

-- ---------------------------------------------------------------------------
-- RBAC: new permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_key) values
  ('moderation.appeal.review', 'Review moderation appeals', 'moderation'),
  ('moderation.policy.manage', 'Manage moderation policy', 'moderation')
on conflict (code) do update set
  name = excluded.name,
  group_key = excluded.group_key;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('moderator', 'content_admin', 'admin', 'super_admin', 'owner')
  and p.code in ('moderation.appeal.review')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('content_admin', 'admin', 'super_admin', 'owner')
  and p.code in ('moderation.policy.manage')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.user_has_active_restriction(
  input_user_id uuid,
  input_restriction_type text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.account_restrictions ar
    where ar.user_id = input_user_id
      and ar.restriction_type = input_restriction_type
      and ar.is_active = true
      and ar.starts_at <= now()
      and (ar.ends_at is null or ar.ends_at > now())
  );
$$;

grant execute on function public.user_has_active_restriction(uuid, text) to authenticated;

create or replace function public.expire_account_strikes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_strikes
  set is_active = false
  where is_active = true
    and expires_at <= now();
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.violations enable row level security;
alter table public.account_strikes enable row level security;
alter table public.account_restrictions enable row level security;
alter table public.moderation_appeals enable row level security;

drop policy if exists "Users read own violations" on public.violations;
create policy "Users read own violations"
  on public.violations for select
  to authenticated
  using (user_id = auth.uid() or public.user_has_permission(auth.uid(), 'report.review'));

drop policy if exists "Staff insert violations" on public.violations;
create policy "Staff insert violations"
  on public.violations for insert
  to authenticated
  with check (public.user_has_permission(auth.uid(), 'moderation.action.create'));

drop policy if exists "Staff read all violations" on public.violations;
create policy "Staff read all violations"
  on public.violations for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));

drop policy if exists "Users read own strikes" on public.account_strikes;
create policy "Users read own strikes"
  on public.account_strikes for select
  to authenticated
  using (user_id = auth.uid() or public.user_has_permission(auth.uid(), 'report.review'));

drop policy if exists "Staff manage strikes" on public.account_strikes;
create policy "Staff manage strikes"
  on public.account_strikes for all
  to authenticated
  using (public.user_has_permission(auth.uid(), 'moderation.action.create'))
  with check (public.user_has_permission(auth.uid(), 'moderation.action.create'));

drop policy if exists "Users read own restrictions" on public.account_restrictions;
create policy "Users read own restrictions"
  on public.account_restrictions for select
  to authenticated
  using (user_id = auth.uid() or public.user_has_permission(auth.uid(), 'report.review'));

drop policy if exists "Staff manage restrictions" on public.account_restrictions;
create policy "Staff manage restrictions"
  on public.account_restrictions for all
  to authenticated
  using (public.user_has_permission(auth.uid(), 'moderation.action.create'))
  with check (public.user_has_permission(auth.uid(), 'moderation.action.create'));

drop policy if exists "Users create own appeals" on public.moderation_appeals;
create policy "Users create own appeals"
  on public.moderation_appeals for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users read own appeals" on public.moderation_appeals;
create policy "Users read own appeals"
  on public.moderation_appeals for select
  to authenticated
  using (user_id = auth.uid() or public.user_has_permission(auth.uid(), 'moderation.appeal.review'));

drop policy if exists "Staff update appeals" on public.moderation_appeals;
create policy "Staff update appeals"
  on public.moderation_appeals for update
  to authenticated
  using (public.user_has_permission(auth.uid(), 'moderation.appeal.review'))
  with check (public.user_has_permission(auth.uid(), 'moderation.appeal.review'));

-- Reports: staff read all
drop policy if exists "Staff can read all reports" on public.reports;
create policy "Staff can read all reports"
  on public.reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or public.user_has_permission(auth.uid(), 'report.review')
  );

drop policy if exists "Staff can update reports" on public.reports;
create policy "Staff can update reports"
  on public.reports for update
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'))
  with check (public.user_has_permission(auth.uid(), 'report.review'));
