-- Enable taxonomy behavior mismatch rule now that taxonomy analytics metrics exist.

update public.taxonomy_quality_rules
set
  config_json = coalesce(config_json, '{}'::jsonb) || jsonb_build_object(
    'enabled', true,
    'bounce_threshold', 0.85,
    'min_impressions', 20
  ),
  description = 'Phát hiện truyện có nhiều impression taxonomy nhưng tỷ lệ bắt đầu đọc quá thấp (bounce cao).',
  updated_at = now()
where rule_key = 'taxonomy_behavior_mismatch';
