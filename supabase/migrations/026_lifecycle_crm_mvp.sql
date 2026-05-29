create table if not exists public.user_lifecycle_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  current_segments text[] not null default '{}'::text[],
  last_active_at timestamptz,
  last_calculated_at timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_nudge_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nudge_key text not null,
  last_shown_at timestamptz,
  dismissed_at timestamptz,
  show_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_nudge_states_show_count_non_negative check (show_count >= 0),
  unique (user_id, nudge_key)
);

create trigger user_lifecycle_states_set_updated_at
before update on public.user_lifecycle_states
for each row execute function public.set_updated_at();

create trigger user_nudge_states_set_updated_at
before update on public.user_nudge_states
for each row execute function public.set_updated_at();

create index if not exists user_lifecycle_states_user_id_idx
  on public.user_lifecycle_states(user_id);
create index if not exists user_lifecycle_states_last_active_idx
  on public.user_lifecycle_states(last_active_at desc);
create index if not exists user_nudge_states_user_id_idx
  on public.user_nudge_states(user_id);
create index if not exists user_nudge_states_user_nudge_idx
  on public.user_nudge_states(user_id, nudge_key);

alter table public.user_lifecycle_states enable row level security;
alter table public.user_nudge_states enable row level security;

create policy "Users can read own lifecycle state"
on public.user_lifecycle_states for select
using (auth.uid() = user_id);

create policy "Users can upsert own lifecycle state"
on public.user_lifecycle_states for insert
with check (auth.uid() = user_id);

create policy "Users can update own lifecycle state"
on public.user_lifecycle_states for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can read own nudge state"
on public.user_nudge_states for select
using (auth.uid() = user_id);

create policy "Users can insert own nudge state"
on public.user_nudge_states for insert
with check (auth.uid() = user_id);

create policy "Users can update own nudge state"
on public.user_nudge_states for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
