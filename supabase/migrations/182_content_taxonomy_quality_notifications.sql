-- Taxonomy quality: creator notification + import job index

alter type public.notification_type add value if not exists 'taxonomy_revision_requested';

create index if not exists idx_ctq_flags_import_job
  on public.content_taxonomy_quality_flags ((details_json->>'importJobId'))
  where flag_type = 'import_error';
