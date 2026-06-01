-- Composer validation state for standalone story content on stories row.

alter table public.stories
  add column if not exists validation_status text,
  add column if not exists validation_errors jsonb not null default '[]'::jsonb;

comment on column public.stories.validation_status is
  'Composer validation for standalone content: valid, warnings, invalid, or null.';

comment on column public.stories.validation_errors is
  'Composer validation messages for standalone content.';

alter table public.stories
  drop constraint if exists stories_validation_status_check;

alter table public.stories
  add constraint stories_validation_status_check check (
    validation_status is null
    or validation_status in ('valid', 'warnings', 'invalid')
  );
