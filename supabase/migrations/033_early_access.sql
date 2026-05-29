-- Migration 033: Early access chapter settings and unlocks

create table if not exists public.chapter_early_access_settings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null unique references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  coin_price numeric(18, 2),
  free_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.early_access_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  coin_amount numeric(18, 2) not null,
  paid_coin_amount numeric(18, 2) not null default 0,
  bonus_coin_amount numeric(18, 2) not null default 0,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint early_access_unlocks_user_chapter_unique unique(user_id, chapter_id)
);

create index if not exists idx_chapter_early_access_story
  on public.chapter_early_access_settings(story_id);
create index if not exists idx_early_access_unlocks_user_created
  on public.early_access_unlocks(user_id, created_at desc);

drop trigger if exists trg_touch_chapter_early_access_settings_updated_at on public.chapter_early_access_settings;
create trigger trg_touch_chapter_early_access_settings_updated_at
before update on public.chapter_early_access_settings
for each row execute function public.touch_updated_at();

alter table public.chapter_early_access_settings enable row level security;
alter table public.early_access_unlocks enable row level security;

drop policy if exists "Creators read own chapter early access settings" on public.chapter_early_access_settings;
create policy "Creators read own chapter early access settings"
  on public.chapter_early_access_settings for select
  using (
    creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Creators upsert own chapter early access settings" on public.chapter_early_access_settings;
create policy "Creators upsert own chapter early access settings"
  on public.chapter_early_access_settings for all
  using (
    creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  )
  with check (
    creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users read own early access unlocks" on public.early_access_unlocks;
create policy "Users read own early access unlocks"
  on public.early_access_unlocks for select
  using (
    user_id = auth.uid()
    or creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users insert own early access unlocks" on public.early_access_unlocks;
create policy "Users insert own early access unlocks"
  on public.early_access_unlocks for insert
  with check (
    user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

insert into public.monetization_settings (key, value, description, is_public)
values
  ('early_access.default_coin_price', '8'::jsonb, 'Gia coin mac dinh cho doc som.', false),
  ('early_access.default_free_after_hours', '24'::jsonb, 'So gio mac dinh de chapter mo free.', false),
  ('early_access.min_coin_price', '1'::jsonb, 'Gia coin toi thieu cua doc som.', false),
  ('early_access.max_coin_price', '200'::jsonb, 'Gia coin toi da cua doc som.', false),
  ('early_access.allow_creator_custom_price', 'true'::jsonb, 'Cho creator dat gia doc som.', false),
  ('early_access.max_early_access_days', '30'::jsonb, 'So ngay toi da cho che do doc som.', false)
on conflict (key) do nothing;
