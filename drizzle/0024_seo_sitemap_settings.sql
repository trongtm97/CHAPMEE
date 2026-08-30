-- SEO sitemap manager settings (extends seo_settings MVP row).
ALTER TABLE public.seo_settings
  ADD COLUMN IF NOT EXISTS include_chapters boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_profiles boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_media boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_articles boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS include_taxonomy boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_changefreq text,
  ADD COLUMN IF NOT EXISTS default_priority numeric(2, 1);

COMMENT ON COLUMN public.seo_settings.include_chapters IS 'Include published chapters in sitemap segment.';
COMMENT ON COLUMN public.seo_settings.include_profiles IS 'Include /@username profiles in sitemap.';
COMMENT ON COLUMN public.seo_settings.include_media IS 'Include /media and related catalog URLs in sitemap.';
COMMENT ON COLUMN public.seo_settings.include_articles IS 'Include articles/posts/announcements in sitemap.';
COMMENT ON COLUMN public.seo_settings.include_taxonomy IS 'Include taxonomy landing pages in sitemap.';
