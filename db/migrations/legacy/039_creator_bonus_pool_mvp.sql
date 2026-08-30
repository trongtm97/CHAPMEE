-- Migration 039: Creator Bonus Pool MVP

create table if not exists public.creator_bonus_pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  total_amount_vnd numeric(18, 2) not null check (total_amount_vnd > 0),
  status text not null check (status in ('draft', 'calculated', 'approved', 'paid', 'cancelled')),
  rules jsonb default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_bonus_allocations (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references public.creator_bonus_pools(id) on delete cascade,
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(18, 4) not null default 0,
  amount_vnd numeric(18, 2) not null default 0 check (amount_vnd >= 0),
  status text not null check (status in ('pending', 'approved', 'credited', 'rejected')),
  transaction_id uuid references public.transactions(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pool_id, creator_user_id)
);

create index if not exists idx_creator_bonus_pools_status on public.creator_bonus_pools(status);
create index if not exists idx_creator_bonus_pools_period on public.creator_bonus_pools(period_start, period_end);
create index if not exists idx_creator_bonus_allocations_pool on public.creator_bonus_allocations(pool_id, status);
create index if not exists idx_creator_bonus_allocations_creator on public.creator_bonus_allocations(creator_user_id, status);

drop trigger if exists trg_touch_creator_bonus_pools_updated_at on public.creator_bonus_pools;
create trigger trg_touch_creator_bonus_pools_updated_at
before update on public.creator_bonus_pools
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_creator_bonus_allocations_updated_at on public.creator_bonus_allocations;
create trigger trg_touch_creator_bonus_allocations_updated_at
before update on public.creator_bonus_allocations
for each row
execute function public.touch_updated_at();

alter table public.creator_bonus_pools enable row level security;
alter table public.creator_bonus_allocations enable row level security;

drop policy if exists "Admin manages creator bonus pools" on public.creator_bonus_pools;
create policy "Admin manages creator bonus pools"
  on public.creator_bonus_pools for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manages creator bonus allocations" on public.creator_bonus_allocations;
create policy "Admin manages creator bonus allocations"
  on public.creator_bonus_allocations for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creator reads own bonus allocations" on public.creator_bonus_allocations;
create policy "Creator reads own bonus allocations"
  on public.creator_bonus_allocations for select
  using (auth.uid() = creator_user_id or public.is_admin_or_founder(auth.uid()));
