-- Migration 196: targeted performance support indexes.
-- These indexes support existing list, filter, reader, taxonomy, ads, and
-- analytics paths without changing business logic or RLS behavior.

-- Public/story catalog and Studio story lists.
create index if not exists idx_stories_public_published_at
  on public.stories (status, visibility, published_at desc)
  where visibility = 'public';

create index if not exists idx_stories_creator_updated
  on public.stories (creator_id, updated_at desc);

create index if not exists idx_stories_status_updated
  on public.stories (status, updated_at desc);

-- Reader and Studio chapter lists.
create index if not exists idx_episodes_story_status_number
  on public.episodes (story_id, status, episode_number);

create index if not exists idx_episodes_story_published
  on public.episodes (story_id, published_at desc)
  where published_at is not null;

create index if not exists idx_episodes_status_updated
  on public.episodes (status, updated_at desc);

-- Profile/admin user sorting and lookup.
create index if not exists idx_profiles_created
  on public.profiles (created_at desc);

create index if not exists idx_profiles_role_created
  on public.profiles (role, created_at desc);

-- Taxonomy admin table filters and public taxonomy pages.
create index if not exists idx_taxonomy_terms_type_usage
  on public.taxonomy_terms (type, usage_count desc, updated_at desc);

create index if not exists idx_taxonomy_terms_type_public_active
  on public.taxonomy_terms (type, is_public, is_active, sort_order);

create index if not exists idx_story_taxonomy_terms_term_type_story
  on public.story_taxonomy_terms (term_id, type, story_id);

create index if not exists idx_story_taxonomy_terms_type_story
  on public.story_taxonomy_terms (type, story_id);

-- Moderation/admin queues.
create index if not exists idx_comments_status_created
  on public.comments (status, created_at desc);

create index if not exists idx_reports_status_created
  on public.reports (status, created_at desc);

create index if not exists idx_community_posts_status_created
  on public.community_posts (status, created_at desc);

-- Event aggregation and reader/tracking lookups.
create index if not exists idx_analytics_events_target_created
  on public.analytics_events (target_type, target_id, created_at desc);

create index if not exists idx_analytics_events_name_target_created
  on public.analytics_events (event_name, target_type, target_id, created_at desc);

-- Ads placement lookup and ad revenue rollups.
create index if not exists idx_ad_placements_surface_device_enabled
  on public.ad_placements (surface, device, is_enabled);

create index if not exists idx_ad_render_events_type_created
  on public.ad_render_events (event_type, created_at desc);

create index if not exists idx_ad_render_events_story_created
  on public.ad_render_events (story_id, created_at desc)
  where story_id is not null;

create index if not exists idx_ad_render_events_chapter_created
  on public.ad_render_events (chapter_id, created_at desc)
  where chapter_id is not null;

create index if not exists idx_ad_render_events_author_created
  on public.ad_render_events (author_id, created_at desc)
  where author_id is not null;

create index if not exists idx_ad_daily_author_stats_surface_date
  on public.ad_daily_author_stats (surface, stat_date desc);

create index if not exists idx_ad_daily_author_stats_story_date
  on public.ad_daily_author_stats (story_id, stat_date desc)
  where story_id is not null;

create index if not exists idx_ad_daily_author_stats_chapter_date
  on public.ad_daily_author_stats (chapter_id, stat_date desc)
  where chapter_id is not null;
