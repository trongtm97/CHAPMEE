-- Story-level monetization: full access, auto chapter pricing, chapter overrides

create table if not exists public.story_monetization_settings (
  story_id uuid primary key references public.stories(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  monetization_enabled boolean not null default true,
  full_access_enabled boolean not null default false,
  full_access_price_coin integer,
  full_access_includes_future_chapters boolean not null default true,
  full_access_note text,
  auto_pricing_enabled boolean not null default false,
  free_first_chapters_count integer not null default 0,
  auto_paid_from_chapter integer,
  auto_price_coin integer,
  default_new_chapter_price_coin integer,
  updated_at timestamptz not null default now()
);

create index if not exists idx_story_monetization_settings_creator
  on public.story_monetization_settings(creator_user_id);

alter table public.chapter_monetization_settings
  add column if not exists pricing_source text not null default 'paid_manual',
  add column if not exists monetization_override boolean not null default false;

alter table public.chapter_monetization_settings
  drop constraint if exists chapter_monetization_settings_pricing_source_check;

alter table public.chapter_monetization_settings
  add constraint chapter_monetization_settings_pricing_source_check
  check (
    pricing_source in (
      'free_manual',
      'paid_manual',
      'auto_free_first_chapters',
      'auto_paid_after_threshold'
    )
  );

create table if not exists public.story_full_access_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  coin_amount numeric(18, 2) not null,
  price_coin_snapshot integer not null,
  includes_future_chapters boolean not null default true,
  transaction_id uuid references public.transactions(id) on delete set null,
  status text not null default 'active',
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint story_full_access_unlocks_user_story_unique unique (user_id, story_id),
  constraint story_full_access_unlocks_status_check check (status in ('active', 'revoked'))
);

create index if not exists idx_story_full_access_unlocks_user
  on public.story_full_access_unlocks(user_id, story_id);

drop trigger if exists trg_touch_story_monetization_settings_updated_at on public.story_monetization_settings;
create trigger trg_touch_story_monetization_settings_updated_at
before update on public.story_monetization_settings
for each row execute function public.touch_updated_at();

alter table public.story_monetization_settings enable row level security;
alter table public.story_full_access_unlocks enable row level security;

drop policy if exists "Creators manage own story monetization settings" on public.story_monetization_settings;
create policy "Creators manage own story monetization settings"
  on public.story_monetization_settings for all
  using (creator_user_id = auth.uid() or public.is_admin_or_founder(auth.uid()))
  with check (creator_user_id = auth.uid() or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users read own story full access unlocks" on public.story_full_access_unlocks;
create policy "Users read own story full access unlocks"
  on public.story_full_access_unlocks for select
  using (
    user_id = auth.uid()
    or creator_user_id = auth.uid()
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users insert own story full access unlocks" on public.story_full_access_unlocks;
create policy "Users insert own story full access unlocks"
  on public.story_full_access_unlocks for insert
  with check (user_id = auth.uid() or public.is_admin_or_founder(auth.uid()));
