-- Unified account: one user profile = public identity = creator (no separate pen name entity).
-- Keeps creator_profiles.id for existing FKs (stories.creator_id, follows.creator_id) as 1:1 with user_id.

alter table public.profiles
  add column if not exists is_creator boolean not null default false,
  add column if not exists creator_enabled_at timestamptz,
  add column if not exists creator_status public.creator_status;

comment on column public.profiles.is_creator is 'True when user has enabled creator/writing capabilities.';
comment on column public.profiles.creator_enabled_at is 'When creator capabilities were first enabled.';
comment on column public.profiles.creator_status is 'Creator account status (active/suspended); mirrors creator_profiles.status.';

-- Backfill creator flags from existing creator_profiles (1:1 per user).
update public.profiles p
set
  is_creator = true,
  creator_enabled_at = coalesce(p.creator_enabled_at, cp.created_at),
  creator_status = cp.status
from public.creator_profiles cp
where cp.user_id = p.id;

-- Migrate pen_name into display_name when profile has no display name.
update public.profiles p
set display_name = trim(cp.pen_name)
from public.creator_profiles cp
where cp.user_id = p.id
  and cp.pen_name is not null
  and trim(cp.pen_name) <> ''
  and (p.display_name is null or trim(p.display_name) = '');

-- Prefer profile bio; fill from creator_profiles when empty.
update public.profiles p
set bio = coalesce(nullif(trim(p.bio), ''), nullif(trim(cp.bio), ''))
from public.creator_profiles cp
where cp.user_id = p.id
  and cp.bio is not null
  and trim(cp.bio) <> ''
  and (p.bio is null or trim(p.bio) = '');

-- Story ownership by user (canonical); creator_id remains for legacy joins until fully removed in app.
alter table public.stories
  add column if not exists owner_user_id uuid references public.profiles(id) on delete cascade;

create index if not exists stories_owner_user_id_idx on public.stories(owner_user_id);

update public.stories s
set owner_user_id = cp.user_id
from public.creator_profiles cp
where cp.id = s.creator_id
  and s.owner_user_id is null;

-- Keep pen_name column in sync with display_name for legacy readers (not user-facing).
create or replace function public.sync_creator_profile_pen_name_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  select coalesce(nullif(trim(new.display_name), ''), nullif(trim(new.username), ''))
  into v_display
  from public.profiles
  where id = new.id;

  if v_display is null or v_display = '' then
    return new;
  end if;

  update public.creator_profiles
  set pen_name = v_display,
      updated_at = now()
  where user_id = new.id
    and (pen_name is distinct from v_display);

  return new;
end;
$$;

drop trigger if exists profiles_sync_creator_pen_name on public.profiles;
create trigger profiles_sync_creator_pen_name
after insert or update of display_name, username on public.profiles
for each row
execute function public.sync_creator_profile_pen_name_from_profile();

-- On new story insert, set owner_user_id from creator_profiles.
create or replace function public.stories_set_owner_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_user_id is not null then
    return new;
  end if;

  select user_id into new.owner_user_id
  from public.creator_profiles
  where id = new.creator_id;

  return new;
end;
$$;

drop trigger if exists stories_set_owner_user_id_trg on public.stories;
create trigger stories_set_owner_user_id_trg
before insert or update of creator_id on public.stories
for each row
execute function public.stories_set_owner_user_id();

-- When creator profile is created, mark profile as creator.
create or replace function public.creator_profiles_mark_user_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    is_creator = true,
    creator_enabled_at = coalesce(creator_enabled_at, new.created_at),
    creator_status = new.status
  where id = new.user_id;

  if new.pen_name is not null and trim(new.pen_name) <> '' then
    update public.profiles
    set display_name = coalesce(nullif(trim(display_name), ''), trim(new.pen_name))
    where id = new.user_id
      and (display_name is null or trim(display_name) = '');
  end if;

  return new;
end;
$$;

drop trigger if exists creator_profiles_mark_user_creator_trg on public.creator_profiles;
create trigger creator_profiles_mark_user_creator_trg
after insert on public.creator_profiles
for each row
execute function public.creator_profiles_mark_user_creator();

create index if not exists profiles_is_creator_idx on public.profiles(is_creator) where is_creator = true;
