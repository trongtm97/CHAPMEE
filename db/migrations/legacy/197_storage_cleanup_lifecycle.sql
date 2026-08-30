-- Migration 197: Data lifecycle, storage cleanup, quarantine, and rollup MVP.
-- All destructive cleanup is policy-gated and audit logged. Hard deletes are
-- represented in DB state first; object removal must be handled by an admin job.

create table if not exists public.storage_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  bucket text not null,
  path text not null,
  public_url text,
  mime_type text,
  size_bytes bigint not null default 0,
  checksum text,
  width integer,
  height integer,
  duration_seconds integer,
  status text not null default 'active',
  linked_entity_type text,
  linked_entity_id uuid,
  linked_field text,
  is_public boolean not null default false,
  is_original boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  orphan_detected_at timestamptz,
  quarantined_at timestamptz,
  deleted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint storage_assets_bucket_path_unique unique (bucket, path),
  constraint storage_assets_status_check check (
    status in ('active', 'orphan_detected', 'quarantined', 'deleted', 'error')
  )
);

create table if not exists public.storage_asset_derivatives (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.storage_assets(id) on delete cascade,
  bucket text not null,
  path text not null,
  variant text not null,
  width integer,
  height integer,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint storage_asset_derivatives_asset_variant_unique unique (asset_id, variant)
);

create table if not exists public.cleanup_policies (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  description text,
  category text not null default 'retention',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  mode text not null,
  status text not null default 'pending',
  triggered_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  scanned_count integer not null default 0,
  affected_count integer not null default 0,
  bytes_saved bigint not null default 0,
  error_count integer not null default 0,
  summary text,
  logs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  constraint cleanup_jobs_mode_check check (
    mode in ('dry_run', 'quarantine', 'hard_delete', 'compress', 'rollup')
  ),
  constraint cleanup_jobs_status_check check (
    status in ('pending', 'running', 'succeeded', 'failed', 'cancelled')
  )
);

