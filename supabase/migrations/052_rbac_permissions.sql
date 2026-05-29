-- Migration 052: RBAC roles, permissions, user_roles, audit logs, bans

-- ---------------------------------------------------------------------------
-- profiles.status (account state)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists status text not null default 'active';

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'banned', 'suspended'));

create index if not exists idx_profiles_status on public.profiles(status);

-- ---------------------------------------------------------------------------
-- RBAC tables
-- ---------------------------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  group_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (user_id, role_id)
);

create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_user_roles_role_id on public.user_roles(role_id);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_logs_created_at
  on public.admin_audit_logs(created_at desc);

create index if not exists idx_admin_audit_logs_actor_id
  on public.admin_audit_logs(actor_id);

create table if not exists public.user_bans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  banned_by uuid references public.profiles(id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_bans_user_active
  on public.user_bans(user_id)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.user_has_active_ban(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_bans b
    where b.user_id = input_user_id
      and b.is_active = true
      and b.starts_at <= now()
      and (b.ends_at is null or b.ends_at > now())
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = input_user_id
      and p.status = 'banned'
  );
$$;

create or replace function public.user_has_role(
  input_user_id uuid,
  role_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = input_user_id
      and r.code = role_code
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function public.user_has_any_role(
  input_user_id uuid,
  role_codes text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = input_user_id
      and r.code = any(role_codes)
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function public.user_has_permission(
  input_user_id uuid,
  permission_code text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = input_user_id
      and p.code = permission_code
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function public.user_has_any_permission(
  input_user_id uuid,
  permission_codes text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = input_user_id
      and p.code = any(permission_codes)
      and (ur.expires_at is null or ur.expires_at > now())
  );
$$;

create or replace function public.is_user_write_blocked(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.user_has_active_ban(input_user_id)
    or public.user_has_role(input_user_id, 'banned_user');
$$;

create or replace function public.is_staff_moderator(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = input_user_id
        and p.role::text in ('admin', 'moderator', 'founder')
    )
    or public.user_has_any_role(
      input_user_id,
      array[
        'moderator',
        'content_admin',
        'support_admin',
        'admin',
        'super_admin',
        'owner'
      ]
    );
$$;

create or replace function public.is_admin_or_founder(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = input_user_id
        and p.role::text in ('admin', 'founder')
    )
    or public.user_has_any_role(
      input_user_id,
      array['admin', 'super_admin', 'owner']
    );
$$;

create or replace function public.is_finance_staff(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin_or_founder(input_user_id)
    or public.user_has_permission(input_user_id, 'finance.dashboard.view');
$$;

create or replace function public.can_view_admin_audit(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_permission(input_user_id, 'admin.audit.view')
    or public.user_has_any_role(input_user_id, array['admin', 'super_admin', 'owner']);
$$;

create or replace function public.can_assign_roles(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_permission(input_user_id, 'admin.user.role.assign')
    or public.user_has_any_role(input_user_id, array['super_admin', 'owner']);
$$;

grant execute on function public.user_has_active_ban(uuid) to anon, authenticated;
grant execute on function public.user_has_role(uuid, text) to anon, authenticated;
grant execute on function public.user_has_any_role(uuid, text[]) to anon, authenticated;
grant execute on function public.user_has_permission(uuid, text) to anon, authenticated;
grant execute on function public.user_has_any_permission(uuid, text[]) to anon, authenticated;
grant execute on function public.is_user_write_blocked(uuid) to anon, authenticated;
grant execute on function public.is_staff_moderator(uuid) to anon, authenticated;
grant execute on function public.is_finance_staff(uuid) to anon, authenticated;
grant execute on function public.can_view_admin_audit(uuid) to anon, authenticated;
grant execute on function public.can_assign_roles(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_key) values
  ('story.create', 'Create story', 'story'),
  ('story.update.own', 'Update own story', 'story'),
  ('story.delete.own', 'Delete own story', 'story'),
  ('story.publish.own', 'Publish own story', 'story'),
  ('story.approve', 'Approve story', 'story'),
  ('story.reject', 'Reject story', 'story'),
  ('story.feature', 'Feature story', 'story'),
  ('story.moderate', 'Moderate story', 'story'),
  ('chapter.create', 'Create chapter', 'chapter'),
  ('chapter.update.own', 'Update own chapter', 'chapter'),
  ('chapter.delete.own', 'Delete own chapter', 'chapter'),
  ('chapter.publish.own', 'Publish own chapter', 'chapter'),
  ('chapter.set_vip', 'Set VIP chapter', 'chapter'),
  ('chapter.purchase', 'Purchase chapter', 'chapter'),
  ('comment.create', 'Create comment', 'comment'),
  ('comment.update.own', 'Update own comment', 'comment'),
  ('comment.delete.own', 'Delete own comment', 'comment'),
  ('comment.moderate', 'Moderate comment', 'comment'),
  ('comment.pin', 'Pin comment', 'comment'),
  ('community.post.create', 'Create community post', 'community'),
  ('community.post.update.own', 'Update own community post', 'community'),
  ('community.post.delete.own', 'Delete own community post', 'community'),
  ('community.post.moderate', 'Moderate community post', 'community'),
  ('community.group.create', 'Create community group', 'community'),
  ('community.group.approve', 'Approve community group', 'community'),
  ('community.group.moderate', 'Moderate community group', 'community'),
  ('reaction.create', 'Create reaction', 'reaction'),
  ('reaction.delete.own', 'Delete own reaction', 'reaction'),
  ('follow.create', 'Follow', 'social'),
  ('follow.delete.own', 'Unfollow', 'social'),
  ('save.create', 'Save content', 'social'),
  ('save.delete.own', 'Remove save', 'social'),
  ('wallet.view.own', 'View own wallet', 'wallet'),
  ('wallet.topup', 'Top up wallet', 'wallet'),
  ('wallet.purchase', 'Purchase with wallet', 'wallet'),
  ('wallet.tip', 'Tip creator', 'wallet'),
  ('wallet.adjust', 'Adjust wallet', 'wallet'),
  ('wallet.refund', 'Refund wallet', 'wallet'),
  ('wallet.transaction.view.own', 'View own transactions', 'wallet'),
  ('wallet.transaction.view.all', 'View all transactions', 'wallet'),
  ('creator.dashboard.view.own', 'View creator dashboard', 'creator'),
  ('creator.revenue.view.own', 'View own revenue', 'creator'),
  ('creator.payout.request', 'Request payout', 'creator'),
  ('creator.payout.view.own', 'View own payouts', 'creator'),
  ('finance.dashboard.view', 'View finance dashboard', 'finance'),
  ('finance.payout.view', 'View payouts', 'finance'),
  ('finance.payout.approve', 'Approve payout', 'finance'),
  ('finance.payout.reject', 'Reject payout', 'finance'),
  ('finance.wallet.adjust', 'Finance wallet adjust', 'finance'),
  ('finance.refund.create', 'Create finance refund', 'finance'),
  ('report.create', 'Create report', 'moderation'),
  ('report.review', 'Review report', 'moderation'),
  ('moderation.action.create', 'Create moderation action', 'moderation'),
  ('moderation.ban_user', 'Ban user', 'moderation'),
  ('moderation.unban_user', 'Unban user', 'moderation'),
  ('admin.dashboard.view', 'View admin dashboard', 'admin'),
  ('admin.user.view', 'View users', 'admin'),
  ('admin.user.update', 'Update users', 'admin'),
  ('admin.user.ban', 'Ban users', 'admin'),
  ('admin.user.role.assign', 'Assign user roles', 'admin'),
  ('admin.settings.view', 'View admin settings', 'admin'),
  ('admin.settings.update', 'Update admin settings', 'admin'),
  ('admin.audit.view', 'View audit logs', 'admin'),
  ('notification.view.own', 'View own notifications', 'notification'),
  ('notification.send.system', 'Send system notification', 'notification'),
  ('notification.settings.update.own', 'Update notification settings', 'notification'),
  ('feedback.create', 'Create feedback', 'feedback'),
  ('feedback.view.all', 'View all feedback', 'feedback'),
  ('feedback.update.status', 'Update feedback status', 'feedback')
on conflict (code) do update set
  name = excluded.name,
  group_key = excluded.group_key;

-- ---------------------------------------------------------------------------
-- Seed roles
-- ---------------------------------------------------------------------------
insert into public.roles (code, name, description, is_system) values
  ('guest', 'Guest', 'Unauthenticated visitor', true),
  ('reader', 'Reader', 'Default registered reader', true),
  ('creator', 'Creator', 'Story author', true),
  ('verified_creator', 'Verified creator', 'Verified author with VIP tools', true),
  ('vip_user', 'VIP user', 'VIP subscriber perks', true),
  ('banned_user', 'Banned user', 'Restricted write access', true),
  ('moderator', 'Moderator', 'Community moderation', true),
  ('content_admin', 'Content admin', 'Content approval team', true),
  ('finance_admin', 'Finance admin', 'Finance operations', true),
  ('support_admin', 'Support admin', 'User support', true),
  ('admin', 'Admin', 'Platform administrator', true),
  ('super_admin', 'Super admin', 'Elevated platform admin', true),
  ('owner', 'Owner', 'Platform owner', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system;

-- Helper: map role code -> permission codes
create or replace function public._rbac_seed_role_permissions(
  p_role_code text,
  p_permission_codes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_perm_code text;
  v_perm_id uuid;
begin
  select id into v_role_id from public.roles where code = p_role_code;
  if v_role_id is null then
    return;
  end if;

  foreach v_perm_code in array p_permission_codes loop
    select id into v_perm_id from public.permissions where code = v_perm_code;
    if v_perm_id is not null then
      insert into public.role_permissions (role_id, permission_id)
      values (v_role_id, v_perm_id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- reader permissions
select public._rbac_seed_role_permissions('reader', array[
  'comment.create', 'reaction.create', 'reaction.delete.own',
  'follow.create', 'follow.delete.own', 'save.create', 'save.delete.own',
  'wallet.view.own', 'wallet.topup', 'wallet.purchase', 'wallet.tip',
  'wallet.transaction.view.own', 'report.create',
  'notification.view.own', 'notification.settings.update.own', 'feedback.create',
  'chapter.purchase'
]);

-- creator = reader + creator perms
select public._rbac_seed_role_permissions('creator', array[
  'comment.create', 'reaction.create', 'reaction.delete.own',
  'follow.create', 'follow.delete.own', 'save.create', 'save.delete.own',
  'wallet.view.own', 'wallet.topup', 'wallet.purchase', 'wallet.tip',
  'wallet.transaction.view.own', 'report.create',
  'notification.view.own', 'notification.settings.update.own', 'feedback.create',
  'chapter.purchase',
  'story.create', 'story.update.own', 'story.delete.own', 'story.publish.own',
  'chapter.create', 'chapter.update.own', 'chapter.delete.own', 'chapter.publish.own',
  'creator.dashboard.view.own', 'creator.revenue.view.own', 'creator.payout.request'
]);

select public._rbac_seed_role_permissions('verified_creator', array[
  'comment.create', 'reaction.create', 'reaction.delete.own',
  'follow.create', 'follow.delete.own', 'save.create', 'save.delete.own',
  'wallet.view.own', 'wallet.topup', 'wallet.purchase', 'wallet.tip',
  'wallet.transaction.view.own', 'report.create',
  'notification.view.own', 'notification.settings.update.own', 'feedback.create',
  'chapter.purchase',
  'story.create', 'story.update.own', 'story.delete.own', 'story.publish.own',
  'chapter.create', 'chapter.update.own', 'chapter.delete.own', 'chapter.publish.own',
  'creator.dashboard.view.own', 'creator.revenue.view.own', 'creator.payout.request',
  'chapter.set_vip', 'creator.payout.view.own'
]);

select public._rbac_seed_role_permissions('moderator', array[
  'report.review', 'comment.moderate', 'community.post.moderate',
  'community.group.moderate', 'moderation.action.create', 'moderation.ban_user'
]);

select public._rbac_seed_role_permissions('content_admin', array[
  'story.approve', 'story.reject', 'story.feature', 'story.moderate',
  'chapter.set_vip', 'community.group.approve'
]);

select public._rbac_seed_role_permissions('finance_admin', array[
  'finance.dashboard.view', 'finance.payout.view', 'finance.payout.approve',
  'finance.payout.reject', 'finance.wallet.adjust', 'finance.refund.create',
  'wallet.transaction.view.all'
]);

select public._rbac_seed_role_permissions('support_admin', array[
  'admin.user.view', 'feedback.view.all', 'feedback.update.status',
  'wallet.transaction.view.all'
]);

select public._rbac_seed_role_permissions('admin', array[
  'admin.dashboard.view', 'admin.user.view', 'admin.user.update', 'admin.user.ban',
  'admin.settings.view', 'admin.settings.update', 'admin.audit.view',
  'report.review', 'comment.moderate', 'community.post.moderate',
  'community.group.moderate', 'moderation.action.create', 'moderation.ban_user',
  'moderation.unban_user',
  'story.approve', 'story.reject', 'story.feature', 'story.moderate',
  'chapter.set_vip', 'community.group.approve',
  'admin.user.view', 'feedback.view.all', 'feedback.update.status'
]);

select public._rbac_seed_role_permissions('super_admin', array[
  'admin.user.role.assign',
  'admin.dashboard.view', 'admin.user.view', 'admin.user.update', 'admin.user.ban',
  'admin.settings.view', 'admin.settings.update', 'admin.audit.view',
  'finance.dashboard.view',
  'report.review', 'comment.moderate', 'community.post.moderate',
  'community.group.moderate', 'moderation.action.create', 'moderation.ban_user',
  'moderation.unban_user',
  'story.approve', 'story.reject', 'story.feature', 'story.moderate',
  'chapter.set_vip', 'community.group.approve',
  'feedback.view.all', 'feedback.update.status'
]);

-- owner: all permissions
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'owner'
on conflict do nothing;

drop function if exists public._rbac_seed_role_permissions(text, text[]);

-- ---------------------------------------------------------------------------
-- Migrate legacy profiles.role -> user_roles
-- ---------------------------------------------------------------------------
insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.code = 'reader'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select cp.user_id, r.id
from public.creator_profiles cp
join public.roles r on r.code = 'creator'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.code = 'moderator'
where p.role::text = 'moderator'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.code = 'admin'
where p.role::text = 'admin'
on conflict do nothing;

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
join public.roles r on r.code = 'owner'
where p.role::text = 'founder'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- RLS: RBAC tables
-- ---------------------------------------------------------------------------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.user_bans enable row level security;

drop policy if exists "Authenticated can read roles" on public.roles;
create policy "Authenticated can read roles"
  on public.roles for select
  to authenticated
  using (true);

drop policy if exists "Owner can manage roles" on public.roles;
create policy "Owner can manage roles"
  on public.roles for all
  to authenticated
  using (public.user_has_any_role(auth.uid(), array['owner', 'super_admin']))
  with check (public.user_has_any_role(auth.uid(), array['owner', 'super_admin']));

drop policy if exists "Authenticated can read permissions" on public.permissions;
create policy "Authenticated can read permissions"
  on public.permissions for select
  to authenticated
  using (true);

drop policy if exists "Owner can manage permissions" on public.permissions;
create policy "Owner can manage permissions"
  on public.permissions for all
  to authenticated
  using (public.user_has_role(auth.uid(), 'owner'))
  with check (public.user_has_role(auth.uid(), 'owner'));

drop policy if exists "Authenticated can read role permissions" on public.role_permissions;
create policy "Authenticated can read role permissions"
  on public.role_permissions for select
  to authenticated
  using (true);

drop policy if exists "Owner can manage role permissions" on public.role_permissions;
create policy "Owner can manage role permissions"
  on public.role_permissions for all
  to authenticated
  using (public.user_has_role(auth.uid(), 'owner'))
  with check (public.user_has_role(auth.uid(), 'owner'));

drop policy if exists "Users can read own roles" on public.user_roles;
create policy "Users can read own roles"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()));

drop policy if exists "Role assigners can manage user roles" on public.user_roles;
create policy "Role assigners can manage user roles"
  on public.user_roles for all
  to authenticated
  using (public.can_assign_roles(auth.uid()) or public.is_admin_or_founder(auth.uid()))
  with check (public.can_assign_roles(auth.uid()) or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Audit viewers can read logs" on public.admin_audit_logs;
create policy "Audit viewers can read logs"
  on public.admin_audit_logs for select
  to authenticated
  using (public.can_view_admin_audit(auth.uid()));

drop policy if exists "Staff can insert audit logs" on public.admin_audit_logs;
create policy "Staff can insert audit logs"
  on public.admin_audit_logs for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and (
      public.can_view_admin_audit(auth.uid())
      or public.is_staff_moderator(auth.uid())
      or public.is_finance_staff(auth.uid())
    )
  );

drop policy if exists "Staff can read bans" on public.user_bans;
create policy "Staff can read bans"
  on public.user_bans for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_permission(auth.uid(), 'admin.user.ban')
    or public.user_has_permission(auth.uid(), 'moderation.ban_user')
    or public.is_staff_moderator(auth.uid())
  );

drop policy if exists "Ban managers can manage bans" on public.user_bans;
create policy "Ban managers can manage bans"
  on public.user_bans for all
  to authenticated
  using (
    public.user_has_permission(auth.uid(), 'admin.user.ban')
    or public.user_has_permission(auth.uid(), 'moderation.ban_user')
    or public.user_has_any_role(auth.uid(), array['admin', 'super_admin', 'owner'])
  )
  with check (
    public.user_has_permission(auth.uid(), 'admin.user.ban')
    or public.user_has_permission(auth.uid(), 'moderation.ban_user')
    or public.user_has_any_role(auth.uid(), array['admin', 'super_admin', 'owner'])
  );

-- ---------------------------------------------------------------------------
-- Tighten write policies for banned users
-- ---------------------------------------------------------------------------
drop policy if exists "Users can create own comments" on public.comments;
create policy "Users can create own comments"
  on public.comments for insert
  with check (
    auth.uid() = user_id
    and not public.is_user_write_blocked(auth.uid())
  );

drop policy if exists "Users can create own community posts" on public.community_posts;
create policy "Users can create own community posts"
  on public.community_posts for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and not public.is_user_write_blocked(auth.uid())
  );

drop policy if exists "Creators can create own stories" on public.stories;
create policy "Creators can create own stories"
  on public.stories for insert
  with check (
    status in ('draft', 'pending')
    and visibility in ('public', 'private')
    and not public.is_user_write_blocked(auth.uid())
    and exists (
      select 1 from public.creator_profiles
      where creator_profiles.id = stories.creator_id
        and creator_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Creators can create own episodes" on public.episodes;
create policy "Creators can create own episodes"
  on public.episodes for insert
  with check (
    status in ('draft', 'pending')
    and not public.is_user_write_blocked(auth.uid())
    and exists (
      select 1
      from public.stories
      join public.creator_profiles on creator_profiles.id = stories.creator_id
      where stories.id = episodes.story_id
        and creator_profiles.user_id = auth.uid()
    )
  );

-- Extend wallet read for finance staff with permission
drop policy if exists "User reads own wallet" on public.user_wallets;
create policy "User reads own wallet"
  on public.user_wallets for select
  using (
    auth.uid() = user_id
    or public.is_admin_or_founder(auth.uid())
    or public.is_finance_staff(auth.uid())
  );
