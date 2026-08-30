-- Migration 108: Admin refunds upgrade — extended fields, status normalization, granular permissions

-- ---------------------------------------------------------------------------
-- Extend refunds table
-- ---------------------------------------------------------------------------
alter table public.refunds
  add column if not exists creator_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists story_id uuid references public.stories(id) on delete set null,
  add column if not exists chapter_id uuid references public.episodes(id) on delete set null,
  add column if not exists refund_type text,
  add column if not exists source text,
  add column if not exists coin_type text default 'all',
  add column if not exists reason_public text,
  add column if not exists reason_internal text,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists completed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists quality_case_id uuid,
  add column if not exists coin_refund_batch_id uuid references public.coin_refund_batches(id) on delete set null,
  add column if not exists is_high_risk boolean not null default false;

-- Migrate legacy statuses
update public.refunds set status = 'pending' where status = 'requested';
update public.refunds set status = 'completed' where status = 'processed';

-- Copy reason to reason_public where missing
update public.refunds
set reason_public = reason
where reason_public is null and reason is not null;

-- Copy processed_by to completed_by
update public.refunds
set completed_by = processed_by
where completed_by is null and processed_by is not null;

alter table public.refunds drop constraint if exists refunds_status_check;
alter table public.refunds add constraint refunds_status_check check (
  status in (
    'pending',
    'reviewing',
    'approved',
    'processing',
    'completed',
    'rejected',
    'failed',
    'cancelled'
  )
);

alter table public.refunds alter column status set default 'pending';

drop index if exists refunds_unique_processed_original_idx;
create unique index if not exists refunds_unique_completed_original_idx
  on public.refunds(original_transaction_id)
  where status in ('completed', 'approved', 'processing');

create index if not exists refunds_refund_type_idx on public.refunds(refund_type);
create index if not exists refunds_source_idx on public.refunds(source);
create index if not exists refunds_buyer_created_idx on public.refunds(user_id, created_at desc);
create index if not exists refunds_creator_idx on public.refunds(creator_user_id);
create index if not exists refunds_story_chapter_idx on public.refunds(story_id, chapter_id);

-- ---------------------------------------------------------------------------
-- Granular refund permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (code, name, group_key)
values
  ('finance.refund.approve', 'Approve refund requests', 'finance'),
  ('finance.refund.reject', 'Reject refund requests', 'finance'),
  ('finance.refund.complete', 'Complete refund processing', 'finance'),
  ('finance.refund.override', 'Override duplicate refund protection', 'finance'),
  ('finance.refund.export', 'Export refund data', 'finance'),
  ('finance.refund.audit.view', 'View refund audit trail', 'finance')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.refund.approve',
  'finance.refund.reject',
  'finance.refund.complete',
  'finance.refund.override',
  'finance.refund.export',
  'finance.refund.audit.view'
)
where r.code in ('finance_admin', 'super_admin', 'owner')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'finance.refund.view',
  'finance.refund.create',
  'finance.refund.audit.view'
)
where r.code = 'support_admin'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code = 'finance.refund.create'
where r.code in ('moderator', 'content_admin')
on conflict do nothing;
