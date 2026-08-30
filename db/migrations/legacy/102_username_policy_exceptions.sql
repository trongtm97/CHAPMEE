-- Migration 102: Username policy exceptions + username change lock

create table if not exists public.username_policy_exceptions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.username_policy_rules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  exception_scope text not null default 'both',
  expires_at timestamptz,
  reason text,
  public_note text,
  created_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint username_policy_exceptions_scope_check check (
    exception_scope in ('username', 'display_name', 'both')
  ),
  constraint username_policy_exceptions_unique_active unique (rule_id, user_id)
);

create index if not exists idx_username_policy_exceptions_rule
  on public.username_policy_exceptions (rule_id)
  where revoked_at is null;

create index if not exists idx_username_policy_exceptions_user
  on public.username_policy_exceptions (user_id)
  where revoked_at is null;

alter table public.profiles
  add column if not exists username_change_locked boolean not null default false;

alter table public.username_policy_exceptions enable row level security;

drop policy if exists "Staff manage username policy exceptions" on public.username_policy_exceptions;
create policy "Staff manage username policy exceptions"
  on public.username_policy_exceptions for all
  to authenticated
  using (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()))
  with check (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()));

drop policy if exists "Users read own username policy exceptions" on public.username_policy_exceptions;
create policy "Users read own username policy exceptions"
  on public.username_policy_exceptions for select
  to authenticated
  using (user_id = auth.uid());
