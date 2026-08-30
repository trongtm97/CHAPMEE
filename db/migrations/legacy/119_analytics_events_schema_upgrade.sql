-- Align analytics_events with client/server writers (001 legacy → unified schema).

alter table public.analytics_events
  add column if not exists anonymous_id text,
  add column if not exists event_category text,
  add column if not exists properties jsonb not null default '{}'::jsonb,
  add column if not exists page_path text,
  add column if not exists referrer text,
  add column if not exists user_agent text;

-- Legacy rows stored payload in metadata only.
update public.analytics_events
set properties = metadata
where metadata is not null
  and metadata <> '{}'::jsonb
  and (properties = '{}'::jsonb or properties is null);

-- Mirror properties into metadata when metadata is empty (RLS + ranking SQL).
update public.analytics_events
set metadata = properties
where properties is not null
  and properties <> '{}'::jsonb
  and (metadata = '{}'::jsonb or metadata is null);

-- Backfill event_category from event_name.
update public.analytics_events
set event_category = 'reels'
where event_category is null
  and (
    event_name like 'reels_%'
    or event_name like 'feed_%'
    or event_name like 'swipe_%'
  );

update public.analytics_events
set event_category = 'reading'
where event_category is null
  and event_name in (
    'story_viewed',
    'chapter_opened',
    'chapter_completed',
    'next_chapter_clicked',
    'reading_time_tracked',
    'open_story',
    'start_reading',
    'complete_chap',
    'next_chap_click',
    'scroll_25',
    'scroll_50',
    'scroll_75'
  );

update public.analytics_events
set event_category = 'onboarding'
where event_category is null
  and event_name like 'onboarding_%';

update public.analytics_events
set event_category = 'creator'
where event_category is null
  and (
    event_name like 'creator_%'
    or event_name like 'story_created'
    or event_name like 'story_published'
    or event_name like 'chapter_created'
    or event_name like 'chapter_published'
  );

update public.analytics_events
set event_category = 'experiment'
where event_category is null
  and event_name like 'experiment_%';

update public.analytics_events
set event_category = 'app'
where event_category is null;

alter table public.analytics_events
  alter column event_category set default 'app';

create index if not exists analytics_events_event_name_created_idx
  on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);

create index if not exists analytics_events_target_id_idx
  on public.analytics_events (target_id)
  where target_id is not null;

-- Extend creator RLS: also match story/episode ids stored in properties jsonb.
drop policy if exists "Creators can read analytics events for own content" on public.analytics_events;

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
    analytics_events.properties ? 'story_id'
    and analytics_events.properties->>'story_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.stories
      join public.creator_profiles
        on creator_profiles.id = stories.creator_id
      where stories.id = (analytics_events.properties->>'story_id')::uuid
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
  or (
    analytics_events.properties ? 'episode_id'
    and analytics_events.properties->>'episode_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and exists (
      select 1
      from public.episodes
      join public.stories
        on stories.id = episodes.story_id
      join public.creator_profiles
        on creator_profiles.id = stories.creator_id
      where episodes.id = (analytics_events.properties->>'episode_id')::uuid
        and creator_profiles.user_id = auth.uid()
    )
  )
);
