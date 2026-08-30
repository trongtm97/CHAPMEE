alter table public.comments
add column if not exists is_pinned boolean not null default false;

create index if not exists comments_is_pinned_idx
on public.comments(is_pinned);

create or replace function public.set_comment_pinned(
  input_comment_id uuid,
  input_pinned boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_role public.profile_role;
  target_story_creator uuid;
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
    set is_pinned = input_pinned
    where id = input_comment_id;

    return;
  end if;

  select creator_profiles.user_id
  into target_story_creator
  from public.comments
  join public.stories on stories.id = comments.story_id
  join public.creator_profiles on creator_profiles.id = stories.creator_id
  where comments.id = input_comment_id
  and comments.status = 'visible';

  if target_story_creator is null or target_story_creator <> current_user_id then
    raise exception 'Not authorized to pin this comment';
  end if;

  update public.comments
  set is_pinned = input_pinned
  where id = input_comment_id;
end;
$$;

grant execute on function public.set_comment_pinned(uuid, boolean) to authenticated;
