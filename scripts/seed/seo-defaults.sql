-- Idempotent SEO defaults (also applied in drizzle/0023_seo_center.sql).
INSERT INTO public.seo_settings (
  site_name,
  default_title_template,
  default_description_template,
  default_og_image_asset_id,
  title_separator,
  default_robots_index,
  default_robots_follow,
  default_locale,
  sitemap_enabled,
  robots_enabled
)
SELECT
  'ChapMee',
  '{page_title} | ChapMee',
  'ChapMee - Nền tảng giải trí text/story dành cho người đọc và tác giả.',
  NULL,
  '|',
  true,
  true,
  'vi',
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.seo_settings LIMIT 1);
