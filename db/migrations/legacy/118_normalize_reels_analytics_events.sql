-- Normalize legacy swipe_* analytics event names to reels_*.
-- Safe on both schemas: legacy (metadata) and newer (properties, event_category).

update public.analytics_events
set event_name = case event_name
  when 'swipe_feed_viewed' then 'reels_feed_viewed'
  when 'swipe_item_viewed' then 'reels_item_viewed'
  when 'swipe_item_changed' then 'reels_item_changed'
  when 'swipe_read_more_clicked' then 'reels_read_more_clicked'
  when 'swipe_like_clicked' then 'reels_like_clicked'
  when 'swipe_save_clicked' then 'reels_save_clicked'
  when 'swipe_comment_opened' then 'reels_comment_opened'
  when 'swipe_share_clicked' then 'reels_share_clicked'
  when 'swipe_follow_author_clicked' then 'reels_follow_author_clicked'
  when 'swipe_view' then 'reels_item_viewed'
  when 'swipe_cta_click' then 'reels_read_more_clicked'
  when 'landing_swipe_clicked' then 'landing_reels_clicked'
  else event_name
end
where event_name in (
  'swipe_feed_viewed',
  'swipe_item_viewed',
  'swipe_item_changed',
  'swipe_read_more_clicked',
  'swipe_like_clicked',
  'swipe_save_clicked',
  'swipe_comment_opened',
  'swipe_share_clicked',
  'swipe_follow_author_clicked',
  'swipe_view',
  'swipe_cta_click',
  'landing_swipe_clicked'
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'event_category'
  ) then
    update public.analytics_events
    set event_category = 'reels'
    where event_category = 'swipe';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'properties'
  ) then
    update public.analytics_events
    set properties = jsonb_set(properties, '{experiment_key}', '"reels_cta_copy"'::jsonb, true)
    where properties->>'experiment_key' = 'swipe_cta_copy';

    update public.analytics_events
    set properties = jsonb_set(properties, '{conversion_event}', '"reels_read_more_clicked"'::jsonb, true)
    where properties->>'conversion_event' = 'swipe_read_more_clicked';

    update public.analytics_events
    set properties = jsonb_set(properties, '{conversion_event}', '"landing_reels_clicked"'::jsonb, true)
    where properties->>'conversion_event' = 'landing_swipe_clicked';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analytics_events'
      and column_name = 'metadata'
  ) then
    update public.analytics_events
    set metadata = jsonb_set(metadata, '{experiment_key}', '"reels_cta_copy"'::jsonb, true)
    where metadata->>'experiment_key' = 'swipe_cta_copy';

    update public.analytics_events
    set metadata = jsonb_set(metadata, '{conversion_event}', '"reels_read_more_clicked"'::jsonb, true)
    where metadata->>'conversion_event' = 'swipe_read_more_clicked';

    update public.analytics_events
    set metadata = jsonb_set(metadata, '{conversion_event}', '"landing_reels_clicked"'::jsonb, true)
    where metadata->>'conversion_event' = 'landing_swipe_clicked';
  end if;
end $$;
