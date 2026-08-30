-- Remove legacy Home/portal routing settings and backfill analytics surfaces.
-- Reels is the sole app entry; product.mobile_default_tab and product.desktop_home_mode are obsolete.

delete from public.monetization_settings
where key in (
  'product.mobile_default_tab',
  'product.desktop_home_mode'
);

update public.analytics_events
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{surface}',
  '"reels"'::jsonb,
  true
)
where metadata->>'surface' = 'home';

update public.analytics_events
set properties = jsonb_set(
  coalesce(properties, '{}'::jsonb),
  '{surface}',
  '"reels"'::jsonb,
  true
)
where properties->>'surface' = 'home';

update public.analytics_events
set metadata = replace(metadata::text, '"surface":"home"', '"surface":"reels"')::jsonb
where metadata::text like '%"surface":"home"%';

update public.analytics_events
set properties = replace(properties::text, '"surface":"home"', '"surface":"reels"')::jsonb
where properties::text like '%"surface":"home"%';
