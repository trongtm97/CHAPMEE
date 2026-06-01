-- Migration 113: Admin feedback dashboard upgrade

alter table public.feedback_messages
  add column if not exists code text unique,
  add column if not exists source text not null default 'app',
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid,
  add column if not exists admin_reply text,
  add column if not exists closed_at timestamptz;

-- Backfill code for existing rows
update public.feedback_messages
set code = 'FB-' || lpad(substring(replace(id::text, '-', ''), 1, 6), 6, '0')
where code is null;

alter table public.feedback_messages
  alter column priority set default 'normal';

update public.feedback_messages set priority = 'normal' where priority is null;

alter table public.feedback_messages
  drop constraint if exists feedback_messages_status_check;

alter table public.feedback_messages
  add constraint feedback_messages_status_check
  check (
    status in (
      'new', 'reviewing', 'need_more_info', 'replied',
      'resolved', 'closed', 'rejected'
    )
  );

alter table public.feedback_messages
  drop constraint if exists feedback_messages_category_check;

alter table public.feedback_messages
  add constraint feedback_messages_category_check
  check (
    category in (
      'feedback', 'bug', 'feature', 'payment', 'content_report', 'partnership', 'other',
      'suggestion', 'complaint', 'payment_coin', 'story_chapter', 'account', 'safety_abuse'
    )
  );

alter table public.feedback_messages
  drop constraint if exists feedback_messages_priority_check;

alter table public.feedback_messages
  add constraint feedback_messages_priority_check
  check (priority in ('low', 'normal', 'high', 'urgent'));

create index if not exists idx_feedback_messages_code on public.feedback_messages(code);
create index if not exists idx_feedback_messages_priority on public.feedback_messages(priority);
create index if not exists idx_feedback_messages_assigned on public.feedback_messages(assigned_admin_id);

-- Attachments (screenshot_url kept for legacy single image)
create table if not exists public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_messages(id) on delete cascade,
  file_url text not null,
  file_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_attachments_feedback
  on public.feedback_attachments(feedback_id);

alter table public.feedback_attachments enable row level security;

drop policy if exists "Staff read feedback attachments" on public.feedback_attachments;
create policy "Staff read feedback attachments"
  on public.feedback_attachments for select
  to authenticated
  using (public.can_view_all_feedback(auth.uid()));

drop policy if exists "Users read own feedback attachments" on public.feedback_attachments;
create policy "Users read own feedback attachments"
  on public.feedback_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.feedback_messages fm
      where fm.id = feedback_id and fm.user_id = auth.uid()
    )
  );

-- Extend feedback_events
alter table public.feedback_events
  add column if not exists old_value text,
  add column if not exists new_value text;

-- Code generator sequence
create sequence if not exists public.feedback_code_seq start 1;

create or replace function public.generate_feedback_code()
returns trigger
language plpgsql
as $$
declare
  seq_val bigint;
begin
  if new.code is null or new.code = '' then
    seq_val := nextval('public.feedback_code_seq');
    new.code := 'FB-' || lpad(seq_val::text, 6, '0');
  end if;
  if new.priority is null then
    new.priority := 'normal';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_generate_feedback_code on public.feedback_messages;
create trigger trg_generate_feedback_code
  before insert on public.feedback_messages
  for each row execute function public.generate_feedback_code();
