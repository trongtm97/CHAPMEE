create or replace function public.get_public_story_episode_counts(input_story_ids uuid[])
returns table (story_id uuid, episode_count bigint)
language sql
security definer
set search_path = public
as $$
  select
    episodes.story_id,
    count(*)::bigint as episode_count
  from public.episodes
  join public.stories on stories.id = episodes.story_id
  where episodes.story_id = any(input_story_ids)
    and stories.visibility = 'public'
    and stories.status in ('approved', 'published')
    and episodes.status in ('approved', 'published')
  group by episodes.story_id
$$;

grant execute on function public.get_public_story_episode_counts(uuid[]) to anon, authenticated;
