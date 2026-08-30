create or replace function public.get_public_story_save_counts(input_story_ids uuid[])
returns table (story_id uuid, save_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    bookshelf_items.story_id,
    count(*)::bigint as save_count
  from public.bookshelf_items
  join public.stories on stories.id = bookshelf_items.story_id
  where bookshelf_items.story_id = any(input_story_ids)
    and stories.visibility = 'public'
    and stories.status in ('approved', 'published')
  group by bookshelf_items.story_id
$$;

create or replace function public.get_public_creator_follow_stats(input_creator_id uuid)
returns table (follower_count bigint, following_count bigint)
language sql
security definer
set search_path = public
as $$
  with target_creator as (
    select id, user_id
    from public.creator_profiles
    where id = input_creator_id
      and status = 'active'
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
      join target_creator on target_creator.user_id = follows.follower_id
      where follows.creator_id is not null
    ) as following_count
$$;

grant execute on function public.get_public_story_save_counts(uuid[]) to anon, authenticated;
grant execute on function public.get_public_creator_follow_stats(uuid) to anon, authenticated;
