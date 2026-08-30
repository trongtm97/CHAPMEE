-- SEO Control Center upgrade: extended rules + templates + change logs

alter table public.seo_rules
  add column if not exists include_sitemap boolean not null default true;

alter table public.seo_rules
  add column if not exists priority numeric(2,1) not null default 0.5;

alter table public.seo_rules
  add column if not exists change_frequency text not null default 'weekly';

alter table public.seo_rules
  add column if not exists is_active boolean not null default true;

alter table public.seo_rules
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.seo_rules
  drop constraint if exists seo_rules_canonical_mode_check;

alter table public.seo_rules
  add constraint seo_rules_canonical_mode_check check (
    canonical_mode in ('self', 'custom', 'parent', 'none')
  );

create table if not exists public.seo_metadata_templates (
  id uuid primary key default gen_random_uuid(),
  page_type text not null unique,
  title_template text,
  description_template text,
  og_title_template text,
  og_description_template text,
  twitter_title_template text,
  twitter_description_template text,
  robots_directive text,
  canonical_mode text not null default 'self',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.seo_heading_rules (
  id uuid primary key default gen_random_uuid(),
  page_type text not null unique,
  route_example text,
  expected_h1 text not null,
  allowed_h2_json jsonb not null default '[]'::jsonb,
  allowed_h3_json jsonb not null default '[]'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.seo_change_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  action text not null,
  before_json jsonb not null default '{}'::jsonb,
  after_json jsonb not null default '{}'::jsonb,
  changed_by uuid references public.profiles(id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists seo_change_logs_created_at_idx
  on public.seo_change_logs(created_at desc);

create table if not exists public.seo_sitemap_snapshots (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  total_urls integer not null default 0,
  included_count integer not null default 0,
  excluded_count integer not null default 0,
  error_count integer not null default 0,
  snapshot_json jsonb not null default '{}'::jsonb
);

alter table public.seo_metadata_templates enable row level security;
alter table public.seo_heading_rules enable row level security;
alter table public.seo_change_logs enable row level security;
alter table public.seo_sitemap_snapshots enable row level security;

drop policy if exists "Staff manage seo metadata templates" on public.seo_metadata_templates;
create policy "Staff manage seo metadata templates"
  on public.seo_metadata_templates for all
  to authenticated
  using (public.can_manage_seo_rules(auth.uid()))
  with check (public.can_manage_seo_rules(auth.uid()));

drop policy if exists "Staff manage seo heading rules" on public.seo_heading_rules;
create policy "Staff manage seo heading rules"
  on public.seo_heading_rules for all
  to authenticated
  using (public.can_manage_seo_rules(auth.uid()))
  with check (public.can_manage_seo_rules(auth.uid()));

drop policy if exists "Staff read seo change logs" on public.seo_change_logs;
create policy "Staff read seo change logs"
  on public.seo_change_logs for select
  to authenticated
  using (public.can_manage_seo_rules(auth.uid()));

drop policy if exists "Staff insert seo change logs" on public.seo_change_logs;
create policy "Staff insert seo change logs"
  on public.seo_change_logs for insert
  to authenticated
  with check (public.can_manage_seo_rules(auth.uid()));

drop policy if exists "Staff manage seo sitemap snapshots" on public.seo_sitemap_snapshots;
create policy "Staff manage seo sitemap snapshots"
  on public.seo_sitemap_snapshots for all
  to authenticated
  using (public.can_manage_seo_rules(auth.uid()))
  with check (public.can_manage_seo_rules(auth.uid()));

-- Default ChapMee SEO policy (safe seed)
insert into public.seo_rules (
  route_pattern, page_type, indexable, follow_links, include_sitemap, notes, priority, change_frequency
) values
  ('/reels', 'reels', true, true, true, 'Reels feed', 0.8, 'daily'),
  ('/reels/*', 'reels', true, true, true, 'Reels public content', 0.7, 'daily'),
  ('/discover', 'discover', true, true, true, 'Discover', 0.9, 'daily'),
  ('/danh-muc-truyen', 'story_catalog', true, true, true, 'Danh mục truyện', 0.8, 'weekly'),
  ('/danh-muc-truyen/*', 'story_catalog', true, true, true, 'Danh mục truyện chi tiết', 0.7, 'weekly'),
  ('/bang-xep-hang', 'ranking', true, true, true, 'Bảng xếp hạng', 0.7, 'daily'),
  ('/cong-dong', 'community', true, true, true, 'Cộng đồng public', 0.6, 'weekly'),
  ('/truyen', 'story_catalog', true, true, true, 'Catalog truyện', 0.9, 'daily'),
  ('/truyen/*', 'story', true, true, true, 'Chi tiết truyện', 0.8, 'weekly'),
  ('/truyen/*/chuong/*', 'chapter', true, true, true, 'Chương truyện', 0.7, 'weekly'),
  ('/tac-gia/*', 'author', true, true, true, 'Tác giả', 0.7, 'weekly'),
  ('/bai-viet', 'content_post_catalog', true, true, true, 'Danh mục bài viết', 0.7, 'weekly'),
  ('/bai-viet/*', 'content_post', true, true, true, 'Bài viết', 0.6, 'monthly'),
  ('/thong-bao', 'announcement_catalog', true, true, true, 'Danh sách thông báo public', 0.5, 'weekly'),
  ('/thong-bao/*', 'announcement', false, false, false, 'Chi tiết thông báo — noindex mặc định', 0.3, 'monthly'),
  ('/the-loai/*', 'category', true, true, true, 'Thể loại', 0.7, 'weekly'),
  ('/tim-kiem', 'search', false, false, false, 'Tìm kiếm — noindex mặc định', 0.2, 'never'),
  ('/admin', 'admin', false, false, false, 'Admin root', 0.1, 'never'),
  ('/admin/*', 'admin', false, false, false, 'Admin — noindex', 0.1, 'never'),
  ('/studio', 'studio', false, false, false, 'Studio root', 0.1, 'never'),
  ('/studio/*', 'studio', false, false, false, 'Studio — noindex', 0.1, 'never'),
  ('/settings', 'settings', false, false, false, 'Settings', 0.1, 'never'),
  ('/settings/*', 'settings', false, false, false, 'Settings — noindex', 0.1, 'never'),
  ('/me', 'private_user', false, false, false, 'Me root', 0.1, 'never'),
  ('/me/*', 'private_user', false, false, false, 'Trang cá nhân — noindex', 0.1, 'never'),
  ('/messages', 'messages', false, false, false, 'Messages', 0.1, 'never'),
  ('/messages/*', 'messages', false, false, false, 'Messages — noindex', 0.1, 'never'),
  ('/notifications', 'notifications', false, false, false, 'Notifications', 0.1, 'never'),
  ('/notifications/*', 'notifications', false, false, false, 'Notifications — noindex', 0.1, 'never'),
  ('/wallet', 'wallet', false, false, false, 'Wallet', 0.1, 'never'),
  ('/wallet/*', 'wallet', false, false, false, 'Wallet — noindex', 0.1, 'never'),
  ('/coin', 'coin', false, false, false, 'Coin', 0.1, 'never'),
  ('/coin/*', 'coin', false, false, false, 'Coin — noindex', 0.1, 'never'),
  ('/login', 'auth', false, false, false, 'Login', 0.1, 'never'),
  ('/register', 'auth', false, false, false, 'Register', 0.1, 'never'),
  ('/forgot-password', 'auth', false, false, false, 'Forgot password', 0.1, 'never'),
  ('/reset-password', 'auth', false, false, false, 'Reset password', 0.1, 'never'),
  ('/api/*', 'system', false, false, false, 'API — noindex', 0.1, 'never')
on conflict (route_pattern) do update set
  page_type = excluded.page_type,
  indexable = excluded.indexable,
  follow_links = excluded.follow_links,
  include_sitemap = excluded.include_sitemap,
  notes = excluded.notes,
  priority = excluded.priority,
  change_frequency = excluded.change_frequency;
