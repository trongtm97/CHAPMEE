-- Lịch đăng Studio (scheduled publications)

alter type public.notification_type add value if not exists 'schedule_publish_success';
alter type public.notification_type add value if not exists 'schedule_publish_failed';

create table public.scheduled_publications (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  story_id uuid references public.stories(id) on delete cascade,
  scheduled_at timestamptz not null,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  status text not null default 'scheduled',
  publish_attempts integer not null default 0,
  last_error text,
  published_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_publications_target_type_check check (
    target_type in ('story', 'chapter', 'swipe')
  ),
  constraint scheduled_publications_status_check check (
    status in ('scheduled', 'published', 'canceled', 'failed')
  )
);

create unique index scheduled_publications_active_target_uidx
  on public.scheduled_publications (target_type, target_id)
  where status = 'scheduled';

create index scheduled_publications_creator_status_at_idx
  on public.scheduled_publications (creator_id, status, scheduled_at);

create index scheduled_publications_due_idx
  on public.scheduled_publications (status, scheduled_at)
  where status = 'scheduled';

create trigger scheduled_publications_set_updated_at
before update on public.scheduled_publications
for each row execute function public.set_updated_at();

alter table public.scheduled_publications enable row level security;

create policy "Owners read own scheduled publications"
on public.scheduled_publications for select
using (creator_id = auth.uid());

create policy "Owners insert own scheduled publications"
on public.scheduled_publications for insert
with check (creator_id = auth.uid());

create policy "Owners update own scheduled publications"
on public.scheduled_publications for update
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

create policy "Owners delete own scheduled publications"
on public.scheduled_publications for delete
using (creator_id = auth.uid());
