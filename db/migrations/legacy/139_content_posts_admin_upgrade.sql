-- Extend admin_content_posts for Content Hub admin upgrade

alter table public.admin_content_posts
  add column if not exists scheduled_at timestamptz,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image_url text,
  add column if not exists robots text not null default 'index,follow',
  add column if not exists updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists view_count bigint not null default 0;

alter table public.admin_content_posts
  drop constraint if exists admin_content_posts_status_check;

alter table public.admin_content_posts
  add constraint admin_content_posts_status_check check (
    status in ('draft', 'published', 'scheduled', 'hidden', 'archived')
  );

alter table public.admin_content_posts
  drop constraint if exists admin_content_posts_robots_check;

alter table public.admin_content_posts
  add constraint admin_content_posts_robots_check check (
    robots in ('index,follow', 'noindex,follow', 'noindex,nofollow')
  );

create index if not exists admin_content_posts_deleted_at_idx
  on public.admin_content_posts(deleted_at)
  where deleted_at is null;

create index if not exists admin_content_posts_scheduled_at_idx
  on public.admin_content_posts(scheduled_at desc nulls last);
