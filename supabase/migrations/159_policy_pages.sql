-- Migration 159: Policy pages management — public legal pages with versioning

-- ---------------------------------------------------------------------------
-- policy_pages
-- ---------------------------------------------------------------------------
create table if not exists public.policy_pages (
  id uuid primary key default gen_random_uuid(),
  public_code text unique,
  slug text not null unique,
  title text not null,
  summary text,
  content text not null default '',
  policy_type text not null,
  status text not null default 'draft',
  visibility text not null default 'public',
  version integer not null default 1,
  is_required boolean not null default false,
  effective_date date,
  seo_title text,
  seo_description text,
  seo_indexable boolean not null default true,
  canonical_path text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint policy_pages_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint policy_pages_visibility_check check (
    visibility in ('public', 'internal')
  ),
  constraint policy_pages_type_check check (
    policy_type in (
      'account', 'content', 'creator', 'monetization',
      'community', 'privacy', 'advertising'
    )
  )
);

create index if not exists policy_pages_status_idx on public.policy_pages(status);
create index if not exists policy_pages_type_idx on public.policy_pages(policy_type);
create index if not exists policy_pages_published_at_idx on public.policy_pages(published_at desc nulls last);

-- ---------------------------------------------------------------------------
-- policy_versions
-- ---------------------------------------------------------------------------
create table if not exists public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.policy_pages(id) on delete cascade,
  version integer not null,
  title text not null,
  summary text,
  content text not null,
  change_note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint policy_versions_policy_version_uidx unique (policy_id, version)
);

create index if not exists policy_versions_policy_id_idx on public.policy_versions(policy_id);

-- ---------------------------------------------------------------------------
-- policy_acceptances (future consent flow)
-- ---------------------------------------------------------------------------
create table if not exists public.policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  policy_id uuid not null references public.policy_pages(id) on delete cascade,
  policy_version integer not null,
  accepted_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  constraint policy_acceptances_user_policy_version_uidx unique (user_id, policy_id, policy_version)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.policy_pages enable row level security;
alter table public.policy_versions enable row level security;
alter table public.policy_acceptances enable row level security;

create policy policy_pages_public_read on public.policy_pages
  for select
  using (status = 'published' and visibility = 'public');

create policy policy_pages_staff_all on public.policy_pages
  for all
  using (public.can_manage_content_posts())
  with check (public.can_manage_content_posts());

create policy policy_versions_staff_read on public.policy_versions
  for select
  using (public.can_manage_content_posts());

create policy policy_versions_staff_insert on public.policy_versions
  for insert
  with check (public.can_manage_content_posts());

create policy policy_acceptances_own_read on public.policy_acceptances
  for select
  using (auth.uid() = user_id);

create policy policy_acceptances_own_insert on public.policy_acceptances
  for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, description, group_key)
