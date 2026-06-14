-- 0035_community_posts_content_s3.sql
-- Community post text (title + content) → S3-compatible object storage (chapmee-text bucket).
-- Canonical bytes live in S3; community_posts.title/content remain for `db` storage type
-- (backward compat). New writes go to S3 with content_preview kept in DB for feed rendering.
-- Moderation fields (public_note, hidden_reason, rejected_reason, comments_locked_reason)
-- remain in DB — admin queries them frequently.

alter table public.community_posts
  add column if not exists content_storage_type text not null default 'db',
  add column if not exists content_blob_format text,
  add column if not exists content_object_key text,
  add column if not exists content_hash text,
  add column if not exists content_size_bytes bigint,
  add column if not exists content_encoding text,
  add column if not exists content_preview text,
  add column if not exists content_updated_at timestamptz;

comment on column public.community_posts.content_storage_type is
  'Where canonical community post body lives: db | s3';
comment on column public.community_posts.content_blob_format is
  'S3 blob logical format: json (envelope {v, title, content})';
comment on column public.community_posts.content_object_key is
  'Stable S3 object key for community post (e.g. community-content/yyyy/mm/postId.json.gz)';
comment on column public.community_posts.content_hash is
  'SHA-256 hex of stored object bytes (gzip payload when content_encoding=gzip)';
comment on column public.community_posts.content_encoding is
  'identity | gzip — how bytes are stored in S3';
comment on column public.community_posts.content_preview is
  'Truncated content text (max 280 chars) for feed rendering without S3 fetch';

alter table public.community_posts
  drop constraint if exists community_posts_content_storage_type_check;

alter table public.community_posts
  add constraint community_posts_content_storage_type_check check (
    content_storage_type in ('db', 's3')
  );

alter table public.community_posts
  drop constraint if exists community_posts_content_encoding_check;

alter table public.community_posts
  add constraint community_posts_content_encoding_check check (
    content_encoding is null
    or content_encoding in ('identity', 'gzip')
  );

create index if not exists idx_community_posts_content_object_key
  on public.community_posts (content_object_key)
  where content_object_key is not null;

create index if not exists idx_community_posts_content_storage_type
  on public.community_posts (content_storage_type)
  where content_storage_type <> 'db';
