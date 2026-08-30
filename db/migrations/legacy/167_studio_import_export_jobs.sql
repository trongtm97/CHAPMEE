-- Studio bulk import/export job history (creator-scoped)

create table if not exists public.studio_import_export_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,
  status text not null default 'pending',
  file_name text,
  file_url text,
  result_file_url text,
  total_rows integer not null default 0,
  success_rows integer not null default 0,
  error_rows integer not null default 0,
  error_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint studio_import_export_jobs_type_check check (
    job_type in ('import_stories', 'export_stories')
  ),
  constraint studio_import_export_jobs_status_check check (
    status in ('pending', 'processing', 'completed', 'failed', 'partially_completed')
  )
);

create index if not exists idx_studio_import_export_jobs_user_created
  on public.studio_import_export_jobs(user_id, created_at desc);

alter table public.studio_import_export_jobs enable row level security;

drop policy if exists "Creator read own import export jobs" on public.studio_import_export_jobs;
create policy "Creator read own import export jobs"
  on public.studio_import_export_jobs for select
  using (auth.uid() = user_id);

drop policy if exists "Creator insert own import export jobs" on public.studio_import_export_jobs;
create policy "Creator insert own import export jobs"
  on public.studio_import_export_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Creator update own import export jobs" on public.studio_import_export_jobs;
create policy "Creator update own import export jobs"
  on public.studio_import_export_jobs for update
  using (auth.uid() = user_id);
