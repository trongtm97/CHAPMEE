-- Community post comments: target column + creator studio moderation.

alter table public.comments
  add column if not exists community_post_id uuid references public.community_posts(id) on delete cascade;

create index if not exists comments_community_post_id_idx
  on public.comments(community_post_id);

alter table public.comments
  drop constraint if exists comments_target_required;

alter table public.comments
  add constraint comments_target_required check (
    num_nonnulls(story_id, episode_id, community_post_id) >= 1
  );

-- Creators read comments on their community posts (by creator_id or story ownership).
create policy "Creators can read comments on own community posts"
  on public.comments for select
  to authenticated
  using (
    community_post_id is not null
    and exists (
      select 1
      from public.community_posts cp
      where cp.id = comments.community_post_id
        and (
          exists (
            select 1
            from public.creator_profiles post_creator
            where post_creator.id = cp.creator_id
              and post_creator.user_id = auth.uid()
          )
          or exists (
            select 1
            from public.stories s
            join public.creator_profiles story_creator on story_creator.id = s.creator_id
            where s.id = cp.story_id
              and story_creator.user_id = auth.uid()
          )
        )
    )
  );

create policy "Story owners can read reports on community post comments"
  on public.reports for select
  to authenticated
  using (
    target_type = 'comment'
    and exists (
      select 1
      from public.comments c
      join public.community_posts cp on cp.id = c.community_post_id
      where c.id = reports.target_id
        and c.community_post_id is not null
        and (
          exists (
            select 1
            from public.creator_profiles post_creator
            where post_creator.id = cp.creator_id
              and post_creator.user_id = auth.uid()
          )
          or exists (
            select 1
            from public.stories s
            join public.creator_profiles story_creator on story_creator.id = s.creator_id
            where s.id = cp.story_id
              and story_creator.user_id = auth.uid()
          )
        )
    )
  );

create or replace function public.creator_owns_comment(input_comment_id uuid, input_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.comments c
    left join public.stories s on s.id = c.story_id
    left join public.creator_profiles story_cp on story_cp.id = s.creator_id
    left join public.community_posts cp on cp.id = c.community_post_id
    left join public.stories post_story on post_story.id = cp.story_id
    left join public.creator_profiles post_cp on post_cp.id = cp.creator_id
    left join public.creator_profiles post_story_cp on post_story_cp.id = post_story.creator_id
    where c.id = input_comment_id
      and (
        story_cp.user_id = input_user_id
        or post_cp.user_id = input_user_id
        or post_story_cp.user_id = input_user_id
      )
  );
$$;

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

  if not public.creator_owns_comment(input_comment_id, current_user_id) then
    raise exception 'Not authorized to pin this comment';
  end if;

  update public.comments
  set is_pinned = input_pinned
  where id = input_comment_id
    and status = 'visible';
end;
$$;

create or replace function public.hide_comment_by_story_owner(input_comment_id uuid)
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
    set status = 'hidden'
    where id = input_comment_id
      and status in ('visible', 'pending');

    return;
  end if;

  if not public.creator_owns_comment(input_comment_id, current_user_id) then
    raise exception 'Not authorized to hide this comment';
  end if;

  update public.comments
  set status = 'hidden'
  where id = input_comment_id
    and status in ('visible', 'pending');
end;
$$;

grant execute on function public.creator_owns_comment(uuid, uuid) to authenticated;
