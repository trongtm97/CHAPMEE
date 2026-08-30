-- SEO Center: settings, overrides, content blocks, redirects, 404 logs, audit results.
-- Media FKs reference storage_assets (media_assets is a view over the same ids).

CREATE TABLE IF NOT EXISTS public.seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL DEFAULT 'ChapMee',
  default_title_template text NOT NULL DEFAULT '{page_title} | ChapMee',
  default_description_template text NOT NULL DEFAULT 'ChapMee - Nền tảng giải trí text/story dành cho người đọc và tác giả.',
  default_og_image_asset_id uuid REFERENCES public.storage_assets(id) ON DELETE SET NULL,
  title_separator text NOT NULL DEFAULT '|',
  default_robots_index boolean NOT NULL DEFAULT true,
  default_robots_follow boolean NOT NULL DEFAULT true,
  default_locale text NOT NULL DEFAULT 'vi',
  sitemap_enabled boolean NOT NULL DEFAULT true,
  robots_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.seo_settings IS 'Global SEO defaults. MVP: maintain a single row.';

CREATE TABLE IF NOT EXISTS public.seo_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type varchar(32) NOT NULL,
  target_id uuid,
  path text,
  locale text NOT NULL DEFAULT 'vi',
  title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image_asset_id uuid REFERENCES public.storage_assets(id) ON DELETE SET NULL,
  twitter_title text,
  twitter_description text,
  twitter_image_asset_id uuid REFERENCES public.storage_assets(id) ON DELETE SET NULL,
  robots_index boolean,
  robots_follow boolean,
  schema_type text,
  extra_json_ld jsonb,
  is_enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_overrides_target_type_check CHECK (
    target_type IN (
      'route',
      'story',
      'chapter',
      'profile',
      'taxonomy',
      'media',
      'article',
      'ranking',
      'discover'
    )
  ),
  CONSTRAINT seo_overrides_target_or_path_check CHECK (
    path IS NOT NULL OR target_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS seo_overrides_target_type_target_id_idx
  ON public.seo_overrides (target_type, target_id);
CREATE INDEX IF NOT EXISTS seo_overrides_path_idx
  ON public.seo_overrides (path);
CREATE INDEX IF NOT EXISTS seo_overrides_locale_idx
  ON public.seo_overrides (locale);
CREATE INDEX IF NOT EXISTS seo_overrides_is_enabled_idx
  ON public.seo_overrides (is_enabled);

CREATE UNIQUE INDEX IF NOT EXISTS seo_overrides_enabled_path_locale_uidx
  ON public.seo_overrides (path, locale)
  WHERE is_enabled = true AND path IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seo_overrides_enabled_target_locale_uidx
  ON public.seo_overrides (target_type, target_id, locale)
  WHERE is_enabled = true AND target_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.seo_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type text NOT NULL,
  target_type varchar(32),
  target_id uuid,
  route_path text,
  locale text NOT NULL DEFAULT 'vi',
  title text NOT NULL,
  summary text,
  content_markdown text NOT NULL,
  faq_json jsonb,
  internal_links_json jsonb,
  placement text NOT NULL DEFAULT 'before_footer',
  is_collapsible boolean NOT NULL DEFAULT true,
  status varchar(16) NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT seo_content_blocks_status_check CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT seo_content_blocks_placement_check CHECK (
    placement IN ('before_footer')
  )
);

CREATE INDEX IF NOT EXISTS seo_content_blocks_route_path_idx
  ON public.seo_content_blocks (route_path);
CREATE INDEX IF NOT EXISTS seo_content_blocks_page_type_idx
  ON public.seo_content_blocks (page_type);
CREATE INDEX IF NOT EXISTS seo_content_blocks_target_type_target_id_idx
  ON public.seo_content_blocks (target_type, target_id);
CREATE INDEX IF NOT EXISTS seo_content_blocks_status_idx
  ON public.seo_content_blocks (status);
CREATE INDEX IF NOT EXISTS seo_content_blocks_locale_idx
  ON public.seo_content_blocks (locale);

CREATE UNIQUE INDEX IF NOT EXISTS seo_content_blocks_published_route_locale_uidx
  ON public.seo_content_blocks (route_path, locale)
  WHERE status = 'published' AND route_path IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS seo_content_blocks_published_page_target_locale_uidx
  ON public.seo_content_blocks (page_type, target_type, target_id, locale)
  WHERE status = 'published'
    AND target_type IS NOT NULL
    AND target_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.seo_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL,
  destination_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301,
  preserve_query boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  hit_count integer NOT NULL DEFAULT 0,
  last_hit_at timestamptz,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_redirects_source_path_check CHECK (
    source_path LIKE '/%'
  ),
  CONSTRAINT seo_redirects_no_loop_check CHECK (
    source_path <> destination_path
  ),
  CONSTRAINT seo_redirects_status_code_check CHECK (
    status_code IN (301, 302, 307, 308)
  ),
  CONSTRAINT seo_redirects_hit_count_nonneg_check CHECK (hit_count >= 0)
);

CREATE INDEX IF NOT EXISTS seo_redirects_source_path_idx
  ON public.seo_redirects (source_path);
CREATE INDEX IF NOT EXISTS seo_redirects_is_enabled_idx
  ON public.seo_redirects (is_enabled);
CREATE INDEX IF NOT EXISTS seo_redirects_status_code_idx
  ON public.seo_redirects (status_code);

CREATE UNIQUE INDEX IF NOT EXISTS seo_redirects_enabled_source_path_uidx
  ON public.seo_redirects (source_path)
  WHERE is_enabled = true;

CREATE TABLE IF NOT EXISTS public.seo_404_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  user_agent_hash text,
  hit_count integer NOT NULL DEFAULT 1,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_ip_hash text,
  CONSTRAINT seo_404_logs_hit_count_positive_check CHECK (hit_count >= 1)
);

CREATE INDEX IF NOT EXISTS seo_404_logs_path_idx
  ON public.seo_404_logs (path);
CREATE INDEX IF NOT EXISTS seo_404_logs_last_seen_at_idx
  ON public.seo_404_logs (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS seo_404_logs_hit_count_idx
  ON public.seo_404_logs (hit_count DESC);

CREATE TABLE IF NOT EXISTS public.seo_audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type varchar(32) NOT NULL,
  target_id uuid,
  path text,
  score integer,
  issues_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_audit_results_score_range_check CHECK (
    score IS NULL OR (score >= 0 AND score <= 100)
  )
);

CREATE INDEX IF NOT EXISTS seo_audit_results_target_type_target_id_idx
  ON public.seo_audit_results (target_type, target_id);
CREATE INDEX IF NOT EXISTS seo_audit_results_path_idx
  ON public.seo_audit_results (path);
CREATE INDEX IF NOT EXISTS seo_audit_results_last_checked_at_idx
  ON public.seo_audit_results (last_checked_at DESC);

-- MVP default settings row (no OG asset until admin uploads one).
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

COMMENT ON TABLE public.seo_overrides IS 'Per-route or per-entity SEO metadata overrides.';
COMMENT ON TABLE public.seo_content_blocks IS 'Markdown SEO content blocks rendered before footer on public pages.';
COMMENT ON TABLE public.seo_redirects IS 'Admin-managed redirects (301/302/307/308). Distinct from legacy url_redirects until migrated.';
COMMENT ON TABLE public.seo_404_logs IS 'Aggregated 404 hits; stores hashed IP/UA only.';
COMMENT ON TABLE public.seo_audit_results IS 'Cached SEO audit scores/issues per target or path.';
