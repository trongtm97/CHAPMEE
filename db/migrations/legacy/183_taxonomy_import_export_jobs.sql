-- Admin taxonomy bulk import/export job history (distinct from studio_import_export_jobs)

create table if not exists public.taxonomy_import_export_jobs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,
  direction text not null,
  mode text,
  status text not null default 'pending',
  file_name text,
  file_url text,
  result_file_url text,
  total_rows integer not null default 0,
  created_rows integer not null default 0,
  updated_rows integer not null default 0,
  skipped_rows integer not null default 0,
  failed_rows integer not null default 0,
  error_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint taxonomy_import_export_jobs_direction_check check (
    direction in ('import', 'export')
  ),
  constraint taxonomy_import_export_jobs_status_check check (
    status in ('pending', 'processing', 'completed', 'failed', 'partially_completed')
  )
);

create index if not exists idx_taxonomy_import_export_jobs_actor_created
  on public.taxonomy_import_export_jobs(actor_id, created_at desc);

create index if not exists idx_taxonomy_import_export_jobs_status
  on public.taxonomy_import_export_jobs(status, created_at desc);

alter table public.taxonomy_import_export_jobs enable row level security;

drop policy if exists "Staff read taxonomy import export jobs" on public.taxonomy_import_export_jobs;
create policy "Staff read taxonomy import export jobs"
  on public.taxonomy_import_export_jobs for select
  using (public.is_admin_or_founder());

drop policy if exists "Staff insert taxonomy import export jobs" on public.taxonomy_import_export_jobs;
create policy "Staff insert taxonomy import export jobs"
  on public.taxonomy_import_export_jobs for insert
  with check (public.is_admin_or_founder());

drop policy if exists "Staff update taxonomy import export jobs" on public.taxonomy_import_export_jobs;
create policy "Staff update taxonomy import export jobs"
  on public.taxonomy_import_export_jobs for update
  using (public.is_admin_or_founder());
