create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reader_enabled boolean not null default true,
  author_enabled boolean not null default true,
  system_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "Users can read own notification preferences"
on public.notification_preferences for select
using (auth.uid() = user_id);

create policy "Users can insert own notification preferences"
on public.notification_preferences for insert
with check (auth.uid() = user_id);

create policy "Users can update own notification preferences"
on public.notification_preferences for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
