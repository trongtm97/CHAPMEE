-- Migration 134: Platform content hub — admin posts, announcements, notification campaigns, SEO governance

-- ---------------------------------------------------------------------------
-- admin_content_posts
-- ---------------------------------------------------------------------------
create table if not exists public.admin_content_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image_url text,
  category text,
  tags text[] not null default '{}',
  post_type text not null default 'article',
  status text not null default 'draft',
  seo_title text,
  seo_description text,
  canonical_url text,
  indexable boolean not null default true,
  author_admin_id uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_content_posts_post_type_check check (
    post_type in ('article', 'guide', 'seo', 'editorial', 'policy', 'news')
  ),
  constraint admin_content_posts_status_check check (
    status in ('draft', 'published', 'hidden', 'archived')
  )
);

create index if not exists admin_content_posts_status_idx on public.admin_content_posts(status);
create index if not exists admin_content_posts_slug_idx on public.admin_content_posts(slug);
create index if not exists admin_content_posts_published_at_idx on public.admin_content_posts(published_at desc nulls last);

-- ---------------------------------------------------------------------------
-- platform_announcements
-- ---------------------------------------------------------------------------
create table if not exists public.platform_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  body text,
  announcement_type text not null default 'general',
  visibility text not null default 'public',
  status text not null default 'draft',
  priority text not null default 'normal',
  indexable boolean not null default false,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_announcements_type_check check (
    announcement_type in (
      'general', 'maintenance', 'policy', 'monetization',
      'creator', 'reader', 'feature', 'warning'
    )
  ),
  constraint platform_announcements_visibility_check check (
    visibility in ('public', 'targeted', 'admin_only')
  ),
  constraint platform_announcements_status_check check (
    status in ('draft', 'published', 'scheduled', 'hidden', 'archived')
  ),
  constraint platform_announcements_priority_check check (
    priority in ('low', 'normal', 'high', 'critical')
  )
);

create index if not exists platform_announcements_status_idx on public.platform_announcements(status);
create index if not exists platform_announcements_slug_idx on public.platform_announcements(slug);
create index if not exists platform_announcements_published_at_idx on public.platform_announcements(published_at desc nulls last);

-- ---------------------------------------------------------------------------
-- notification_campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  notification_type text not null default 'system',
  channel_in_app boolean not null default true,
  channel_email boolean not null default false,
  channel_banner boolean not null default false,
  channel_popup boolean not null default false,
  target_mode text not null default 'segment',
  target_segments text[] not null default '{}',
  manual_user_ids uuid[] not null default '{}',
  status text not null default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  estimated_recipient_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_campaigns_type_check check (
    notification_type in (
      'system', 'policy', 'monetization', 'account', 'story',
      'chapter', 'event', 'warning', 'marketing'
    )
  ),
  constraint notification_campaigns_target_mode_check check (
    target_mode in ('all', 'segment', 'manual')
  ),
  constraint notification_campaigns_status_check check (
    status in ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')
  )
);

create index if not exists notification_campaigns_status_idx on public.notification_campaigns(status);
create index if not exists notification_campaigns_scheduled_at_idx on public.notification_campaigns(scheduled_at nulls last);

-- ---------------------------------------------------------------------------
-- user_notifications (campaign in-app delivery)
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid references public.notification_campaigns(id) on delete set null,
  title text not null,
  message text not null,
  notification_type text not null default 'system',
  href text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint user_notifications_type_check check (
    notification_type in (
      'system', 'policy', 'monetization', 'account', 'story',
      'chapter', 'event', 'warning', 'marketing'
    )
  )
);

create index if not exists user_notifications_user_id_idx on public.user_notifications(user_id);
create index if not exists user_notifications_user_unread_idx on public.user_notifications(user_id, is_read);
create index if not exists user_notifications_campaign_id_idx on public.user_notifications(campaign_id);
create index if not exists user_notifications_created_at_idx on public.user_notifications(created_at desc);

-- ---------------------------------------------------------------------------
-- seo_rules
-- ---------------------------------------------------------------------------
create table if not exists public.seo_rules (
  id uuid primary key default gen_random_uuid(),
  route_pattern text not null unique,
  page_type text not null,
  indexable boolean not null default true,
  follow_links boolean not null default true,
  title_template text,
  description_template text,
  canonical_mode text not null default 'self',
  custom_canonical_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seo_rules_canonical_mode_check check (
    canonical_mode in ('self', 'custom', 'none')
  )
);

create index if not exists seo_rules_page_type_idx on public.seo_rules(page_type);

