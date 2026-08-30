alter table public.profiles
  add column if not exists avatar_media_id uuid references public.storage_assets(id) on delete set null;

create index if not exists idx_profiles_avatar_media_id
  on public.profiles(avatar_media_id)
  where avatar_media_id is not null;

comment on column public.profiles.avatar_media_id is
  'Primary avatar storage_assets id. profiles.avatar_url may hold object key; resolve URL at read time.';
