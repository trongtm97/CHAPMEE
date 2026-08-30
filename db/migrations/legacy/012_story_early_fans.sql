create table public.story_early_fans (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  reads_at_award bigint not null default 0,
  followers_at_award bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

create index story_early_fans_story_id_idx
on public.story_early_fans(story_id);

create index story_early_fans_user_id_idx
on public.story_early_fans(user_id);

alter table public.story_early_fans enable row level security;

create policy "Users can read own story early fans"
on public.story_early_fans for select
using (auth.uid() = user_id);

create policy "Users can create own story early fans"
on public.story_early_fans for insert
with check (auth.uid() = user_id);

create or replace function public.get_public_story_early_fan_stats(input_story_id uuid)
returns table (
  story_id uuid,
  story_title text,
  story_slug text,
  story_created_at timestamptz,
  read_count bigint,
  follower_count bigint,
  save_count bigint,
  early_fan_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with target_story as (
    select stories.id, stories.title, stories.slug, stories.created_at
    from public.stories
    where stories.id = input_story_id
      and stories.visibility = 'public'
      and stories.status in ('approved', 'published')
  ),
  story_episodes as (
    select episodes.id
    from public.episodes
    join target_story on target_story.id = episodes.story_id
    where episodes.status in ('approved', 'published')
  ),
  stats as (
    select
      (
        select count(*)::bigint
        from public.analytics_events
        where analytics_events.event_name in ('open_story', 'start_reading', 'complete_chap')
          and (
            (analytics_events.target_type = 'story' and analytics_events.target_id = target_story.id)
            or (
              analytics_events.target_type = 'episode'
              and analytics_events.target_id in (select id from story_episodes)
            )
          )
      ) as read_count,
      (
        select count(*)::bigint
        from public.follows
        where follows.story_id = target_story.id
      ) as follower_count,
      (
        select count(*)::bigint
        from public.bookshelf_items
        where bookshelf_items.story_id = target_story.id
      ) as save_count,
      (
        select count(*)::bigint
        from public.story_early_fans
        where story_early_fans.story_id = target_story.id
      ) as early_fan_count
    from target_story
  )
  select
    target_story.id as story_id,
    target_story.title as story_title,
    target_story.slug as story_slug,
    target_story.created_at as story_created_at,
    stats.read_count,
    stats.follower_count,
    stats.save_count,
    stats.early_fan_count
  from target_story, stats;
$$;

create or replace function public.award_story_early_fan(
  input_story_id uuid,
  input_user_id uuid
)
returns table (
  awarded boolean,
  already_awarded boolean,
  eligible boolean,
  story_id uuid,
  story_title text,
  story_slug text,
  story_created_at timestamptz,
  read_count bigint,
  follower_count bigint,
  save_count bigint,
  awarded_at timestamptz,
  reads_at_award bigint,
  followers_at_award bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  story_row record;
  stats_row record;
begin
  select
    stats.story_id,
    stats.story_title,
    stats.story_slug,
    stats.story_created_at,
    stats.read_count,
    stats.follower_count,
    stats.save_count,
    stats.early_fan_count
  into stats_row
  from public.get_public_story_early_fan_stats(input_story_id) as stats;

  if stats_row.story_id is null then
    return query
    select
      false,
      false,
      false,
      null::uuid,
      null::text,
      null::text,
      null::timestamptz,
      0::bigint,
      0::bigint,
      0::bigint,
      null::timestamptz,
      0::bigint,
      0::bigint;
    return;
  end if;

  if exists (
    select 1
    from public.story_early_fans
    where story_early_fans.story_id = input_story_id
      and story_early_fans.user_id = input_user_id
  ) then
    return query
    select
      false,
      true,
      true,
      stats_row.story_id,
      stats_row.story_title,
      stats_row.story_slug,
      stats_row.story_created_at,
      stats_row.read_count,
      stats_row.follower_count,
      stats_row.save_count,
      null::timestamptz,
      null::bigint,
      null::bigint;
    return;
  end if;

  if not (
    stats_row.read_count < 1000
    or stats_row.follower_count < 100
    or stats_row.story_created_at >= now() - interval '7 days'
  ) then
    return query
    select
      false,
      false,
      false,
      stats_row.story_id,
      stats_row.story_title,
      stats_row.story_slug,
      stats_row.story_created_at,
      stats_row.read_count,
      stats_row.follower_count,
      stats_row.save_count,
      null::timestamptz,
      null::bigint,
      null::bigint;
    return;
  end if;

  insert into public.story_early_fans (
    story_id,
    user_id,
    awarded_at,
    reads_at_award,
    followers_at_award
  ) values (
    input_story_id,
    input_user_id,
    now(),
    stats_row.read_count,
    stats_row.follower_count
  );

  return query
  select
    true,
    false,
    true,
    stats_row.story_id,
    stats_row.story_title,
    stats_row.story_slug,
    stats_row.story_created_at,
    stats_row.read_count,
    stats_row.follower_count,
    stats_row.save_count,
    now(),
    stats_row.read_count,
    stats_row.follower_count;
end;
$$;

grant execute on function public.get_public_story_early_fan_stats(uuid)
to anon, authenticated;

grant execute on function public.award_story_early_fan(uuid, uuid)
to anon, authenticated;