values
  ('policies.view', 'Xem chính sách', 'Xem danh sách trang chính sách trong admin', 'content_hub'),
  ('policies.create', 'Tạo chính sách', 'Tạo trang chính sách mới', 'content_hub'),
  ('policies.edit', 'Sửa chính sách', 'Chỉnh sửa trang chính sách', 'content_hub'),
  ('policies.publish', 'Xuất bản chính sách', 'Publish/archive trang chính sách', 'content_hub'),
  ('policies.version.view', 'Xem lịch sử chính sách', 'Xem version history của chính sách', 'content_hub')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code in ('content_admin', 'admin', 'super_admin', 'owner')
  and p.code in (
    'policies.view', 'policies.create', 'policies.edit',
    'policies.publish', 'policies.version.view'
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Seed default policy pages (draft — admin can publish after editing)
-- ---------------------------------------------------------------------------
insert into public.policy_pages (slug, title, summary, content, policy_type, status, is_required, seo_indexable)
values
  (
    'dieu-khoan-su-dung',
    'Điều khoản sử dụng',
    'Điều khoản và điều kiện sử dụng nền tảng ChapMee.',
    E'## Điều khoản sử dụng\n\nNội dung đang được cập nhật. Vui lòng quay lại sau hoặc liên hệ đội ngũ ChapMee nếu cần hỗ trợ.',
    'account', 'draft', true, true
  ),
  (
    'chinh-sach-quyen-rieng-tu',
    'Chính sách quyền riêng tư',
    'Cách ChapMee thu thập, sử dụng và bảo vệ dữ liệu cá nhân.',
    E'## Chính sách quyền riêng tư\n\nNội dung đang được cập nhật.',
    'privacy', 'draft', true, true
  ),
  (
    'quy-dinh-cong-dong',
    'Quy định cộng đồng',
    'Quy tắc ứng xử và tương tác trên ChapMee.',
    E'## Quy định cộng đồng\n\nNội dung đang được cập nhật.',
    'community', 'draft', true, true
  ),
  (
    'chinh-sach-noi-dung',
    'Chính sách nội dung',
    'Tiêu chuẩn nội dung được phép trên nền tảng.',
    E'## Chính sách nội dung\n\nNội dung đang được cập nhật.',
    'content', 'draft', false, true
  ),
  (
    'chinh-sach-tac-gia',
    'Chính sách tác giả',
    'Quyền và trách nhiệm của tác giả trên ChapMee.',
    E'## Chính sách tác giả\n\nNội dung đang được cập nhật.',
    'creator', 'draft', false, true
  ),
  (
    'chinh-sach-kiem-tien',
    'Chính sách kiếm tiền',
    'Quy định về kiếm tiền từ nội dung trên ChapMee.',
    E'## Chính sách kiếm tiền\n\nNội dung đang được cập nhật.',
    'monetization', 'draft', false, true
  ),
  (
    'chinh-sach-coin',
    'Chính sách Coin',
    'Quy định về Coin và giao dịch nội bộ.',
    E'## Chính sách Coin\n\nNội dung đang được cập nhật.',
    'monetization', 'draft', false, true
  ),
  (
    'chinh-sach-hoan-coin',
    'Chính sách hoàn Coin',
    'Điều kiện và quy trình hoàn Coin.',
    E'## Chính sách hoàn Coin\n\nNội dung đang được cập nhật.',
    'monetization', 'draft', false, true
  ),
  (
    'chinh-sach-rut-tien',
    'Chính sách rút tiền',
    'Quy định rút tiền dành cho tác giả.',
    E'## Chính sách rút tiền\n\nNội dung đang được cập nhật.',
    'monetization', 'draft', false, true
  ),
  (
    'chinh-sach-xu-ly-vi-pham',
    'Chính sách xử lý vi phạm',
    'Thang mức xử lý khi phát hiện vi phạm.',
    E'## Chính sách xử lý vi phạm\n\nNội dung đang được cập nhật.',
    'content', 'draft', false, true
  ),
  (
    'chinh-sach-ban-quyen',
    'Chính sách bản quyền',
    'Quy định về bản quyền và quyền sở hữu trí tuệ.',
    E'## Chính sách bản quyền\n\nNội dung đang được cập nhật.',
    'content', 'draft', false, true
  ),
  (
    'chinh-sach-bao-cao-noi-dung',
    'Chính sách báo cáo nội dung',
    'Cách báo cáo nội dung vi phạm trên ChapMee.',
    E'## Chính sách báo cáo nội dung\n\nNội dung đang được cập nhật.',
    'content', 'draft', false, true
  ),
  (
    'chinh-sach-xac-thuc-tai-khoan',
    'Chính sách xác thực tài khoản',
    'Quy trình và tiêu chí xác thực tài khoản tác giả.',
    E'## Chính sách xác thực tài khoản\n\nNội dung đang được cập nhật.',
    'account', 'draft', false, true
  ),
  (
    'chinh-sach-tin-nhan-an-toan',
    'Chính sách tin nhắn an toàn',
    'Quy tắc tin nhắn và an toàn giao tiếp trên ChapMee.',
    E'## Chính sách tin nhắn an toàn\n\nNội dung đang được cập nhật.',
    'community', 'draft', false, true
  ),
  (
    'chinh-sach-quang-cao',
    'Chính sách quảng cáo',
    'Quy định về quảng cáo và nội dung tài trợ (sẽ cập nhật khi triển khai).',
    E'## Chính sách quảng cáo\n\nNội dung đang được cập nhật khi tính năng quảng cáo được bật.',
    'advertising', 'draft', false, false
  )
on conflict (slug) do nothing;

-- Backfill public_code for seeded policies
do $$
declare
  r record;
  code text;
  attempts int;
begin
  for r in select id, slug from public.policy_pages where public_code is null loop
    attempts := 0;
    loop
      code := public.generate_numeric_public_code(10);
      begin
        update public.policy_pages
        set public_code = code,
            canonical_path = '/chinh-sach/' || r.slug || '-pl.' || code
        where id = r.id;
        exit;
      exception when unique_violation then
        attempts := attempts + 1;
        if attempts >= 8 then
          raise exception 'Could not assign public_code for policy %', r.slug;
        end if;
      end;
    end loop;
  end loop;
end $$;

-- SEO route seeds
insert into public.seo_rules (route_pattern, page_type, indexable, follow_links, include_sitemap, canonical_mode, priority, change_frequency, is_active, notes)
values
  ('/chinh-sach', 'policy_catalog', true, true, true, 'self', 0.6, 'weekly', true, 'Policy catalog'),
  ('/chinh-sach/*', 'policy_page', true, true, true, 'self', 0.5, 'monthly', true, 'Individual policy pages')
on conflict (route_pattern) do nothing;
