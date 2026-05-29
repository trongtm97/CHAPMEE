-- Chapter inline images (editor + reader)

create table public.chapter_images (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  draft_id uuid references public.creator_drafts(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  thumb_url text,
  alt_text text,
  caption text,
  width int,
  height int,
  file_size_bytes int,
  created_at timestamptz not null default now(),
  constraint chapter_images_scope_check check (
    episode_id is not null or draft_id is not null
  )
);

create index chapter_images_story_id_idx on public.chapter_images (story_id);
create index chapter_images_episode_id_idx on public.chapter_images (episode_id);
create index chapter_images_draft_id_idx on public.chapter_images (draft_id);

alter table public.chapter_images enable row level security;

create policy "Public read chapter images"
on public.chapter_images
for select
using (true);

create policy "Story owners insert chapter images"
on public.chapter_images
for insert
to authenticated
with check (
  uploader_id = auth.uid()
  and public.is_story_owner(story_id)
);

create policy "Story owners update chapter images"
on public.chapter_images
for update
to authenticated
using (public.is_story_owner(story_id))
with check (public.is_story_owner(story_id));

create policy "Story owners delete chapter images"
on public.chapter_images
for delete
to authenticated
using (public.is_story_owner(story_id));

create policy "Staff manage chapter images"
on public.chapter_images
for all
to authenticated
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

-- Storage: chapter-images/{storyId}/{episodeId|drafts/draftId}/{imageId}/image.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chapter-images',
  'chapter-images',
  true,
  5242880,
  array['image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Chapter images are publicly accessible"
on storage.objects
for select
using (bucket_id = 'chapter-images');

create policy "Story owners upload chapter images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chapter-images'
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id::text = (storage.foldername(name))[1]
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Story owners update chapter images storage"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chapter-images'
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id::text = (storage.foldername(name))[1]
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Story owners delete chapter images storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chapter-images'
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id::text = (storage.foldername(name))[1]
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Staff manage chapter images storage"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'chapter-images'
  and public.current_profile_role() in ('admin', 'moderator')
)
with check (
  bucket_id = 'chapter-images'
  and public.current_profile_role() in ('admin', 'moderator')
);
