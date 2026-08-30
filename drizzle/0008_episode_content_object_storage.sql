-- Chapter (episode) full-body object storage metadata (MinIO/S3).
-- Canonical bytes live in S3; episodes.content / structured_content remain for db|hybrid|legacy.

alter table public.episodes
  add column if not exists content_storage_type text not null default 'db',
  add column if not exists content_blob_format text,
  add column if not exists content_object_key text,
  add column if not exists content_hash text,
  add column if not exists content_size_bytes bigint,
  add column if not exists content_encoding text,
  add column if not exists plain_text_preview text,
  add column if not exists content_updated_at timestamptz;

comment on column public.episodes.content_storage_type is
  'Where canonical chapter body lives: db | s3 | hybrid';

comment on column public.episodes.content_blob_format is
  'S3 blob logical format: text | markdown | json | composer_json (distinct from episodes.content_format)';

comment on column public.episodes.content_object_key is
  'Stable S3 object key for chapter body (e.g. story-content/yyyy/mm/{storyId}/chapters/{chapterId}.composer_json.gz)';

comment on column public.episodes.content_hash is
  'SHA-256 hex of stored object bytes (gzip payload when content_encoding=gzip)';

comment on column public.episodes.content_encoding is
  'identity | gzip — how bytes are stored in S3';

comment on column public.episodes.plain_text_preview is
  'Truncated plain text for search/preview when body is in S3';

alter table public.episodes
  drop constraint if exists episodes_content_storage_type_check;

alter table public.episodes
  add constraint episodes_content_storage_type_check check (
    content_storage_type in ('db', 's3', 'hybrid')
  );

alter table public.episodes
  drop constraint if exists episodes_content_encoding_check;

alter table public.episodes
  add constraint episodes_content_encoding_check check (
    content_encoding is null
    or content_encoding in ('identity', 'gzip')
  );

alter table public.episodes
  drop constraint if exists episodes_content_blob_format_check;

alter table public.episodes
  add constraint episodes_content_blob_format_check check (
    content_blob_format is null
    or content_blob_format in ('text', 'markdown', 'json', 'composer_json')
  );

create index if not exists idx_episodes_content_object_key
  on public.episodes (content_object_key)
  where content_object_key is not null;

create index if not exists idx_episodes_content_storage_type
  on public.episodes (content_storage_type)
  where content_storage_type <> 'db';
