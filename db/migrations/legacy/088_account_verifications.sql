-- Migration 088: Account verification (tick xanh) for ChapMee

alter table public.profiles
  add column if not exists is_verified boolean not null default false,
  add column if not exists verification_type text,
  add column if not exists verification_label text;

create table if not exists public.account_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  verification_type text not null,
  status text not null default 'pending',
  display_badge boolean not null default true,
  public_label text,
  request_reason text,
  admin_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id),
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_verifications_status_check check (
    status in ('none', 'pending', 'approved', 'rejected', 'revoked')
  ),
  constraint account_verifications_type_check check (
    verification_type in (
      'identity_verified',
      'notable_author',
      'official_account',
      'partner',
      'brand_account'
    )
  )
);

create unique index if not exists idx_account_verifications_active_user_type
  on public.account_verifications (user_id, verification_type)
  where status in ('pending', 'approved');

create index if not exists idx_account_verifications_status_created
  on public.account_verifications (status, coalesce(submitted_at, created_at) desc);

create index if not exists idx_account_verifications_user_id
  on public.account_verifications (user_id);

create or replace function public.sync_profile_verification_cache(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_label text;
begin
  select av.verification_type, av.public_label
  into v_type, v_label
  from public.account_verifications av
  where av.user_id = p_user_id
    and av.status = 'approved'
    and av.display_badge = true
  order by
    case av.verification_type
      when 'official_account' then 1
      when 'partner' then 2
      when 'notable_author' then 3
      when 'brand_account' then 4
      when 'identity_verified' then 5
      else 6
    end,
    av.reviewed_at desc nulls last
  limit 1;

  update public.profiles
  set
    is_verified = v_type is not null,
    verification_type = v_type,
    verification_label = nullif(trim(v_label), ''),
    updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.sync_profile_verification_cache(uuid) from public;
grant execute on function public.sync_profile_verification_cache(uuid) to authenticated;

create or replace function public.touch_account_verification_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists account_verifications_updated_at on public.account_verifications;
create trigger account_verifications_updated_at
  before update on public.account_verifications
  for each row
  execute function public.touch_account_verification_updated_at();

alter table public.account_verifications enable row level security;

drop policy if exists "Users read own verifications" on public.account_verifications;
create policy "Users read own verifications"
  on public.account_verifications for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_assign_roles(auth.uid())
    or public.is_staff_moderator(auth.uid())
  );

drop policy if exists "Users submit verification requests" on public.account_verifications;
create policy "Users submit verification requests"
  on public.account_verifications for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and submitted_at is not null
  );

drop policy if exists "Staff manage verifications" on public.account_verifications;
create policy "Staff manage verifications"
  on public.account_verifications for all
  to authenticated
  using (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()))
  with check (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()));

insert into public.app_settings (key, value, is_public)
values (
  'verification_requests_enabled',
  '{"enabled": true}'::jsonb,
  true
)
on conflict (key) do nothing;
