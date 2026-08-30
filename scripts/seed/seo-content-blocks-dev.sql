-- DEV SAMPLE ONLY — SEO content block for /truyen (local seed).
-- Run via: npm run db:seed (when --with-seo-content flag) or manually in local DB.
-- Not for production bulk content.

INSERT INTO public.seo_content_blocks (
  page_type,
  route_path,
  locale,
  title,
  summary,
  content_markdown,
  faq_json,
  internal_links_json,
  placement,
  is_collapsible,
  status,
  published_at
)
SELECT
  'story_catalog',
  '/truyen',
  'vi',
  'Danh mục truyện trên ChapMee',
  'Tìm truyện sáng tác, truyện dịch và audio truyện — lọc theo thể loại, trạng thái và xu hướng.',
  E'## Khám phá truyện theo nhu cầu\n\nChapMee gom truyện sáng tác và truyện dịch trên cùng một danh mục. Bạn có thể lọc theo thể loại, trạng thái cập nhật hoặc tìm truyện có audio đi kèm.\n\n### Gợi ý bắt đầu\n\n- Dùng bộ lọc thể loại để thu hẹp danh sách\n- Xem trang Khám phá để cập nhật mới nhất\n- Nghe audio truyện tại trang Media',
  '[{"question":"ChapMee có những loại truyện nào?","answer":"Truyện sáng tác, truyện dịch và một số tác phẩm có audio hoặc video chuyển thể liên kết."}]'::jsonb,
  '[{"label":"Khám phá truyện mới","url":"/discover","note":"Cập nhật mới nhất"},{"label":"Media audio & video","url":"/media"}]'::jsonb,
  'before_footer',
  true,
  'published',
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.seo_content_blocks
  WHERE route_path = '/truyen'
    AND locale = 'vi'
    AND status = 'published'
);
