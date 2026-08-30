-- Migration 094: Report cases grouping + moderation metadata

alter type public.moderation_case_status add value if not exists 'reviewing';

alter table public.moderation_cases
  add column if not exists reported_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists primary_reason_code text,
  add column if not exists severity text not null default 'medium',
  add column if not exists report_count int not null default 1,
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists decision_code text,
  add column if not exists moderator_note text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

alter table public.reports
  add column if not exists moderation_case_id uuid references public.moderation_cases(id) on delete set null,
  add column if not exists reported_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists moderator_note text,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_code text;

create index if not exists idx_moderation_cases_target
  on public.moderation_cases(target_type, target_id);

create index if not exists idx_moderation_cases_status_updated
  on public.moderation_cases(status, updated_at desc);

create index if not exists idx_reports_moderation_case
  on public.reports(moderation_case_id);
