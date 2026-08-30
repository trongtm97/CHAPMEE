-- Migration 053: RBAC security hardening (audit follow-up)

-- Only users with admin.user.role.assign may manage user_roles (not legacy admin/founder alone).
drop policy if exists "Role assigners can manage user roles" on public.user_roles;
create policy "Role assigners can manage user roles"
  on public.user_roles for insert
  to authenticated
  with check (public.can_assign_roles(auth.uid()));

create policy "Role assigners can update user roles"
  on public.user_roles for update
  to authenticated
  using (public.can_assign_roles(auth.uid()))
  with check (public.can_assign_roles(auth.uid()));

create policy "Role assigners can delete user roles"
  on public.user_roles for delete
  to authenticated
  using (public.can_assign_roles(auth.uid()));

-- Prevent self-service role escalation via profiles.role
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = public.current_profile_role()
    and status = (
      select p.status from public.profiles p where p.id = auth.uid()
    )
  );

-- Recreate seed helper (idempotent)
create or replace function public._rbac_seed_role_permissions(
  p_role_code text,
  p_permission_codes text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_perm_code text;
  v_perm_id uuid;
begin
  select id into v_role_id from public.roles where code = p_role_code;
  if v_role_id is null then
    return;
  end if;

  foreach v_perm_code in array p_permission_codes loop
    select id into v_perm_id from public.permissions where code = v_perm_code;
    if v_perm_id is not null then
      insert into public.role_permissions (role_id, permission_id)
      values (v_role_id, v_perm_id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

select public._rbac_seed_role_permissions('super_admin', array[
  'finance.payout.view',
  'finance.payout.approve',
  'finance.payout.reject',
  'finance.wallet.adjust',
  'finance.refund.create',
  'wallet.transaction.view.all'
]);

drop function if exists public._rbac_seed_role_permissions(text, text[]);
