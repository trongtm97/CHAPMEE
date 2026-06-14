-- 0034_reels_content_s3.sql
-- Reels text body (title/hook/body/cta) → S3-compatible object storage (chapmee-text bucket).
-- Canonical bytes live in S3; reels_items.title/hook/body/cta remain for `db` storage type
-- (backward compat). New writes go to S3 with body_preview kept in DB for feed rendering.

alter table public.reels_items
  add column if not exists content_storage_type text not null default 'db',
  add column if not exists content_blob_format text,
  add column if not exists content_object_key text,
  add column if not exists content_hash text,
  add column if not exists content_size_bytes bigint,
  add column if not exists content_encoding text,
  add column if not exists body_preview text,
  add column if not exists content_updated_at timestamptz;

comment on column public.reels_items.content_storage_type is
  'Where canonical reels text body lives: db | s3';
comment on column public.reels_items.content_blob_format is
  'S3 blob logical format: json (envelope {v, title, hook, body, cta})';
comment on column public.reels_items.content_object_key is
  'Stable S3 object key for reels body (e.g. reels-content/yyyy/mm/reelId.json.gz)';
comment on column public.reels_items.content_hash is
  'SHA-256 hex of stored object bytes (gzip payload when content_encoding=gzip)';
comment on column public.reels_items.content_encoding is
  'identity | gzip — how bytes are stored in S3';
comment on column public.reels_items.body_preview is
  'Truncated body text (max 280 chars) for feed rendering without S3 fetch';

alter table public.reels_items
  drop constraint if exists reels_items_content_storage_type_check;

alter table public.reels_items
  add constraint reels_items_content_storage_type_check check (
    content_storage_type in ('db', 's3')
  );

alter table public.reels_items
  drop constraint if exists reels_items_content_encoding_check;

alter table public.reels_items
  add constraint reels_items_content_encoding_check check (
    content_encoding is null
    or content_encoding in ('identity', 'gzip')
  );

create index if not exists idx_reels_items_content_object_key
  on public.reels_items (content_object_key)
  where content_object_key is not null;

create index if not exists idx_reels_items_content_storage_type
  on public.reels_items (content_storage_type)
  where content_storage_type <> 'db';
