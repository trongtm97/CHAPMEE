-- Migration 135: Storage bucket for admin content post cover images

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-posts',
  'content-posts',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Content post covers are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'content-posts');

create policy "Staff can upload content post covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content-posts'
    and public.can_manage_content_posts(auth.uid())
  );

create policy "Staff can update content post covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'content-posts'
    and public.can_manage_content_posts(auth.uid())
  );

create policy "Staff can delete content post covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content-posts'
    and public.can_manage_content_posts(auth.uid())
  );
