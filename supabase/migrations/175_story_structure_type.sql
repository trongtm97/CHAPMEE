-- Story structure: chaptered vs standalone (one-part stories)
-- Backfill existing stories as chaptered.

alter table public.stories
  add column if not exists structure_type text not null default 'chaptered',
  add column if not exists content_format text,
  add column if not exists standalone_content_json jsonb,
  add column if not exists standalone_plain_text text,
  add column if not exists standalone_word_count integer not null default 0,
  add column if not exists standalone_reading_time_minutes integer not null default 0,
  add column if not exists standalone_published_at timestamptz,
  add column if not exists standalone_updated_at timestamptz;

comment on column public.stories.structure_type is
  'chaptered = multi-chapter story; standalone = one-part content on story row.';

comment on column public.stories.content_format is
  'Composer/presentation format: prose, chat_story, case_file, diary, system_game, etc.';

comment on column public.stories.standalone_content_json is
  'Composer block JSON for standalone stories (structure_type = standalone).';

comment on column public.stories.standalone_plain_text is
  'Plain-text fallback for standalone content (search, SEO, excerpt).';

alter table public.stories
  drop constraint if exists stories_structure_type_check;

alter table public.stories
  add constraint stories_structure_type_check check (
    structure_type in ('chaptered', 'standalone')
  );

create index if not exists idx_stories_structure_type
  on public.stories(structure_type);

create index if not exists idx_stories_status_structure_type
  on public.stories(status, structure_type);

create index if not exists idx_stories_author_structure_type
  on public.stories(creator_id, structure_type);

-- Backfill: all existing stories remain chaptered
update public.stories
set structure_type = 'chaptered'
where structure_type is null or structure_type = '';
