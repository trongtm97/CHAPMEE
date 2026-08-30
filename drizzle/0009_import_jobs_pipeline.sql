-- Bulk translation import pipeline (raw files in S3, staging in import_items).

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_name text,
  source_type varchar(32) not null default 'manual_upload',
  raw_bucket text not null,
  raw_object_key text not null,
  original_filename text,
  status varchar(32) not null default 'uploaded',
  total_items integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_message text,
  created_by_profile_id uuid references public.profiles (id) on delete set null,
  owner_profile_id uuid references public.profiles (id) on delete set null,
  rights_attested_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.import_items (
  id uuid primary key default gen_random_uuid(),
  import_job_id uuid not null references public.import_jobs (id) on delete cascade,
  item_type varchar(16) not null,
  parent_item_id uuid references public.import_items (id) on delete cascade,
  source_story_key text,
  source_chapter_key text,
  title text not null,
  chapter_title text,
  chapter_number integer,
  raw_text_preview text,
  parsed_content_object_key text,
  content_hash text,
  status varchar(32) not null default 'parsed',
  target_story_id uuid references public.stories (id) on delete set null,
  target_chapter_id uuid references public.episodes (id) on delete set null,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.import_jobs
  drop constraint if exists import_jobs_source_type_check;

alter table public.import_jobs
  add constraint import_jobs_source_type_check check (
    source_type in ('manual_upload', 'local_file', 'api', 'other')
  );

alter table public.import_jobs
  drop constraint if exists import_jobs_status_check;

alter table public.import_jobs
  add constraint import_jobs_status_check check (
    status in (
      'uploaded',
      'parsing',
      'parsed',
      'failed',
      'publishing',
      'published',
      'cancelled'
    )
  );

alter table public.import_items
  drop constraint if exists import_items_item_type_check;

alter table public.import_items
  add constraint import_items_item_type_check check (item_type in ('story', 'chapter'));

alter table public.import_items
  drop constraint if exists import_items_status_check;

alter table public.import_items
  add constraint import_items_status_check check (
    status in ('parsed', 'duplicate', 'ready', 'skipped', 'failed', 'published')
  );

create index if not exists idx_import_jobs_status_created
  on public.import_jobs (status, created_at desc);

create index if not exists idx_import_jobs_owner_created
  on public.import_jobs (owner_profile_id, created_at desc);

create index if not exists idx_import_items_job_type
  on public.import_items (import_job_id, item_type);

create index if not exists idx_import_items_job_status
  on public.import_items (import_job_id, status);

create index if not exists idx_import_items_content_hash
  on public.import_items (content_hash)
  where content_hash is not null;

create index if not exists idx_import_items_source_story_key
  on public.import_items (source_story_key)
  where source_story_key is not null;

comment on table public.import_jobs is
  'Bulk import jobs: raw source files in S3, parse → import_items → publish to stories/episodes.';

comment on table public.import_items is
  'Parsed story/chapter rows staged before publish; full bodies in S3 processed keys.';

grant select, insert, update, delete on public.import_jobs to authenticated, service_role;
grant select, insert, update, delete on public.import_items to authenticated, service_role;

grant select on public.import_jobs to anon;
grant select on public.import_items to anon;
