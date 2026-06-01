-- Notification Campaign admin upgrade: extended fields, audit logs, status expansion

alter table public.notification_campaigns
  add column if not exists name text;

alter table public.notification_campaigns
  add column if not exists priority text not null default 'normal';

alter table public.notification_campaigns
  add column if not exists visual_style text not null default 'default';

alter table public.notification_campaigns
  add column if not exists action_type text not null default 'none';

alter table public.notification_campaigns
  add column if not exists action_target_id text;

alter table public.notification_campaigns
  add column if not exists expires_at timestamptz;

alter table public.notification_campaigns
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.notification_campaigns
  add column if not exists archived_at timestamptz;

alter table public.notification_campaigns
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

alter table public.notification_campaigns
  drop constraint if exists notification_campaigns_status_check;

alter table public.notification_campaigns
  add constraint notification_campaigns_status_check check (
    status in (
      'draft', 'scheduled', 'sending', 'sent',
      'paused', 'cancelled', 'failed', 'archived'
    )
  );

alter table public.notification_campaigns
  drop constraint if exists notification_campaigns_priority_check;

alter table public.notification_campaigns
  add constraint notification_campaigns_priority_check check (
    priority in ('low', 'normal', 'high', 'critical')
  );

create table if not exists public.notification_campaign_audit_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.notification_campaigns(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists notification_campaign_audit_logs_campaign_idx
  on public.notification_campaign_audit_logs(campaign_id, created_at desc);

alter table public.notification_campaign_audit_logs enable row level security;

drop policy if exists "Staff read notification campaign audit logs" on public.notification_campaign_audit_logs;
create policy "Staff read notification campaign audit logs"
  on public.notification_campaign_audit_logs for select
  to authenticated
  using (public.can_manage_notification_campaigns(auth.uid()));

drop policy if exists "Staff insert notification campaign audit logs" on public.notification_campaign_audit_logs;
create policy "Staff insert notification campaign audit logs"
  on public.notification_campaign_audit_logs for insert
  to authenticated
  with check (public.can_manage_notification_campaigns(auth.uid()));
