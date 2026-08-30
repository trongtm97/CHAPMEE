-- Rankings: author label from profiles (pen_name column = resolved public display name).
-- Must DROP first: return type adds username column (Postgres 42P13).

drop function if exists public.get_top_authors(timestamptz, integer);

create function public.get_top_authors(
  window_start timestamptz default null,
  ranking_limit integer default 20
)
returns table (
  author_id uuid,
  user_id uuid,
  pen_name text,
  avatar_url text,
  follower_count bigint,
  total_reads bigint,
  story_count bigint,
  score bigint,
  username text
)
language sql
stable
security definer
set search_path = public
as $$
  with author_stories as (
    select
      cp.id as author_id,
      cp.user_id,
      public.resolve_creator_display_name(p.display_name, p.username, cp.pen_name) as pen_name,
      p.username,
      p.avatar_url,
      s.id as story_id
    from public.creator_profiles cp
    join public.profiles p on p.id = cp.user_id
    join public.stories s on s.creator_id = cp.id
    where cp.status = 'active'
      and s.status in ('approved', 'published')
      and s.visibility = 'public'
  ),
  author_base as (
    select distinct on (author_id)
      author_id,
      user_id,
      pen_name,
      username,
      avatar_url
    from author_stories
    order by author_id, story_id
  ),
  story_engagement as (
    select
      as2.author_id,
      count(*) filter (where ae.event_name = 'open_story') as total_reads
    from public.analytics_events ae
    join author_stories as2
      on as2.story_id = ae.target_id
      and ae.target_type = 'story'
    where (window_start is null or ae.created_at >= window_start)
    group by as2.author_id
  ),
  author_follows as (
    select
      f.creator_id as author_id,
      count(*) as follower_count
    from public.follows f
    where f.creator_id is not null
    group by f.creator_id
  ),
  story_counts as (
    select
      as2.author_id,
      count(distinct as2.story_id) as story_count
    from author_stories as2
    group by as2.author_id
  )
  select
    ab.author_id,
    ab.user_id,
    ab.pen_name,
    ab.avatar_url,
    coalesce(af.follower_count, 0)::bigint as follower_count,
    coalesce(se.total_reads, 0)::bigint as total_reads,
    coalesce(sc.story_count, 0)::bigint as story_count,
    (
      coalesce(se.total_reads, 0) * 1 +
      coalesce(af.follower_count, 0) * 5 +
      coalesce(sc.story_count, 0) * 10
    )::bigint as score,
    ab.username
  from author_base ab
  left join story_engagement se on se.author_id = ab.author_id
  left join author_follows af on af.author_id = ab.author_id
  left join story_counts sc on sc.author_id = ab.author_id
  order by score desc
  limit greatest(1, least(ranking_limit, 100));
$$;

grant execute on function public.get_top_authors(timestamptz, integer)
  to anon, authenticated;
