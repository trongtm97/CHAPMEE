-- ChapMee Studio Composer: validation fields + structured_blocks format

alter table public.episodes
  add column if not exists composer_version integer default 1,
  add column if not exists validation_status text,
  add column if not exists validation_errors jsonb default '[]'::jsonb,
  add column if not exists last_validated_at timestamptz;

comment on column public.episodes.composer_version is
  'Schema version for structured_content when using Composer blocks (default 1).';

comment on column public.episodes.validation_status is
  'draft | valid | invalid | warnings — set by Studio Composer publish checks.';

comment on column public.episodes.validation_errors is
  'Array of Composer validation issues from last check.';

alter table public.episodes
  drop constraint if exists episodes_content_format_check;

alter table public.episodes
  add constraint episodes_content_format_check check (
    content_format is null
    or content_format in (
      'plain_text',
      'markdown',
      'rich_text',
      'structured_json',
      'structured_blocks'
    )
  );

alter table public.episodes
  drop constraint if exists episodes_presentation_mode_check;

alter table public.episodes
  add constraint episodes_presentation_mode_check check (
    presentation_mode is null
    or presentation_mode in (
      'standard_prose',
      'chat_story',
      'social_feed',
      'case_file',
      'diary',
      'system_game',
      'script',
      'mixed_media',
      'branching_story'
    )
  );
