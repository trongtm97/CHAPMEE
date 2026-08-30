create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  session_id text,
  event_name text not null,
  event_category text not null,
  properties jsonb not null default '{}'::jsonb,
  page_path text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_name_created_idx
  on public.analytics_events(event_name, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events(user_id, created_at desc);

alter table public.analytics_events enable row level security;

create policy "Analytics events are insertable by authenticated or anonymous sessions"
  on public.analytics_events for insert
  with check (true);

create policy "Analytics events are private"
  on public.analytics_events for select
  using (public.current_profile_role() in ('admin', 'moderator'));
