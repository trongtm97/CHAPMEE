-- Migration 110: Contact settings upgrade + feedback workflow

-- Fix legacy ChapChap branding in contact settings seed
update public.app_settings
set value = jsonb_set(
  value,
  '{contact_description}',
  '"Báo lỗi, góp ý hoặc liên hệ với ChapMee."'::jsonb,
  true
)
where key = 'contact_settings'
  and value->>'contact_description' ilike '%ChapChap%';

-- Extend feedback_messages
alter table public.feedback_messages
  add column if not exists title text,
  add column if not exists related_url text,
  add column if not exists screenshot_url text,
  add column if not exists status text not null default 'new',
  add column if not exists priority text,
  add column if not exists internal_note text,
  add column if not exists assigned_admin_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists resolved_at timestamptz,
  add column if not exists user_agent text,
  add column if not exists device_info jsonb;

alter table public.feedback_messages
  drop constraint if exists feedback_messages_category_check;

alter table public.feedback_messages
  add constraint feedback_messages_category_check
  check (
    category in (
      'feedback',
      'bug',
      'feature',
      'payment',
      'content_report',
      'partnership',
      'other'
    )
  );

alter table public.feedback_messages
  drop constraint if exists feedback_messages_status_check;

alter table public.feedback_messages
  add constraint feedback_messages_status_check
  check (
    status in ('new', 'reviewing', 'replied', 'resolved', 'rejected')
  );

create index if not exists idx_feedback_messages_status
  on public.feedback_messages(status, created_at desc);

create index if not exists idx_feedback_messages_category
  on public.feedback_messages(category);

create or replace function public.touch_feedback_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_feedback_messages_updated_at on public.feedback_messages;
create trigger trg_touch_feedback_messages_updated_at
before update on public.feedback_messages
for each row
execute function public.touch_feedback_messages_updated_at();

-- Feedback event history
create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_messages(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  old_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_events_feedback_id
  on public.feedback_events(feedback_id, created_at desc);

alter table public.feedback_events enable row level security;

create or replace function public.can_update_feedback_status(input_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.user_has_permission(input_user_id, 'feedback.update.status')
    or public.user_has_role(input_user_id, 'owner');
$$;

grant execute on function public.can_update_feedback_status(uuid) to authenticated;

drop policy if exists "Staff can update feedback" on public.feedback_messages;
create policy "Staff can update feedback"
  on public.feedback_messages for update
  to authenticated
  using (public.can_update_feedback_status(auth.uid()))
  with check (public.can_update_feedback_status(auth.uid()));

drop policy if exists "Staff can read feedback events" on public.feedback_events;
create policy "Staff can read feedback events"
  on public.feedback_events for select
  to authenticated
  using (public.can_view_all_feedback(auth.uid()));

drop policy if exists "Staff can insert feedback events" on public.feedback_events;
create policy "Staff can insert feedback events"
  on public.feedback_events for insert
  to authenticated
  with check (public.can_update_feedback_status(auth.uid()));

-- Guest feedback insert (server validates settings)
drop policy if exists "Users can insert own feedback" on public.feedback_messages;
create policy "Users can insert own feedback"
  on public.feedback_messages for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and not public.is_user_write_blocked(auth.uid())
  );

drop policy if exists "Guest can insert feedback" on public.feedback_messages;
create policy "Guest can insert feedback"
  on public.feedback_messages for insert
  to anon
  with check (user_id is null);

-- Notification types for feedback workflow
alter type public.notification_type add value if not exists 'feedback_received';
alter type public.notification_type add value if not exists 'feedback_status_updated';
