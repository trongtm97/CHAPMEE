-- Allow staff to update profile.status when banning/unbanning (RLS blocks direct update)

create or replace function public.staff_set_profile_status(
  target_user_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_status not in ('active', 'banned', 'suspended') then
    raise exception 'invalid profile status';
  end if;

  if not (
    public.user_has_permission(auth.uid(), 'admin.user.ban')
    or public.user_has_permission(auth.uid(), 'moderation.ban_user')
    or public.user_has_permission(auth.uid(), 'moderation.unban_user')
  ) then
    raise exception 'permission denied';
  end if;

  update public.profiles
  set status = new_status,
      updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.staff_set_profile_status(uuid, text) from public;
grant execute on function public.staff_set_profile_status(uuid, text) to authenticated;
