-- Per-creator monetization / withdrawal overrides (default allow, explicit admin disable only)

create table if not exists public.creator_access_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  monetization_disabled boolean not null default false,
  monetization_disabled_reason text,
  monetization_disabled_by uuid references public.profiles(id) on delete set null,
  monetization_disabled_at timestamptz,
  withdrawal_disabled boolean not null default false,
  withdrawal_disabled_reason text,
  withdrawal_disabled_by uuid references public.profiles(id) on delete set null,
  withdrawal_disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_access_overrides_monetization_reason_chk check (
    monetization_disabled = false or monetization_disabled_reason is not null
  ),
  constraint creator_access_overrides_withdrawal_reason_chk check (
    withdrawal_disabled = false or withdrawal_disabled_reason is not null
  )
);

create index if not exists idx_creator_access_overrides_user_id
  on public.creator_access_overrides(user_id);

drop trigger if exists trg_touch_creator_access_overrides_updated_at on public.creator_access_overrides;
create trigger trg_touch_creator_access_overrides_updated_at
before update on public.creator_access_overrides
for each row execute function public.touch_updated_at();

alter table public.creator_access_overrides enable row level security;

drop policy if exists "Creator read own access override" on public.creator_access_overrides;
create policy "Creator read own access override"
  on public.creator_access_overrides for select
  using (auth.uid() = user_id or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage creator access overrides" on public.creator_access_overrides;
create policy "Admin manage creator access overrides"
  on public.creator_access_overrides for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

-- Migrate explicit admin suspensions into monetization_disabled overrides
insert into public.creator_access_overrides (
  user_id,
  monetization_disabled,
  monetization_disabled_reason,
  monetization_disabled_at
)
select
  cmp.user_id,
  true,
  coalesce(nullif(trim(cmp.suspended_reason), ''), 'Tài khoản đã bị tạm khóa kiếm tiền (dữ liệu cũ).'),
  coalesce(cmp.updated_at, now())
from public.creator_monetization_profiles cmp
where cmp.status = 'suspended'
  and not exists (
    select 1 from public.creator_access_overrides cao where cao.user_id = cmp.user_id
  )
on conflict (user_id) do nothing;
