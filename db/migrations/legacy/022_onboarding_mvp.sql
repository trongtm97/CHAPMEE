alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists user_role_preference text,
  add column if not exists favorite_genres text[] not null default '{}'::text[],
  add column if not exists onboarding_goals text[] not null default '{}'::text[];

alter table public.profiles
  add constraint profiles_user_role_preference_check
  check (user_role_preference is null or user_role_preference in ('reader', 'author', 'both'));

create index if not exists profiles_onboarding_completed_idx
  on public.profiles(onboarding_completed);
