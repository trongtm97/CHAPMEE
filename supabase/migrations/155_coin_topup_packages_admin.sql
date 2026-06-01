-- Migration 155: Admin-managed coin top-up packages (coin_packs) + audit logs

alter table public.coin_packs
  add column if not exists description text,
  add column if not exists is_recommended boolean not null default false,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

-- Relax hard 15% DB cap; app validates bonus tiers with admin confirmation.
alter table public.coin_packs
  drop constraint if exists coin_packs_bonus_percent_cap;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'coin_packs_bonus_percent_non_negative'
  ) then
    alter table public.coin_packs
      add constraint coin_packs_bonus_percent_non_negative check (bonus_percent >= 0);
  end if;
end $$;

-- amount_vnd mirrors price_vnd for API clarity; keep price_vnd as source of truth.
alter table public.coin_packs
  add column if not exists amount_vnd integer;

update public.coin_packs
set amount_vnd = floor(price_vnd)::integer
where amount_vnd is null;

create index if not exists idx_coin_packs_amount_vnd
  on public.coin_packs(amount_vnd);

create or replace function public.sync_coin_pack_amount_vnd()
returns trigger
language plpgsql
as $$
begin
  new.amount_vnd := floor(new.price_vnd)::integer;
  return new;
end;
$$;

drop trigger if exists trg_sync_coin_pack_amount_vnd on public.coin_packs;
create trigger trg_sync_coin_pack_amount_vnd
before insert or update of price_vnd on public.coin_packs
for each row execute function public.sync_coin_pack_amount_vnd();

create table if not exists public.coin_topup_package_audit_logs (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.coin_packs(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_coin_topup_package_audit_package
  on public.coin_topup_package_audit_logs(package_id, created_at desc);

create index if not exists idx_coin_topup_package_audit_actor
  on public.coin_topup_package_audit_logs(actor_id, created_at desc);

alter table public.coin_topup_package_audit_logs enable row level security;

drop policy if exists "Admin read coin topup package audit" on public.coin_topup_package_audit_logs;
create policy "Admin read coin topup package audit"
  on public.coin_topup_package_audit_logs for select
  using (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin insert coin topup package audit" on public.coin_topup_package_audit_logs;
create policy "Admin insert coin topup package audit"
  on public.coin_topup_package_audit_logs for insert
  with check (public.is_admin_or_founder(auth.uid()));

-- Default tiers: base_coin from 1000 VND/coin (coin.exchange_rate_vnd default).
-- Bonus: 0%, 0%, 2%, 4%, 8%, 15% (max default on 1M tier).
insert into public.coin_packs (
  name,
  coin_amount,
  price_vnd,
  base_coin_amount,
  bonus_coin_amount,
  total_coin_amount,
  bonus_percent,
  currency,
  label,
  badge_text,
  description,
  is_active,
  is_recommended,
  sort_order
)
values
  ('Gói 20.000đ', 20, 20000, 20, 0, 20, 0, 'VND', 'Gói thử', null, 'Mốc nạp cơ bản', true, false, 1),
  ('Gói 50.000đ', 50, 50000, 50, 0, 50, 0, 'VND', 'Cơ bản', null, null, true, false, 2),
  ('Gói 100.000đ', 102, 100000, 100, 2, 102, 2, 'VND', 'Phổ biến', 'Tặng thêm 2%', 'Gói được đề xuất', true, true, 3),
  ('Gói 200.000đ', 208, 200000, 200, 8, 208, 4, 'VND', 'Tiết kiệm', 'Tặng thêm 4%', null, true, false, 4),
  ('Gói 500.000đ', 540, 500000, 500, 40, 540, 8, 'VND', 'Fan lớn', 'Tặng thêm 8%', null, true, false, 5),
  ('Gói 1.000.000đ', 1150, 1000000, 1000, 150, 1150, 15, 'VND', 'Super Fan', 'Tiết kiệm nhất', 'Bonus tối đa mặc định', true, false, 6)
on conflict do nothing;

-- Upsert by price when rows already exist from older seeds.
update public.coin_packs cp
set
  name = v.name,
  base_coin_amount = v.base_coin,
  bonus_coin_amount = v.bonus_coin,
  total_coin_amount = v.total_coin,
  bonus_percent = v.bonus_pct,
  coin_amount = v.total_coin,
  label = v.label,
  badge_text = v.badge,
  description = v.description,
  is_recommended = v.is_recommended,
  sort_order = v.sort_order
from (
  values
    (20000::numeric, 'Gói 20.000đ'::text, 20::numeric, 0::numeric, 20::numeric, 0::numeric, 'Gói thử'::text, null::text, 'Mốc nạp cơ bản'::text, false, 1),
    (50000, 'Gói 50.000đ', 50, 0, 50, 0, 'Cơ bản', null, null, false, 2),
    (100000, 'Gói 100.000đ', 100, 2, 102, 2, 'Phổ biến', 'Tặng thêm 2%', 'Gói được đề xuất', true, 3),
    (200000, 'Gói 200.000đ', 200, 8, 208, 4, 'Tiết kiệm', 'Tặng thêm 4%', null, false, 4),
    (500000, 'Gói 500.000đ', 500, 40, 540, 8, 'Fan lớn', 'Tặng thêm 8%', null, false, 5),
    (1000000, 'Gói 1.000.000đ', 1000, 150, 1150, 15, 'Super Fan', 'Tiết kiệm nhất', 'Bonus tối đa mặc định', false, 6)
) as v(price, name, base_coin, bonus_coin, total_coin, bonus_pct, label, badge, description, is_recommended, sort_order)
where floor(cp.price_vnd) = v.price;
