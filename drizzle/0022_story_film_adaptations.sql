-- Story-level YouTube film adaptations (no chapter_id, no paid/coin fields).

CREATE TABLE IF NOT EXISTS public.story_film_adaptations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  creator_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  youtube_url text NOT NULL,
  youtube_video_id text,
  youtube_playlist_id text,
  youtube_embed_type varchar(32) NOT NULL DEFAULT 'video',
  title text NOT NULL,
  description text,
  creative_note text,
  relation_type varchar(64) NOT NULL DEFAULT 'based_on_story',
  language text NOT NULL DEFAULT 'vi',
  duration_seconds integer,
  sort_order integer NOT NULL DEFAULT 0,
  status varchar(32) NOT NULL DEFAULT 'draft',
  rights_status varchar(32) NOT NULL DEFAULT 'self_declared',
  ads_policy varchar(32) NOT NULL DEFAULT 'inherit',
  is_free boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz,
  last_check_status varchar(16),
  last_check_error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT story_film_adaptations_youtube_url_check CHECK (
    youtube_url IS NOT NULL AND btrim(youtube_url) <> ''
  ),
  CONSTRAINT story_film_adaptations_youtube_embed_type_check CHECK (
    youtube_embed_type IN ('video', 'playlist')
  ),
  CONSTRAINT story_film_adaptations_relation_type_check CHECK (
    relation_type IN (
      'based_on_story',
      'inspired_by_story',
      'official_adaptation',
      'fan_adaptation',
      'trailer',
      'short_film',
      'animation',
      'cinematic_scene'
    )
  ),
  CONSTRAINT story_film_adaptations_status_check CHECK (
    status IN (
      'draft',
      'pending_review',
      'published',
      'hidden',
      'rejected',
      'copyright_disputed',
      'unavailable'
    )
  ),
  CONSTRAINT story_film_adaptations_rights_status_check CHECK (
    rights_status IN (
      'self_declared',
      'verified',
      'disputed',
      'rejected',
      'pending_review'
    )
  ),
  CONSTRAINT story_film_adaptations_ads_policy_check CHECK (
    ads_policy IN ('inherit', 'ads_allowed', 'ads_disabled', 'pending_review')
  ),
  CONSTRAINT story_film_adaptations_last_check_status_check CHECK (
    last_check_status IS NULL
    OR last_check_status IN ('ok', 'failed', 'unknown')
  ),
  CONSTRAINT story_film_adaptations_embed_target_check CHECK (
    (
      youtube_embed_type = 'video'
      AND youtube_video_id IS NOT NULL
      AND btrim(youtube_video_id) <> ''
    )
    OR (
      youtube_embed_type = 'playlist'
      AND youtube_playlist_id IS NOT NULL
      AND btrim(youtube_playlist_id) <> ''
    )
  ),
  CONSTRAINT story_film_adaptations_free_only_mvp_check CHECK (is_free = true),
  CONSTRAINT story_film_adaptations_duration_positive_check CHECK (
    duration_seconds IS NULL OR duration_seconds > 0
  )
);

CREATE INDEX IF NOT EXISTS story_film_adaptations_story_id_idx
  ON public.story_film_adaptations(story_id);
CREATE INDEX IF NOT EXISTS story_film_adaptations_creator_profile_id_idx
  ON public.story_film_adaptations(creator_profile_id);
CREATE INDEX IF NOT EXISTS story_film_adaptations_youtube_video_id_idx
  ON public.story_film_adaptations(youtube_video_id);
CREATE INDEX IF NOT EXISTS story_film_adaptations_youtube_playlist_id_idx
  ON public.story_film_adaptations(youtube_playlist_id);
CREATE INDEX IF NOT EXISTS story_film_adaptations_youtube_embed_type_idx
  ON public.story_film_adaptations(youtube_embed_type);
CREATE INDEX IF NOT EXISTS story_film_adaptations_status_idx
  ON public.story_film_adaptations(status);
CREATE INDEX IF NOT EXISTS story_film_adaptations_rights_status_idx
  ON public.story_film_adaptations(rights_status);
CREATE INDEX IF NOT EXISTS story_film_adaptations_ads_policy_idx
  ON public.story_film_adaptations(ads_policy);
CREATE INDEX IF NOT EXISTS story_film_adaptations_relation_type_idx
  ON public.story_film_adaptations(relation_type);
CREATE INDEX IF NOT EXISTS story_film_adaptations_sort_order_idx
  ON public.story_film_adaptations(sort_order);

INSERT INTO public.app_settings (key, value, is_public)
VALUES (
  'film_adaptation_policy_settings',
  '{
    "film_adaptations_enabled": true,
    "film_adaptations_youtube_only": true,
    "require_linked_story": true,
    "allow_story_level_only": true,
    "allow_chapter_level_linking": false,
    "allow_youtube_video": true,
    "allow_youtube_playlist": true,
    "film_must_be_free": true,
    "paid_film_enabled": false,
    "coin_unlock_film_enabled": false,
    "film_tips_enabled": false,
    "film_ads_enabled": true,
    "default_film_status": "pending_review",
    "auto_publish_for_trusted_creators": false,
    "require_rights_declaration": true,
    "show_in_discover_tab": true,
    "discover_tab_label": "Phim chuyển thể",
    "show_on_story_detail": true,
    "show_creative_disclaimer": true,
    "creative_disclaimer_text": "Phim/video có thể chuyển thể sáng tạo và không nhất thiết giống từng chi tiết của bản truyện.",
    "original_story_film_ads_allowed": true,
    "translated_story_film_ads_requires_verified_rights": true,
    "translated_story_film_ads_allowed_when_unverified": false,
    "youtube_embed_ads_on_film_pages_enabled": false,
    "max_films_per_story": 20,
    "require_admin_review_for_youtube": false,
    "broken_youtube_check_enabled": true,
    "broken_youtube_check_interval_hours": 24,
    "hide_unavailable_films_automatically": false
  }'::jsonb,
  false
)
ON CONFLICT (key) DO NOTHING;
