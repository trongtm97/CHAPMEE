-- Story image metadata (variants + focal point). Upload/resize handled in app layer later.

create table public.story_images (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  original_url text,
  portrait_url text,
  landscape_url text,
  square_url text,
  thumb_url text,
  blur_url text,
  focal_x numeric not null default 0.5,
  focal_y numeric not null default 0.5,
  original_width int,
  original_height int,
  original_file_size_bytes int,
  processed_file_size_bytes int,
  mime_type text,
  storage_bucket text not null default 'story-images',
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_images_focal_x_range check (focal_x >= 0 and focal_x <= 1),
  constraint story_images_focal_y_range check (focal_y >= 0 and focal_y <= 1)
);

create index story_images_story_id_idx on public.story_images (story_id);

create index story_images_story_id_is_current_idx
  on public.story_images (story_id, is_current);

create unique index story_images_one_current_per_story_idx
  on public.story_images (story_id)
  where is_current = true;

create trigger story_images_set_updated_at
before update on public.story_images
for each row execute function public.set_updated_at();

create or replace function public.story_images_enforce_single_current()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_current then
    update public.story_images
    set
      is_current = false,
      updated_at = now()
    where story_id = new.story_id
      and id is distinct from new.id
      and is_current = true;
  end if;

  return new;
end;
$$;

create trigger story_images_single_current
before insert or update of is_current on public.story_images
for each row
when (new.is_current)
execute function public.story_images_enforce_single_current();

alter table public.story_images enable row level security;

create or replace function public.is_story_owner(input_story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = input_story_id
      and creator_profiles.user_id = auth.uid()
  );
$$;

grant execute on function public.is_story_owner(uuid) to authenticated, anon;

-- Public: current image for public approved/published stories only.
create policy "Public read current story images"
on public.story_images
for select
using (
  is_current = true
  and public.is_public_story(story_id)
);

create policy "Story owners read own story images"
on public.story_images
for select
using (public.is_story_owner(story_id));

create policy "Staff read all story images"
on public.story_images
for select
using (public.current_profile_role() in ('admin', 'moderator'));

create policy "Story owners insert story images"
on public.story_images
for insert
to authenticated
with check (public.is_story_owner(story_id));

create policy "Staff insert story images"
on public.story_images
for insert
to authenticated
with check (public.current_profile_role() in ('admin', 'moderator'));

create policy "Story owners update own story images"
on public.story_images
for update
to authenticated
using (public.is_story_owner(story_id))
with check (public.is_story_owner(story_id));

create policy "Staff update story images"
on public.story_images
for update
to authenticated
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

create policy "Story owners delete own story images"
on public.story_images
for delete
to authenticated
using (public.is_story_owner(story_id));

create policy "Staff delete story images"
on public.story_images
for delete
to authenticated
using (public.current_profile_role() in ('admin', 'moderator'));

-- Storage bucket: story-images/{storyId}/{imageId}/{variant}.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-images',
  'story-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Story images are publicly accessible"
on storage.objects
for select
using (bucket_id = 'story-images');

create policy "Story owners upload story images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'story-images'
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id::text = (storage.foldername(name))[1]
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Story owners update story images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'story-images'
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id::text = (storage.foldername(name))[1]
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Story owners delete story images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'story-images'
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id::text = (storage.foldername(name))[1]
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Staff manage story images storage"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'story-images'
  and public.current_profile_role() in ('admin', 'moderator')
)
with check (
  bucket_id = 'story-images'
  and public.current_profile_role() in ('admin', 'moderator')
);
