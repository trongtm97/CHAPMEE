-- Migration 198: Media optimization foundation.
-- Extends the storage registry from migration 197 instead of creating a
-- second source of truth. Destructive cleanup remains policy-gated.

alter table public.storage_assets
  add column if not exists original_filename text,
  add column if not exists extension text,
  add column if not exists usage_type text not null default 'admin_asset',
  add column if not exists variants jsonb not null default '{}'::jsonb,
  add column if not exists delete_after_at timestamptz;

alter table public.storage_assets
  drop constraint if exists storage_assets_status_check;

alter table public.storage_assets
  add constraint storage_assets_status_check check (
    status in (
      'uploading',
      'active',
      'temp',
      'replaced',
      'orphan_candidate',
      'orphan_detected',
      'pending_delete',
      'quarantined',
      'deleted',
      'failed',
      'error'
    )
  );

alter table public.storage_assets
  drop constraint if exists storage_assets_usage_type_check;

alter table public.storage_assets
  add constraint storage_assets_usage_type_check check (
    usage_type in (
      'avatar',
      'story_cover',
      'chapter_image',
      'composer_block',
      'reel_asset',
      'temp_upload',
      'admin_asset',
      'article_asset',
      'content_post_cover',
      'verification_document'
    )
  );

create index if not exists idx_storage_assets_usage_status
  on public.storage_assets(usage_type, status, created_at desc);

create index if not exists idx_storage_assets_delete_after
  on public.storage_assets(delete_after_at)
  where status = 'pending_delete';

create or replace view public.media_assets as
select
  id,
  owner_id,
  bucket,
  path as storage_path,
  public_url,
  original_filename,
  mime_type,
  extension,
  size_bytes,
  width,
  height,
  duration_seconds,
  checksum,
  usage_type,
  linked_entity_type,
  linked_entity_id,
  linked_field,
  status,
  is_public,
  variants,
  created_at,
  updated_at,
  last_used_at,
  delete_after_at,
  deleted_at,
  metadata
from public.storage_assets;

insert into public.cleanup_policies (key, value, description, category)
values
  ('max_upload_image_mb', '10', 'Maximum image upload size for generic media surfaces.', 'media'),
  ('allowed_image_mime_types', '["image/jpeg","image/png","image/webp","image/avif"]', 'Allowed image MIME types. SVG is blocked unless a sanitizer is introduced.', 'media'),
  ('keep_original_images', 'true', 'Keep original media object after variants are generated.', 'media'),
  ('temp_upload_ttl_days', '3', 'TTL for unattached temporary uploads.', 'retention'),
  ('replaced_media_ttl_days', '14', 'TTL before replaced media can move to pending delete.', 'retention'),
  ('draft_media_ttl_days', '30', 'TTL for draft-only media without references.', 'retention'),
  ('autosave_ttl_days', '14', 'TTL for autosave/draft snapshots.', 'retention'),
  ('max_autosave_versions_per_entity', '20', 'Maximum draft versions retained per entity.', 'retention'),
  ('max_published_versions_per_entity', '50', 'Maximum published versions retained per entity.', 'retention'),
  ('event_log_retention_days', '90', 'Default raw event log retention.', 'events'),
  ('enable_image_variant_generation', 'true', 'Enable variant generation where upload pipelines support it.', 'media'),
  ('enable_orphan_cleanup', 'true', 'Allow orphan scan and pending-delete cleanup jobs.', 'safety'),
  ('cleanup_dry_run_required', 'true', 'Require dry-run before destructive cleanup.', 'safety'),
  ('cleanup_batch_size', '500', 'Maximum items processed by one cleanup job.', 'safety'),
  ('min_age_before_delete_hours', '24', 'Minimum age before pending-delete assets can be removed.', 'safety')
on conflict (key) do nothing;

comment on view public.media_assets is
  'Compatibility view over storage_assets for ChapMee media metadata APIs.';
