-- Studio: story owners can restore hidden comments on their content.

create or replace function public.unhide_comment_by_story_owner(input_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role public.profile_role;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select role
  into current_role
  from public.profiles
  where id = current_user_id;

  if current_role in ('admin', 'moderator') then
    update public.comments
    set status = 'visible'
    where id = input_comment_id
      and status = 'hidden';

    return;
  end if;

  if not public.creator_owns_comment(input_comment_id, current_user_id) then
    raise exception 'Not authorized to unhide this comment';
  end if;

  update public.comments
  set status = 'visible'
  where id = input_comment_id
    and status = 'hidden';
end;
$$;

grant execute on function public.unhide_comment_by_story_owner(uuid) to authenticated;
