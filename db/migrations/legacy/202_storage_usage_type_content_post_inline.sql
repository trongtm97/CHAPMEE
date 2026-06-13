-- Migration 202: Allow storage_assets.usage_type = 'content_post_inline'
--
-- The admin content-post editor uploads inline images via
-- lib/platform-content/upload-inline-image.ts, which calls
-- registerStorageAsset() with usageType = "content_post_inline".
-- The CHECK constraint installed by migration 198
-- (storage_assets_usage_type_check) did not include this value, so the
-- upsert failed with a constraint violation, surfaced to the UI as
-- "Không thể đăng ký media asset.".
--
-- This migration extends the CHECK constraint so the inline-image flow can
-- register its media asset, and keeps the cleanup_policies consistent
-- with the content_post_cover entry that was added in migration 197.

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
      'content_post_inline',
      'verification_document'
    )
  );

-- Keep quota and MIME policy consistent with content_post_cover so future
-- module-level validation has a matching entry.
update public.cleanup_policies
set value = jsonb_set(
  value,
  '{content_post_inline}',
  value -> 'content_post_cover',
  true
)
where key in (
  'max_upload_size_by_type',
  'allowed_mime_types_by_module'
)
  and value ? 'content_post_cover';

insert into public.cleanup_policies (key, value, description, category)
values
  (
    'image_derivative_policy',
    coalesce(
      (
        select value || jsonb_build_object(
          'content_post_inline',
          value -> 'content_post_cover'
        )
        from public.cleanup_policies
        where key = 'image_derivative_policy'
          and value ? 'content_post_cover'
        limit 1
      ),
      jsonb_build_object(
        'content_post_inline',
        jsonb_build_object(
          'variants',
          jsonb_build_array(
            jsonb_build_object('name', 'thumb', 'width', 360, 'quality', 78),
            jsonb_build_object('name', 'article', 'width', 1200, 'quality', 84)
          ),
          'format',
          'webp'
        )
      )
    ),
    'Image derivative policy by module.',
    'compression'
  )
on conflict (key) do update
set value = excluded.value
where excluded.value ? 'content_post_inline';
