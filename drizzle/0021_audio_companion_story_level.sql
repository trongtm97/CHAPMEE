DO $$
BEGIN
  CREATE TYPE public.audio_source_type AS ENUM ('external_audio_url', 'youtube_embed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.audio_item_status AS ENUM (
    'draft',
    'pending_review',
    'published',
    'hidden',
    'broken',
    'rejected',
    'copyright_disputed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.audio_rights_status AS ENUM (
    'self_declared',
    'verified',
    'disputed',
    'rejected',
    'pending_review'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.audio_ads_policy AS ENUM ('inherit', 'ads_allowed', 'ads_disabled', 'pending_review');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.audio_link_check_status AS ENUM ('ok', 'failed', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.audio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  creator_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  audio_source_type public.audio_source_type NOT NULL,
  external_audio_url text,
  normalized_external_audio_url text,
  youtube_video_id text,
  youtube_url text,
  provider_name text,
  title text NOT NULL,
  description text,
  part_number integer,
  duration_seconds integer,
  language text NOT NULL DEFAULT 'vi',
  sort_order integer NOT NULL DEFAULT 0,
  status public.audio_item_status NOT NULL DEFAULT 'draft',
  rights_status public.audio_rights_status NOT NULL DEFAULT 'self_declared',
  ads_policy public.audio_ads_policy NOT NULL DEFAULT 'inherit',
  is_free boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  background_playback_allowed boolean NOT NULL DEFAULT false,
  continuous_playback_allowed boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  last_check_status public.audio_link_check_status,
  last_check_error text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audio_items_source_payload_check CHECK (
    (
      audio_source_type = 'external_audio_url'
      AND external_audio_url IS NOT NULL
      AND btrim(external_audio_url) <> ''
    )
    OR
    (
      audio_source_type = 'youtube_embed'
      AND (
        (youtube_video_id IS NOT NULL AND btrim(youtube_video_id) <> '')
        OR (youtube_url IS NOT NULL AND btrim(youtube_url) <> '')
      )
    )
  ),
  CONSTRAINT audio_items_free_only_mvp_check CHECK (is_free = true),
  CONSTRAINT audio_items_background_external_only_check CHECK (
    audio_source_type = 'external_audio_url' OR background_playback_allowed = false
  ),
  CONSTRAINT audio_items_continuous_external_only_check CHECK (
    audio_source_type = 'external_audio_url' OR continuous_playback_allowed = false
  ),
  CONSTRAINT audio_items_youtube_no_background_check CHECK (
    audio_source_type <> 'youtube_embed' OR background_playback_allowed = false
  ),
  CONSTRAINT audio_items_youtube_no_continuous_check CHECK (
    audio_source_type <> 'youtube_embed' OR continuous_playback_allowed = false
  )
);

CREATE INDEX IF NOT EXISTS audio_items_story_id_idx ON public.audio_items(story_id);
CREATE INDEX IF NOT EXISTS audio_items_creator_profile_id_idx ON public.audio_items(creator_profile_id);
CREATE INDEX IF NOT EXISTS audio_items_source_type_idx ON public.audio_items(audio_source_type);
CREATE INDEX IF NOT EXISTS audio_items_status_idx ON public.audio_items(status);
CREATE INDEX IF NOT EXISTS audio_items_rights_status_idx ON public.audio_items(rights_status);
CREATE INDEX IF NOT EXISTS audio_items_ads_policy_idx ON public.audio_items(ads_policy);
CREATE INDEX IF NOT EXISTS audio_items_part_number_idx ON public.audio_items(part_number);
CREATE INDEX IF NOT EXISTS audio_items_sort_order_idx ON public.audio_items(sort_order);

CREATE TABLE IF NOT EXISTS public.audio_listening_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  anonymous_client_id text,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  audio_item_id uuid NOT NULL REFERENCES public.audio_items(id) ON DELETE CASCADE,
  current_time_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  playback_rate numeric(4, 2) NOT NULL DEFAULT 1,
  completed_at timestamptz,
  last_played_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audio_progress_non_negative_time_check CHECK (current_time_seconds >= 0),
  CONSTRAINT audio_progress_positive_duration_check CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT audio_progress_positive_rate_check CHECK (playback_rate > 0)
);

CREATE INDEX IF NOT EXISTS audio_progress_profile_id_idx ON public.audio_listening_progress(profile_id);
CREATE INDEX IF NOT EXISTS audio_progress_anonymous_client_id_idx ON public.audio_listening_progress(anonymous_client_id);
CREATE INDEX IF NOT EXISTS audio_progress_story_id_idx ON public.audio_listening_progress(story_id);
CREATE INDEX IF NOT EXISTS audio_progress_audio_item_id_idx ON public.audio_listening_progress(audio_item_id);
CREATE INDEX IF NOT EXISTS audio_progress_last_played_at_idx ON public.audio_listening_progress(last_played_at);
