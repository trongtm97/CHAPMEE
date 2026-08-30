-- Migration 031: Tip + virtual gifts + supporter ranking source data

create table if not exists public.virtual_gifts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  coin_price numeric(18, 2) not null check (coin_price > 0),
  icon_url text,
  emoji text,
  rarity text not null default 'common' check (
    rarity in ('common', 'rare', 'epic', 'legendary')
  ),
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_tips (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_creator_user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  gift_id uuid references public.virtual_gifts(id) on delete set null,
  coin_amount numeric(18, 2) not null check (coin_amount > 0),
  paid_coin_amount numeric(18, 2) not null default 0,
  bonus_coin_amount numeric(18, 2) not null default 0,
  gross_value_vnd numeric(18, 2),
  creator_net_vnd numeric(18, 2) not null default 0,
  platform_fee_vnd numeric(18, 2) not null default 0,
  message text,
  is_anonymous boolean not null default false,
  status text not null default 'completed' check (
    status in ('completed', 'refunded', 'reversed')
  ),
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_virtual_gifts_active_sort
  on public.virtual_gifts(is_active, sort_order asc, created_at desc);
create index if not exists idx_support_tips_creator_created
  on public.support_tips(to_creator_user_id, created_at desc);
create index if not exists idx_support_tips_story_created
  on public.support_tips(story_id, created_at desc);
create index if not exists idx_support_tips_from_user_created
  on public.support_tips(from_user_id, created_at desc);

drop trigger if exists trg_touch_virtual_gifts_updated_at on public.virtual_gifts;
create trigger trg_touch_virtual_gifts_updated_at
before update on public.virtual_gifts
for each row execute function public.touch_updated_at();

alter table public.virtual_gifts enable row level security;
alter table public.support_tips enable row level security;

drop policy if exists "Public read active virtual gifts" on public.virtual_gifts;
create policy "Public read active virtual gifts"
  on public.virtual_gifts for select
  using (is_active = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage virtual gifts" on public.virtual_gifts;
create policy "Admin manage virtual gifts"
  on public.virtual_gifts for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Users read own related support tips" on public.support_tips;
create policy "Users read own related support tips"
  on public.support_tips for select
  using (
    auth.uid() = from_user_id
    or auth.uid() = to_creator_user_id
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Users insert own support tips" on public.support_tips;
create policy "Users insert own support tips"
  on public.support_tips for insert
  with check (
    auth.uid() = from_user_id
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Admin update support tips" on public.support_tips;
create policy "Admin update support tips"
  on public.support_tips for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));
