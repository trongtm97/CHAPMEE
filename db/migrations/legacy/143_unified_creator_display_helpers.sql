-- Helpers for unified creator display (profile-backed, not pen_name).

create or replace function public.resolve_creator_display_name(
  p_display_name text,
  p_username text,
  p_pen_name text
)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(trim(p_display_name), ''),
    nullif(trim(p_username), ''),
    nullif(trim(p_pen_name), ''),
    'Tác giả'
  );
$$;

comment on function public.resolve_creator_display_name is
  'Canonical author label: profiles.display_name → username → legacy pen_name.';

-- Optional: expose creator public card via profiles (for reporting / admin).
create or replace view public.creator_public_identity as
select
  cp.id as creator_id,
  cp.user_id,
  cp.status as creator_status,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio,
  p.is_verified,
  public.resolve_creator_display_name(p.display_name, p.username, cp.pen_name) as public_display_name
from public.creator_profiles cp
join public.profiles p on p.id = cp.user_id;

grant select on public.creator_public_identity to anon, authenticated;
