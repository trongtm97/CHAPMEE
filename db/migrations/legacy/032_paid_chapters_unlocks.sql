-- Migration 032: Paid chapter settings and unlock history

create table if not exists public.chapter_monetization_settings (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null unique references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  is_paid boolean not null default false,
  coin_price numeric(18, 2),
  free_preview_enabled boolean not null default true,
  free_preview_percent numeric(5, 2),
  free_preview_chars numeric(18, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapter_unlocks (
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
  constraint chapter_unlocks_user_chapter_unique unique(user_id, chapter_id)
);

create index if not exists idx_chapter_unlocks_user_created
  on public.chapter_unlocks(user_id, created_at desc);
create index if not exists idx_chapter_monetization_story
  on public.chapter_monetization_settings(story_id);

drop trigger if exists trg_touch_chapter_monetization_settings_updated_at on public.chapter_monetization_settings;
create trigger trg_touch_chapter_monetization_settings_updated_at
before update on public.chapter_monetization_settings
for each row execute function public.touch_updated_at();

alter table public.chapter_monetization_settings enable row level security;
alter table public.chapter_unlocks enable row level security;

drop policy if exists "Creators read own chapter monetization settings" on public.chapter_monetization_settings;
create policy "Creators read own chapter monetization settings"
  on public.chapter_monetization_settings for select
  using (
    creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Creators upsert own chapter monetization settings" on public.chapter_monetization_settings;
create policy "Creators upsert own chapter monetization settings"
  on public.chapter_monetization_settings for all
  using (
    creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  )
  with check (
    creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users read own chapter unlocks" on public.chapter_unlocks;
create policy "Users read own chapter unlocks"
  on public.chapter_unlocks for select
  using (
    user_id = auth.uid()
    or creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users insert own chapter unlocks" on public.chapter_unlocks;
create policy "Users insert own chapter unlocks"
  on public.chapter_unlocks for insert
  with check (
    user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

insert into public.monetization_settings (key, value, description, is_public)
values
  ('paid_chapters.default_coin_price', '10'::jsonb, 'Gia coin mac dinh cho paid chapter.', false),
  ('paid_chapters.min_coin_price', '1'::jsonb, 'Gia coin toi thieu cho paid chapter.', false),
  ('paid_chapters.max_coin_price', '200'::jsonb, 'Gia coin toi da cho paid chapter.', false),
  ('paid_chapters.free_chapters_required', '0'::jsonb, 'So chapter dau bat buoc free.', false),
  ('paid_chapters.allow_creator_custom_price', 'true'::jsonb, 'Cho creator tu set gia chapter.', false),
  ('paid_chapters.default_free_preview_percent', '20'::jsonb, 'Ty le preview mac dinh cho paid chapter.', false)
on conflict (key) do nothing;
