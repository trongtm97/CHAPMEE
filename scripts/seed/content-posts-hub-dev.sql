-- DEV SAMPLE — published posts for /bai-viet (local seed only).
-- Run: npm run db:seed -- --with-content-posts
-- Requires public_code column (migration 158+). Safe to re-run (upsert by slug).

INSERT INTO public.admin_content_posts (
  title,
  slug,
  public_code,
  excerpt,
  content,
  category,
  tags,
  post_type,
  status,
  indexable,
  published_at,
  updated_at
)
VALUES
  (
    'ChapMee là gì? Cách lướt và đọc truyện theo kiểu mới',
    'chapmee-la-gi-cach-doc-truyen',
    '91000001',
    'Làm quen giao diện ChapMee, Reels khám phá và cách theo dõi truyện yêu thích.',
    E'## ChapMee dành cho ai?\n\nChapMee là nền tảng giải trí text/story: đọc truyện, lướt Reels và tham gia cộng đồng.\n\n## Bắt đầu\n\n1. Vào **Khám phá** hoặc **Reels**.\n2. Mở truyện và đọc chap.\n3. Lưu vào thư viện để đọc tiếp.',
    'huong-dan-doc',
    ARRAY['featured', 'huong-dan']::text[],
    'guide',
    'published',
    true,
    now() - interval '14 days',
    now() - interval '2 days'
  ),
  (
    'Cách dùng Reels để khám phá truyện nhanh hơn',
    'cach-dung-reels-kham-pha-truyen',
    '91000002',
    'Reels giúp bạn cảm nhận vibe truyện trước khi mở đọc dài.',
    E'## Reels trên ChapMee\n\nVuốt feed Reels để xem hook truyện ngắn, chạm tiêu đề khi muốn đọc đầy đủ.',
    NULL,
    ARRAY['featured', 'reels']::text[],
    'guide',
    'published',
    true,
    now() - interval '12 days',
    now() - interval '3 days'
  ),
  (
    'Hướng dẫn tạo tài khoản và lưu truyện yêu thích',
    'tao-tai-khoan-luu-truyen-yeu-thich',
    '91000003',
    'Đăng ký, đăng nhập và quản lý thư viện đọc cá nhân.',
    E'## Tạo tài khoản\n\nTruy cập **Đăng ký** và hoàn tất hồ sơ.\n\n## Lưu truyện\n\nChọn **Lưu** trên trang truyện hoặc thêm vào bộ sưu tập.',
    'goc-nguoi-doc',
    ARRAY['featured']::text[],
    'guide',
    'published',
    true,
    now() - interval '10 days',
    now() - interval '4 days'
  ),
  (
    'Dành cho tác giả: bắt đầu viết truyện trên ChapMee Studio',
    'tac-gia-bat-dau-voi-chapmee-studio',
    '91000004',
    'Từ thiết lập Studio đến đăng chap đầu tiên.',
    E'## Vào Studio\n\nBật chế độ tác giả, tạo truyện mới và xuất bản chap khi sẵn sàng.',
    'goc-tac-gia',
    ARRAY['studio', 'tac-gia']::text[],
    'editorial',
    'published',
    true,
    now() - interval '9 days',
    now() - interval '5 days'
  ),
  (
    'Cách xây dựng hồ sơ tác giả thu hút người đọc',
    'xay-dung-ho-so-tac-gia-thu-hut',
    '91000005',
    'Pen name, mô tả và lịch đăng giúp độc giả tin tưởng.',
    E'## Hồ sơ rõ ràng\n\nGiữ pen name nhất quán và mô tả thể loại bạn viết nhiều nhất.',
    'goc-tac-gia',
    ARRAY['tac-gia']::text[],
    'editorial',
    'published',
    true,
    now() - interval '8 days',
    now() - interval '6 days'
  ),
  (
    'Cập nhật ChapMee: các tính năng đang phát triển',
    'cap-nhat-chapmee-tinh-nang-dang-phat-trien',
    '91000006',
    'Tổng quan hướng phát triển — không phải cam kết pháp lý.',
    E'## Tin cập nhật\n\nTheo dõi mục **Bài viết** và gửi góp ý qua **Liên hệ**.',
    'cap-nhat',
    ARRAY['cap-nhat']::text[],
    'news',
    'published',
    true,
    now() - interval '7 days',
    now() - interval '1 day'
  )
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  content = EXCLUDED.content,
  category = EXCLUDED.category,
  tags = EXCLUDED.tags,
  post_type = EXCLUDED.post_type,
  status = EXCLUDED.status,
  indexable = EXCLUDED.indexable,
  published_at = EXCLUDED.published_at,
  updated_at = EXCLUDED.updated_at;
