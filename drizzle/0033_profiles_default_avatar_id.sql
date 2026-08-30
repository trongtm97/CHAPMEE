alter table public.profiles
  add column if not exists default_avatar_id integer;

comment on column public.profiles.default_avatar_id is
  'Stable default mascot avatar index (1-30). Used when avatar_url is null.';

-- Backfill stable default avatar id for existing profiles (does not touch avatar_url).
update public.profiles
set default_avatar_id = (
  (('x' || substr(md5(id::text), 1, 8))::bit(32)::bigint % 30) + 1
)::integer
where default_avatar_id is null;

alter table public.profiles
  add constraint profiles_default_avatar_id_range
  check (default_avatar_id is null or (default_avatar_id >= 1 and default_avatar_id <= 30));
