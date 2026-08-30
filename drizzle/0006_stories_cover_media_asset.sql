-- Link story cover to storage_assets (media_assets view) for migration-safe URLs.
alter table public.stories
  add column if not exists cover_media_asset_id uuid references public.storage_assets(id) on delete set null;

create index if not exists idx_stories_cover_media_asset_id
  on public.stories(cover_media_asset_id)
  where cover_media_asset_id is not null;

comment on column public.stories.cover_media_asset_id is
  'Primary cover storage_assets id. stories.cover_url may hold object key or legacy URL; resolve at read time.';
