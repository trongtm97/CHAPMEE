-- Migration 040: Originals and IP Deal Management MVP

create table if not exists public.story_originals_status (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('none', 'candidate', 'under_review', 'original', 'declined', 'ended')),
  selected_by uuid references public.profiles(id) on delete set null,
  selected_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ip_deals (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  deal_type text not null check (deal_type in ('exclusive', 'non_exclusive', 'option', 'licensing', 'co_production')),
  rights jsonb default '{}'::jsonb,
  status text not null check (status in ('draft', 'negotiating', 'signed', 'active', 'ended', 'cancelled')),
  start_date date,
  end_date date,
  advance_amount_vnd numeric(18, 2),
  revenue_share jsonb,
  admin_note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ip_deal_financials (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.ip_deals(id) on delete cascade,
  type text not null check (type in ('advance', 'cost', 'revenue', 'royalty', 'payment')),
  amount_vnd numeric(18, 2) not null,
  description text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_originals_status_status on public.story_originals_status(status, updated_at desc);
create index if not exists idx_ip_deals_story on public.ip_deals(story_id, status, updated_at desc);
create index if not exists idx_ip_deals_creator on public.ip_deals(creator_user_id, status, updated_at desc);
create index if not exists idx_ip_deal_financials_deal on public.ip_deal_financials(deal_id, created_at desc);

drop trigger if exists trg_touch_story_originals_status_updated_at on public.story_originals_status;
create trigger trg_touch_story_originals_status_updated_at
before update on public.story_originals_status
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_ip_deals_updated_at on public.ip_deals;
create trigger trg_touch_ip_deals_updated_at
before update on public.ip_deals
for each row
execute function public.touch_updated_at();

alter table public.story_originals_status enable row level security;
alter table public.ip_deals enable row level security;
alter table public.ip_deal_financials enable row level security;

drop policy if exists "Admin manages originals status" on public.story_originals_status;
create policy "Admin manages originals status"
  on public.story_originals_status for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator reads own originals status" on public.story_originals_status;
create policy "Creator reads own originals status"
  on public.story_originals_status for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manages ip deals" on public.ip_deals;
create policy "Admin manages ip deals"
  on public.ip_deals for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator reads own ip deals" on public.ip_deals;
create policy "Creator reads own ip deals"
  on public.ip_deals for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manages ip deal financials" on public.ip_deal_financials;
create policy "Admin manages ip deal financials"
  on public.ip_deal_financials for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator reads own ip deal financials" on public.ip_deal_financials;
create policy "Creator reads own ip deal financials"
  on public.ip_deal_financials for select
  using (
    public.is_admin_or_founder(auth.uid()) or exists (
      select 1
      from public.ip_deals d
      where d.id = ip_deal_financials.deal_id
        and d.creator_user_id = auth.uid()
    )
  );
