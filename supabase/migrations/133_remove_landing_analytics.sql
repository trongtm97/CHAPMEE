-- Remove landing page analytics and experiment artifacts.

delete from public.analytics_events
where event_name in ('landing_reels_clicked', 'landing_swipe_clicked');

delete from public.analytics_events
where metadata->>'experiment_key' = 'landing_hero_copy'
   or properties->>'experiment_key' = 'landing_hero_copy';

update public.analytics_events
set metadata = metadata - 'conversion_event'
where metadata->>'conversion_event' in ('landing_reels_clicked', 'landing_swipe_clicked');

update public.analytics_events
set properties = properties - 'conversion_event'
where properties->>'conversion_event' in ('landing_reels_clicked', 'landing_swipe_clicked');