create table if not exists public.cleanup_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_storage_metrics (
  date date primary key,
  total_assets bigint not null default 0,
  active_assets bigint not null default 0,
  orphan_assets bigint not null default 0,
  quarantined_assets bigint not null default 0,
  total_bytes bigint not null default 0,
  orphan_bytes bigint not null default 0,
  deleted_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_event_rollups (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  event_family text not null,
  target_type text not null default 'all',
  target_id uuid,
  total_events bigint not null default 0,
  unique_users bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_storage_assets_status_created
  on public.storage_assets(status, created_at desc);
create index if not exists idx_storage_assets_bucket_status
  on public.storage_assets(bucket, status, created_at desc);
create index if not exists idx_storage_assets_owner_created
  on public.storage_assets(owner_id, created_at desc)
  where owner_id is not null;
create index if not exists idx_storage_assets_entity
  on public.storage_assets(linked_entity_type, linked_entity_id)
  where linked_entity_type is not null and linked_entity_id is not null;
create index if not exists idx_storage_assets_last_used
  on public.storage_assets(last_used_at);
create index if not exists idx_storage_assets_quarantined
  on public.storage_assets(quarantined_at)
  where status = 'quarantined';
create index if not exists idx_storage_assets_size
  on public.storage_assets(size_bytes desc);
create index if not exists idx_storage_assets_checksum
  on public.storage_assets(checksum)
  where checksum is not null;

create index if not exists idx_storage_asset_derivatives_asset
  on public.storage_asset_derivatives(asset_id);
create index if not exists idx_cleanup_policies_category
  on public.cleanup_policies(category, key);
create index if not exists idx_cleanup_jobs_type_created
  on public.cleanup_jobs(job_type, started_at desc);
create index if not exists idx_cleanup_jobs_status_created
  on public.cleanup_jobs(status, started_at desc);
create index if not exists idx_cleanup_audit_entity
  on public.cleanup_audit_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_cleanup_audit_created
  on public.cleanup_audit_logs(created_at desc);
create index if not exists idx_daily_event_rollups_family_date
  on public.daily_event_rollups(event_family, date desc);
create unique index if not exists daily_event_rollups_unique_scope
  on public.daily_event_rollups (
    date,
    event_family,
    target_type,
    coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create or replace function public.touch_storage_cleanup_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_storage_assets_updated_at on public.storage_assets;
create trigger trg_storage_assets_updated_at
before update on public.storage_assets
for each row execute function public.touch_storage_cleanup_updated_at();

drop trigger if exists trg_cleanup_policies_updated_at on public.cleanup_policies;
create trigger trg_cleanup_policies_updated_at
before update on public.cleanup_policies
for each row execute function public.touch_storage_cleanup_updated_at();

insert into public.cleanup_policies (key, value, description, category)
values
  ('draft_retention_days', '30', 'Draft content retention window.', 'retention'),
  ('autosave_retention_days', '14', 'Autosave snapshot retention window.', 'retention'),
  ('version_history_retention_days', '30', 'Draft/version history retention window.', 'retention'),
  ('orphan_upload_quarantine_days', '7', 'Days before orphan uploads can be quarantined.', 'storage'),
  ('quarantine_hard_delete_days', '30', 'Days quarantined assets must wait before hard delete.', 'storage'),
  ('import_export_file_retention_days', '7', 'Import/export generated file retention.', 'retention'),
  ('sitemap_feed_cache_retention_days', '3', 'Sitemap/XML/feed cache retention.', 'retention'),
  ('notification_retention_days', '90', 'Notification retention.', 'retention'),
  ('search_log_retention_days', '30', 'Search log retention.', 'retention'),
  ('raw_read_event_retention_days', '90', 'Raw read event retention.', 'events'),
  ('raw_impression_event_retention_days', '60', 'Raw impression event retention.', 'events'),
  ('raw_ad_event_retention_days', '180', 'Raw ad event retention.', 'events'),
  ('raw_algorithm_exposure_retention_days', '60', 'Raw algorithm exposure retention.', 'events'),
  ('audit_log_retention_days', '365', 'Cleanup/audit retention.', 'retention'),
  ('soft_deleted_content_retention_days', '30', 'Soft deleted content retention.', 'retention'),
  ('enable_image_compression', 'true', 'Generate image derivatives when upload flows support it.', 'compression'),
  ('delete_original_after_derivative', 'false', 'Allow original removal after derivatives are safe.', 'compression'),
  ('enable_dry_run_mode', 'true', 'Keep cleanup jobs in dry-run mode by default.', 'safety'),
  ('enable_scheduled_cleanup', 'false', 'Allow scheduled cleanup jobs.', 'safety'),
  ('enable_admin_manual_cleanup', 'true', 'Allow manual admin cleanup jobs.', 'safety'),
  ('enable_per_user_storage_quota', 'false', 'Enforce per-user storage quota.', 'quota'),
  ('creator_storage_quota_mb', '2048', 'Default creator storage quota.', 'quota'),
  ('reader_storage_quota_mb', '256', 'Default reader storage quota.', 'quota'),
  ('admin_bypass_quota', 'true', 'Admins bypass quota checks.', 'quota'),
  ('max_upload_size_by_type', '{"avatar":5242880,"story_cover":10485760,"chapter_image":10485760,"content_post_cover":5242880,"verification_document":10485760}', 'Max upload size per module in bytes.', 'quota'),
  ('allowed_mime_types_by_module', '{"avatar":["image/jpeg","image/png","image/webp"],"story_cover":["image/jpeg","image/png","image/webp"],"chapter_image":["image/jpeg","image/png","image/webp"],"content_post_cover":["image/jpeg","image/png","image/webp"],"verification_document":["image/jpeg","image/png","image/webp","application/pdf"]}', 'Allowed MIME types per module.', 'quota'),
  ('image_derivative_policy', '{"avatar":{"variants":[{"name":"small","width":128,"quality":82},{"name":"medium","width":256,"quality":84}],"format":"webp"},"story_cover":{"variants":[{"name":"thumb","width":320,"quality":78},{"name":"card","width":640,"quality":82},{"name":"hero","width":1280,"quality":84}],"format":"webp"},"chapter_image":{"variants":[{"name":"thumb","width":360,"quality":78},{"name":"content","width":1080,"quality":84}],"format":"webp"},"content_post_cover":{"variants":[{"name":"thumb","width":360,"quality":78},{"name":"article","width":1200,"quality":84}],"format":"webp"}}', 'Image derivative policy by module.', 'compression')
on conflict (key) do nothing;

alter table public.storage_assets enable row level security;
alter table public.storage_asset_derivatives enable row level security;
alter table public.cleanup_policies enable row level security;
alter table public.cleanup_jobs enable row level security;
alter table public.cleanup_audit_logs enable row level security;
alter table public.daily_storage_metrics enable row level security;
alter table public.daily_event_rollups enable row level security;

drop policy if exists "Admin read storage assets" on public.storage_assets;
create policy "Admin read storage assets"
  on public.storage_assets for select
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Users insert own storage assets" on public.storage_assets;
create policy "Users insert own storage assets"
  on public.storage_assets for insert
  with check (owner_id = auth.uid() or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage storage assets" on public.storage_assets;
create policy "Admin manage storage assets"
  on public.storage_assets for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin read storage derivatives" on public.storage_asset_derivatives;
create policy "Admin read storage derivatives"
  on public.storage_asset_derivatives for select
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Users insert storage derivatives" on public.storage_asset_derivatives;
create policy "Users insert storage derivatives"
  on public.storage_asset_derivatives for insert
  with check (
    exists (
      select 1 from public.storage_assets a
      where a.id = storage_asset_derivatives.asset_id
        and (a.owner_id = auth.uid() or public.is_admin_or_founder(auth.uid()))
    )
  );

drop policy if exists "Admin manage storage derivatives" on public.storage_asset_derivatives;
create policy "Admin manage storage derivatives"
  on public.storage_asset_derivatives for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin read cleanup policies" on public.cleanup_policies;
create policy "Admin read cleanup policies"
  on public.cleanup_policies for select
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin update cleanup policies" on public.cleanup_policies;
create policy "Admin update cleanup policies"
  on public.cleanup_policies for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin read cleanup jobs" on public.cleanup_jobs;
create policy "Admin read cleanup jobs"
  on public.cleanup_jobs for select
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin manage cleanup jobs" on public.cleanup_jobs;
create policy "Admin manage cleanup jobs"
  on public.cleanup_jobs for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin read cleanup audit" on public.cleanup_audit_logs;
create policy "Admin read cleanup audit"
  on public.cleanup_audit_logs for select
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.audit.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
  );

drop policy if exists "Admin insert cleanup audit" on public.cleanup_audit_logs;
create policy "Admin insert cleanup audit"
  on public.cleanup_audit_logs for insert
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin read daily storage metrics" on public.daily_storage_metrics;
create policy "Admin read daily storage metrics"
  on public.daily_storage_metrics for select
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
  );

drop policy if exists "Admin manage daily storage metrics" on public.daily_storage_metrics;
create policy "Admin manage daily storage metrics"
  on public.daily_storage_metrics for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin read daily event rollups" on public.daily_event_rollups;
create policy "Admin read daily event rollups"
  on public.daily_event_rollups for select
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
  );

drop policy if exists "Admin manage daily event rollups" on public.daily_event_rollups;
create policy "Admin manage daily event rollups"
  on public.daily_event_rollups for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

-- pg_cron guidance:
-- select cron.schedule('chapmee-storage-orphan-scan', '20 2 * * *', $$select net.http_post(...)$$);
-- Keep scheduled cleanup disabled until env/service-role function endpoints are configured.
