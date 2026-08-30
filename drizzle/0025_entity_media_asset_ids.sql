-- Link platform entities to storage_assets for migration-safe media references.

alter table public.admin_content_posts
  add column if not exists cover_media_asset_id uuid references public.storage_assets(id) on delete set null,
  add column if not exists og_image_media_asset_id uuid references public.storage_assets(id) on delete set null;

create index if not exists idx_admin_content_posts_cover_media_asset_id
  on public.admin_content_posts(cover_media_asset_id)
  where cover_media_asset_id is not null;

create index if not exists idx_admin_content_posts_og_image_media_asset_id
  on public.admin_content_posts(og_image_media_asset_id)
  where og_image_media_asset_id is not null;

comment on column public.admin_content_posts.cover_media_asset_id is
  'Primary cover storage_assets id. cover_image_url may hold object key legacy value.';
comment on column public.admin_content_posts.og_image_media_asset_id is
  'OG image storage_assets id. og_image_url deprecated legacy fallback.';

alter table public.platform_announcements
  add column if not exists cover_media_asset_id uuid references public.storage_assets(id) on delete set null,
  add column if not exists og_image_media_asset_id uuid references public.storage_assets(id) on delete set null;

alter table public.taxonomy_terms
  add column if not exists og_image_asset_id uuid references public.storage_assets(id) on delete set null;

create index if not exists idx_taxonomy_terms_og_image_asset_id
  on public.taxonomy_terms(og_image_asset_id)
  where og_image_asset_id is not null;

comment on column public.taxonomy_terms.og_image_asset_id is
  'OG image storage_assets id. og_image_url deprecated legacy fallback.';
