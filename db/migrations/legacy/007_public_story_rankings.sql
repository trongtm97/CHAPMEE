-- MVP rule-based ranking for public story discovery.
-- Returns only public approved/published story IDs and scores, not raw
-- analytics rows, so Home/Discover can rank content without exposing event
-- details to public clients.

create or replace function public.get_public_story_rankings(
  window_start timestamptz default null,
  ranking_limit integer default 50
)
returns table (
  story_id uuid,
  score integer
)
language sql
stable
security definer
set search_path = public
as $$
  with eligible_stories as (
    select id, creator_id
    from public.stories
    where status in ('approved', 'published')
      and visibility = 'public'
  ),
  eligible_episodes as (
    select episodes.id, episodes.story_id
    from public.episodes
    join eligible_stories on eligible_stories.id = episodes.story_id
    where episodes.status in ('approved', 'published')
  ),
  event_scores as (
    select
      case
        when analytics_events.target_type = 'story'
          and analytics_events.target_id = eligible_stories.id
          then eligible_stories.id
        when analytics_events.target_type = 'episode'
          and analytics_events.target_id = eligible_episodes.id
          then eligible_episodes.story_id
        when analytics_events.metadata ? 'story_id'
          and analytics_events.metadata->>'story_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (analytics_events.metadata->>'story_id')::uuid
        when analytics_events.metadata ? 'episode_id'
          and analytics_events.metadata->>'episode_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then eligible_episodes.story_id
        else null
      end as story_id,
      case analytics_events.event_name
        when 'open_story' then 1
        when 'start_reading' then 2
        when 'complete_chap' then 5
        when 'next_chap_click' then 4
        when 'save_story' then 6
        when 'follow_creator' then 8
        when 'comment_created' then 3
        when 'report_created' then -20
        when 'feed_read_more' then 5
        when 'feed_skip' then -2
        else 0
      end as score
    from public.analytics_events
    left join eligible_stories
      on analytics_events.target_type = 'story'
      and analytics_events.target_id = eligible_stories.id
    left join eligible_episodes
      on (
        analytics_events.target_type = 'episode'
        and analytics_events.target_id = eligible_episodes.id
      )
      or (
        analytics_events.metadata ? 'episode_id'
        and analytics_events.metadata->>'episode_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        and (analytics_events.metadata->>'episode_id')::uuid = eligible_episodes.id
      )
    where (window_start is null or analytics_events.created_at >= window_start)
      and analytics_events.event_name in (
        'open_story',
        'start_reading',
        'complete_chap',
        'next_chap_click',
        'save_story',
        'follow_creator',
        'comment_created',
        'report_created',
        'feed_read_more',
        'feed_skip'
      )
  )
  select event_scores.story_id, coalesce(sum(event_scores.score), 0)::integer
  from event_scores
  join eligible_stories on eligible_stories.id = event_scores.story_id
  where event_scores.story_id is not null
  group by event_scores.story_id
  having coalesce(sum(event_scores.score), 0) > 0
  order by coalesce(sum(event_scores.score), 0) desc
  limit greatest(1, least(ranking_limit, 100));
$$;

grant execute on function public.get_public_story_rankings(timestamptz, integer)
to anon, authenticated;
