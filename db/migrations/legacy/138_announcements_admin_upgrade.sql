-- Extend platform_announcements for admin upgrade (audience, SEO, scheduling)

alter table public.platform_announcements
  add column if not exists excerpt text,
  add column if not exists audience_type text not null default 'all',
  add column if not exists expires_at timestamptz,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists canonical_path text,
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists og_image_url text,
  add column if not exists follow_links boolean not null default true,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

alter table public.platform_announcements
  drop constraint if exists platform_announcements_audience_type_check;

alter table public.platform_announcements
  add constraint platform_announcements_audience_type_check check (
    audience_type in (
      'all', 'creators', 'readers', 'monetized_creators', 'published_creators', 'custom'
    )
  );

create index if not exists platform_announcements_audience_type_idx
  on public.platform_announcements(audience_type);

create index if not exists platform_announcements_visibility_idx
  on public.platform_announcements(visibility);
