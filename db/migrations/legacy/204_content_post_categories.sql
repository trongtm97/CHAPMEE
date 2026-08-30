-- Migration 204: Content post categories (Bài viết chuyên mục) + SEO

-- ---------------------------------------------------------------------------
-- content_post_categories
-- ---------------------------------------------------------------------------
create table if not exists public.content_post_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.content_post_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  status text not null default 'active',

  -- Media
  cover_image_url text,
  cover_media_asset_id uuid,

  -- SEO governance
  seo_title text,
  seo_description text,
  canonical_url text,
  indexable boolean not null default true,
  robots text not null default 'index,follow',
  og_title text,
  og_description text,
  og_image_url text,
  og_image_media_asset_id uuid,

  -- URL identity (optional, for future URL suffixes / tracking)
  public_code text not null default public.generate_numeric_public_code(10),

  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint content_post_categories_status_check check (status in ('active', 'hidden')),
  constraint content_post_categories_public_code_numeric_check check (public_code ~ '^[0-9]{8,12}$'),
  constraint content_post_categories_robots_check check (robots in ('index,follow', 'noindex,follow', 'noindex,nofollow'))
);

create unique index if not exists content_post_categories_public_code_uidx
  on public.content_post_categories (public_code);

create index if not exists idx_content_post_categories_parent_id
  on public.content_post_categories (parent_id)
  where parent_id is not null;

create index if not exists idx_content_post_categories_active_sort
  on public.content_post_categories (status, sort_order, created_at desc)
  where deleted_at is null;

drop trigger if exists content_post_categories_set_updated_at on public.content_post_categories;
create trigger content_post_categories_set_updated_at
before update on public.content_post_categories
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- content_post_category_links (many-to-many)
-- ---------------------------------------------------------------------------
create table if not exists public.content_post_category_links (
  post_id uuid not null references public.admin_content_posts(id) on delete cascade,
  category_id uuid not null references public.content_post_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, category_id)
);

create index if not exists idx_content_post_category_links_category_id
  on public.content_post_category_links (category_id);

create index if not exists idx_content_post_category_links_post_id
  on public.content_post_category_links (post_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.content_post_categories enable row level security;
alter table public.content_post_category_links enable row level security;

-- Public read active categories (used for /bai-viet/danh-muc/[slug])
drop policy if exists "Public read active content post categories" on public.content_post_categories;
create policy "Public read active content post categories"
  on public.content_post_categories for select
  to anon, authenticated
  using (deleted_at is null and status = 'active');

-- Staff manage categories (reuse content.post permissions)
drop policy if exists "Staff manage content post categories" on public.content_post_categories;
create policy "Staff manage content post categories"
  on public.content_post_categories for all
  to authenticated
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'content.post.update')
    or public.user_has_permission(auth.uid(), 'content.post.create')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'content.post.update')
    or public.user_has_permission(auth.uid(), 'content.post.create')
  );

-- Staff manage category links
drop policy if exists "Staff manage content post category links" on public.content_post_category_links;
create policy "Staff manage content post category links"
  on public.content_post_category_links for all
  to authenticated
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'content.post.update')
    or public.user_has_permission(auth.uid(), 'content.post.create')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'content.post.update')
    or public.user_has_permission(auth.uid(), 'content.post.create')
  );

