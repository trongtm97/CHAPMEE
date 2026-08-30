-- Allow creators to read only analytics source rows that belong to their own
-- creator profile. This keeps Creator Analytics scoped without granting
-- platform-wide analytics access.

create policy "Creators can read analytics events for own content"
on public.analytics_events for select
using (
  exists (
    select 1
    from public.stories
    join public.creator_profiles
      on creator_profiles.id = stories.creator_id
    where analytics_events.target_type = 'story'
      and analytics_events.target_id = stories.id
      and creator_profiles.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.episodes
    join public.stories
      on stories.id = episodes.story_id
    join public.creator_profiles
      on creator_profiles.id = stories.creator_id
    where analytics_events.target_type = 'episode'
      and analytics_events.target_id = episodes.id
      and creator_profiles.user_id = auth.uid()
  )
  or (
    analytics_events.metadata ? 'story_id'
    and analytics_events.metadata->>'story_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.stories
      join public.creator_profiles
        on creator_profiles.id = stories.creator_id
      where stories.id = (analytics_events.metadata->>'story_id')::uuid
        and creator_profiles.user_id = auth.uid()
    )
  )
  or (
    analytics_events.metadata ? 'episode_id'
    and analytics_events.metadata->>'episode_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.episodes
      join public.stories
        on stories.id = episodes.story_id
      join public.creator_profiles
        on creator_profiles.id = stories.creator_id
      where episodes.id = (analytics_events.metadata->>'episode_id')::uuid
        and creator_profiles.user_id = auth.uid()
    )
  )
);

create policy "Creators can read bookshelf rows for own stories"
on public.bookshelf_items for select
using (
  exists (
    select 1
    from public.stories
    join public.creator_profiles
      on creator_profiles.id = stories.creator_id
    where stories.id = bookshelf_items.story_id
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Creators can read follows for own profile or stories"
on public.follows for select
using (
  exists (
    select 1
    from public.creator_profiles
    where creator_profiles.id = follows.creator_id
      and creator_profiles.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.stories
    join public.creator_profiles
      on creator_profiles.id = stories.creator_id
    where stories.id = follows.story_id
      and creator_profiles.user_id = auth.uid()
  )
);
