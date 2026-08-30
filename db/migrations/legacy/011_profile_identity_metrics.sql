create or replace function public.get_reader_profile_metrics(input_user_id uuid)
returns table (
  saved_story_count bigint,
  following_creator_count bigint,
  comment_count bigint,
  comment_like_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.bookshelf_items
      where user_id = input_user_id
    ) as saved_story_count,
    (
      select count(*)::bigint
      from public.follows
      where follower_id = input_user_id
        and creator_id is not null
    ) as following_creator_count,
    (
      select count(*)::bigint
      from public.comments
      where user_id = input_user_id
    ) as comment_count,
    (
      select count(*)::bigint
      from public.comments
      join public.reactions
        on reactions.target_type = 'comment'
       and reactions.target_id = comments.id
       and reactions.reaction_type = 'like'
      where comments.user_id = input_user_id
    ) as comment_like_count
$$;

create or replace function public.get_public_creator_profile_metrics(input_creator_id uuid)
returns table (
  follower_count bigint,
  following_count bigint,
  story_count bigint,
  total_like_count bigint,
  total_read_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with public_stories as (
    select stories.id
    from public.stories
    where stories.creator_id = input_creator_id
      and stories.visibility = 'public'
      and stories.status in ('approved', 'published')
  ),
  public_episodes as (
    select episodes.id
    from public.episodes
    join public_stories on public_stories.id = episodes.story_id
    where episodes.status in ('approved', 'published')
  )
  select
    (
      select count(*)::bigint
      from public.follows
      where creator_id = input_creator_id
    ) as follower_count,
    (
      select count(*)::bigint
      from public.follows
      join public.creator_profiles on creator_profiles.user_id = follows.follower_id
      where follows.creator_id is not null
        and creator_profiles.id = input_creator_id
    ) as following_count,
    (
      select count(*)::bigint
      from public_stories
    ) as story_count,
    (
      select count(*)::bigint
      from public.reactions
      where reaction_type = 'like'
        and (
          (target_type = 'story' and target_id in (select id from public_stories))
          or (target_type = 'episode' and target_id in (select id from public_episodes))
        )
    ) as total_like_count,
    (
      select count(*)::bigint
      from public.analytics_events
      where event_name in ('open_story', 'start_reading', 'complete_chap')
        and (
          (target_type = 'story' and target_id in (select id from public_stories))
          or (target_type = 'episode' and target_id in (select id from public_episodes))
        )
    ) as total_read_count
$$;

grant execute on function public.get_reader_profile_metrics(uuid) to authenticated;
grant execute on function public.get_public_creator_profile_metrics(uuid) to anon, authenticated;
