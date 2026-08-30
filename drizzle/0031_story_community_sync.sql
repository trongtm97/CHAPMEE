-- Story Community Sync: story_groups registry, interaction events, group feed projection, settings.

create table if not exists public.story_groups (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  group_slug varchar(160) not null,
  title text not null,
  description text,
  visibility varchar(32) not null default 'public',
  member_count integer not null default 0,
  activity_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_groups_visibility_check check (visibility in ('public', 'private')),
  constraint story_groups_story_id_unique unique (story_id)
);

create index if not exists story_groups_story_id_idx
  on public.story_groups (story_id);

create index if not exists story_groups_group_slug_idx
  on public.story_groups (group_slug);

create table if not exists public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  story_id uuid not null references public.stories(id) on delete cascade,
  group_id uuid not null references public.story_groups(id) on delete cascade,
  event_type varchar(64) not null,
  source_entity_type varchar(64) not null,
  source_entity_id uuid not null,
  source_url text,
  target_url text,
  source_comment_id uuid references public.comments(id) on delete set null,
  parent_comment_id uuid references public.comments(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  moderation_status varchar(32) not null default 'approved',
  spoiler_level varchar(32) not null default 'none',
  source_chapter_order integer,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint interaction_events_idempotency_key_unique unique (idempotency_key),
  constraint interaction_events_moderation_status_check check (
    moderation_status in ('pending', 'approved', 'flagged', 'hidden', 'rejected')
  ),
  constraint interaction_events_spoiler_level_check check (
    spoiler_level in ('none', 'mild', 'major')
  )
);

create index if not exists interaction_events_story_id_created_at_idx
  on public.interaction_events (story_id, created_at desc);

create index if not exists interaction_events_group_id_created_at_idx
  on public.interaction_events (group_id, created_at desc);

create table if not exists public.group_feed_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.story_groups(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  item_type varchar(64) not null,
  source_event_id uuid references public.interaction_events(id) on delete set null,
  source_comment_id uuid references public.comments(id) on delete set null,
  title text,
  excerpt text,
  target_url text,
  source_entity_type varchar(64) not null,
  source_entity_id uuid not null,
  score numeric(10, 2) not null default 0,
  visibility varchar(32) not null default 'visible',
  moderation_status varchar(32) not null default 'approved',
  spoiler_level varchar(32) not null default 'none',
  source_chapter_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_feed_items_group_source_unique unique (
    group_id,
    source_entity_type,
    source_entity_id,
    item_type
  ),
  constraint group_feed_items_visibility_check check (
    visibility in ('visible', 'hidden', 'moderated', 'deleted')
  ),
  constraint group_feed_items_moderation_status_check check (
    moderation_status in ('pending', 'approved', 'flagged', 'hidden', 'rejected')
  ),
  constraint group_feed_items_spoiler_level_check check (
    spoiler_level in ('none', 'mild', 'major')
  )
);

create index if not exists group_feed_items_group_id_created_at_idx
  on public.group_feed_items (group_id, created_at desc);

create index if not exists group_feed_items_story_id_created_at_idx
  on public.group_feed_items (story_id, created_at desc);

create index if not exists group_feed_items_visibility_moderation_idx
  on public.group_feed_items (visibility, moderation_status);

create table if not exists public.community_sync_settings (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.community_sync_settings (key, value_json)
values
  ('auto_create_story_group', 'true'::jsonb),
  ('sync_chapter_comments', 'true'::jsonb),
  ('sync_reel_comments', 'true'::jsonb),
  ('sync_audio_comments', 'true'::jsonb),
  ('sync_adaptation_comments', 'true'::jsonb),
  ('sync_author_replies', 'true'::jsonb),
  ('collapse_window_minutes', '30'::jsonb),
  ('max_activity_items_per_source_per_hour', '5'::jsonb),
  ('spoiler_protection_enabled', 'true'::jsonb),
  ('notify_group_members_default', '"important_only"'::jsonb)
on conflict (key) do nothing;

comment on table public.story_groups is
  'Materialized community group registry — one primary group per story.';

comment on table public.interaction_events is
  'Append-only interaction log for Story Community Sync (idempotent via idempotency_key).';

comment on table public.group_feed_items is
  'Story group feed projection — references source entities, does not copy full content.';

comment on table public.community_sync_settings is
  'Key/value admin settings for Story Community Sync behavior.';

grant select, insert, update, delete on public.story_groups to service_role;
grant select, insert, update, delete on public.interaction_events to service_role;
grant select, insert, update, delete on public.group_feed_items to service_role;
grant select, insert, update, delete on public.community_sync_settings to service_role;