-- ---------------------------------------------------------------------------
-- seo_audit_logs
-- ---------------------------------------------------------------------------
create table if not exists public.seo_audit_logs (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  page_type text,
  issue_type text not null,
  severity text not null default 'warning',
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint seo_audit_logs_severity_check check (
    severity in ('info', 'warning', 'error', 'critical')
  )
);

create index if not exists seo_audit_logs_route_idx on public.seo_audit_logs(route);
create index if not exists seo_audit_logs_created_at_idx on public.seo_audit_logs(created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_platform_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_content_posts_updated_at on public.admin_content_posts;
create trigger trg_admin_content_posts_updated_at
  before update on public.admin_content_posts
  for each row execute function public.set_platform_content_updated_at();

drop trigger if exists trg_platform_announcements_updated_at on public.platform_announcements;
create trigger trg_platform_announcements_updated_at
  before update on public.platform_announcements
  for each row execute function public.set_platform_content_updated_at();

drop trigger if exists trg_notification_campaigns_updated_at on public.notification_campaigns;
create trigger trg_notification_campaigns_updated_at
  before update on public.notification_campaigns
  for each row execute function public.set_platform_content_updated_at();

drop trigger if exists trg_seo_rules_updated_at on public.seo_rules;
create trigger trg_seo_rules_updated_at
  before update on public.seo_rules
  for each row execute function public.set_platform_content_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_content_posts(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_any_permission(input_user_id, array[
    'content.post.view', 'content.post.create', 'content.post.update'
  ])
  or public.user_has_permission(input_user_id, 'admin.dashboard.view');
$$;

create or replace function public.can_manage_platform_announcements(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_any_permission(input_user_id, array[
    'platform.announcement.view', 'platform.announcement.create', 'platform.announcement.update'
  ])
  or public.user_has_permission(input_user_id, 'admin.dashboard.view');
$$;

create or replace function public.can_manage_notification_campaigns(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_any_permission(input_user_id, array[
    'notification.campaign.view', 'notification.campaign.create', 'notification.campaign.update'
  ])
  or public.user_has_permission(input_user_id, 'admin.dashboard.view');
$$;

create or replace function public.can_manage_seo_rules(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_any_permission(input_user_id, array[
    'seo.rule.view', 'seo.rule.update'
  ])
  or public.user_has_permission(input_user_id, 'admin.dashboard.view');
$$;

grant execute on function public.can_manage_content_posts(uuid) to anon, authenticated;
grant execute on function public.can_manage_platform_announcements(uuid) to anon, authenticated;
grant execute on function public.can_manage_notification_campaigns(uuid) to anon, authenticated;
grant execute on function public.can_manage_seo_rules(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
alter table public.admin_content_posts enable row level security;
alter table public.platform_announcements enable row level security;
alter table public.notification_campaigns enable row level security;
alter table public.user_notifications enable row level security;
alter table public.seo_rules enable row level security;
alter table public.seo_audit_logs enable row level security;

-- admin_content_posts
drop policy if exists "Public read published indexable content posts" on public.admin_content_posts;
create policy "Public read published indexable content posts"
  on public.admin_content_posts for select
  to anon, authenticated
  using (status = 'published' and indexable = true);

drop policy if exists "Staff manage content posts" on public.admin_content_posts;
create policy "Staff manage content posts"
  on public.admin_content_posts for all
  to authenticated
  using (public.can_manage_content_posts(auth.uid()))
  with check (public.can_manage_content_posts(auth.uid()));

-- platform_announcements
drop policy if exists "Public read published public announcements" on public.platform_announcements;
create policy "Public read published public announcements"
  on public.platform_announcements for select
  to anon, authenticated
  using (visibility = 'public' and status = 'published');

drop policy if exists "Staff manage platform announcements" on public.platform_announcements;
create policy "Staff manage platform announcements"
  on public.platform_announcements for all
  to authenticated
  using (public.can_manage_platform_announcements(auth.uid()))
  with check (public.can_manage_platform_announcements(auth.uid()));

-- notification_campaigns
drop policy if exists "Staff manage notification campaigns" on public.notification_campaigns;
create policy "Staff manage notification campaigns"
  on public.notification_campaigns for all
  to authenticated
  using (public.can_manage_notification_campaigns(auth.uid()))
  with check (public.can_manage_notification_campaigns(auth.uid()));

-- user_notifications
drop policy if exists "Users read own user notifications" on public.user_notifications;
create policy "Users read own user notifications"
  on public.user_notifications for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users update own user notifications" on public.user_notifications;
create policy "Users update own user notifications"
  on public.user_notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Staff insert user notifications" on public.user_notifications;
create policy "Staff insert user notifications"
  on public.user_notifications for insert
  to authenticated
  with check (public.can_manage_notification_campaigns(auth.uid()));

drop policy if exists "Staff read user notifications" on public.user_notifications;
create policy "Staff read user notifications"
  on public.user_notifications for select
  to authenticated
  using (public.can_manage_notification_campaigns(auth.uid()));

-- seo_rules
drop policy if exists "Public read seo rules" on public.seo_rules;
create policy "Public read seo rules"
  on public.seo_rules for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff manage seo rules" on public.seo_rules;
create policy "Staff manage seo rules"
  on public.seo_rules for all
  to authenticated
  using (public.can_manage_seo_rules(auth.uid()))
  with check (public.can_manage_seo_rules(auth.uid()));

-- seo_audit_logs
drop policy if exists "Staff read seo audit logs" on public.seo_audit_logs;
create policy "Staff read seo audit logs"
  on public.seo_audit_logs for select
  to authenticated
  using (public.can_manage_seo_rules(auth.uid()));

drop policy if exists "Staff insert seo audit logs" on public.seo_audit_logs;
create policy "Staff insert seo audit logs"
  on public.seo_audit_logs for insert
  to authenticated
  with check (public.can_manage_seo_rules(auth.uid()));

-- ---------------------------------------------------------------------------
-- Default SEO rules
-- ---------------------------------------------------------------------------
insert into public.seo_rules (route_pattern, page_type, indexable, follow_links, notes)
values
  ('/studio/*', 'studio', false, false, 'Studio workspace — private'),
  ('/admin/*', 'admin', false, false, 'Admin dashboard — private'),
  ('/login', 'auth', false, false, 'Login page'),
  ('/register', 'auth', false, false, 'Register page'),
  ('/me', 'profile_private', false, false, 'Private profile hub'),
  ('/me/*', 'profile_private', false, false, 'Private profile pages'),
  ('/wallet', 'wallet', false, false, 'Wallet — private'),
  ('/wallet/*', 'wallet', false, false, 'Wallet — private'),
  ('/coin', 'coin', false, false, 'Coin purchase — private'),
  ('/coin/*', 'coin', false, false, 'Coin purchase — private'),
  ('/notifications', 'notifications', false, false, 'Personal notifications'),
  ('/messages', 'messages', false, false, 'Private messages'),
  ('/messages/*', 'messages', false, false, 'Private messages'),
  ('/settings', 'settings', false, false, 'User settings'),
  ('/settings/*', 'settings', false, false, 'User settings'),
  ('/discover', 'discover', true, true, 'Discover feed'),
  ('/reels', 'reels', true, true, 'Reels feed'),
  ('/reels/*', 'reels', true, true, 'Reels detail'),
  ('/truyen', 'story_catalog', true, true, 'Story catalog'),
  ('/truyen/*', 'story', true, true, 'Story pages — chapter rules handled in app'),
  ('/author/*', 'author', true, true, 'Public author profile'),
  ('/bai-viet/*', 'content_post', true, true, 'Admin content posts'),
  ('/thong-bao/*', 'announcement', false, false, 'Platform announcements — default noindex')
on conflict (route_pattern) do nothing;

-- ---------------------------------------------------------------------------
-- RBAC permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_key)
values
  ('content.post.view', 'View admin content posts', 'content_hub'),
  ('content.post.create', 'Create admin content posts', 'content_hub'),
  ('content.post.update', 'Update admin content posts', 'content_hub'),
  ('platform.announcement.view', 'View platform announcements', 'content_hub'),
  ('platform.announcement.create', 'Create platform announcements', 'content_hub'),
  ('platform.announcement.update', 'Update platform announcements', 'content_hub'),
  ('notification.campaign.view', 'View notification campaigns', 'content_hub'),
  ('notification.campaign.create', 'Create notification campaigns', 'content_hub'),
  ('notification.campaign.update', 'Update notification campaigns', 'content_hub'),
  ('seo.rule.view', 'View SEO rules', 'content_hub'),
  ('seo.rule.update', 'Update SEO rules', 'content_hub'),
  ('seo.audit.view', 'View SEO audit logs', 'content_hub')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'content.post.view', 'content.post.create', 'content.post.update',
  'platform.announcement.view', 'platform.announcement.create', 'platform.announcement.update',
  'notification.campaign.view', 'notification.campaign.create', 'notification.campaign.update',
  'seo.rule.view', 'seo.rule.update', 'seo.audit.view'
)
where r.code in ('owner', 'super_admin', 'admin', 'content_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'content.post.view', 'platform.announcement.view',
  'notification.campaign.view', 'seo.rule.view', 'seo.audit.view'
)
where r.code = 'support_admin'
on conflict do nothing;
