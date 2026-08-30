-- Studio: creators read/moderate comments on their own stories (inbox, hide via RPC).

create policy "Creators can read comments on own stories"
  on public.comments for select
  to authenticated
  using (
    exists (
      select 1
      from public.stories s
      join public.creator_profiles cp on cp.id = s.creator_id
      where s.id = comments.story_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Story owners can read reports on story comments"
  on public.reports for select
  to authenticated
  using (
    target_type = 'comment'
    and exists (
      select 1
      from public.comments c
      join public.stories s on s.id = c.story_id
      join public.creator_profiles cp on cp.id = s.creator_id
      where c.id = reports.target_id
        and cp.user_id = auth.uid()
    )
  );

create or replace function public.hide_comment_by_story_owner(input_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_story_creator uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if public.current_profile_role() in ('admin', 'moderator') then
    update public.comments
    set status = 'hidden'
    where id = input_comment_id
      and status in ('visible', 'pending');

    return;
  end if;

  select creator_profiles.user_id
  into target_story_creator
  from public.comments
  join public.stories on stories.id = comments.story_id
  join public.creator_profiles on creator_profiles.id = stories.creator_id
  where comments.id = input_comment_id;

  if target_story_creator is null or target_story_creator <> current_user_id then
    raise exception 'Not authorized to hide this comment';
  end if;

  update public.comments
  set status = 'hidden'
  where id = input_comment_id
    and status in ('visible', 'pending');
end;
$$;

grant execute on function public.hide_comment_by_story_owner(uuid) to authenticated;
