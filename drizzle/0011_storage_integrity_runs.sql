-- Records CLI storage health / integrity summaries for admin overview.

create table if not exists public.storage_integrity_runs (
  id uuid primary key default gen_random_uuid(),
  check_kind text not null,
  ok boolean not null default false,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_storage_integrity_runs_kind_created
  on public.storage_integrity_runs (check_kind, created_at desc);

comment on table public.storage_integrity_runs is
  'Last-run summaries from npm run storage:health / check-* / check-s3-orphans.';
