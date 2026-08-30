-- Extra ad placements: content hub bottom, reels between items (disabled by default)

insert into public.ad_placements (
  placement_key,
  name,
  description,
  surface,
  page_pattern,
  device,
  ad_format,
  size_mode,
  is_enabled,
  is_test_mode,
  max_per_page,
  min_content_gap
)
values
  (
    'content_hub_article_bottom',
    'Cuối bài viết / blog',
    'Banner cuối bài viết, sau nội dung chính.',
    'content_hub',
    '/bai-viet/*',
    'all',
    'display',
    'responsive',
    false,
    true,
    1,
    0
  ),
  (
    'reels_between_items',
    'Giữa các Reels (thử nghiệm)',
    'Chèn nhẹ giữa reel — mặc định tắt, không overlay che nội dung.',
    'reels',
    '/reels',
    'mobile',
    'in_feed',
    'responsive',
    false,
    true,
    1,
    0
  )
on conflict (placement_key) do nothing;
