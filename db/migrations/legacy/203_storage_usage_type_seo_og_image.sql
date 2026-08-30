-- Migration 203: Allow storage_assets.usage_type = 'seo_og_image'
--
-- The SEO settings "Default OG image" uploader (components/admin/seo/SeoMediaAssetField.tsx)
-- uploads via purpose "seo_og", which registers a storage_asset with
-- usage_type = 'seo_og_image' (lib/storage/media.ts) and is surfaced in the
-- account media library (lib/media/list-user-images.ts).
--
-- The CHECK constraint from migrations 198/202 did not include this value, so
-- the insert failed with:
--   new row for relation "storage_assets" violates check constraint
--   "storage_assets_usage_type_check"
--
-- This migration extends the CHECK constraint to include 'seo_og_image'.

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
      'verification_document',
      'seo_og_image'
    )
  );
