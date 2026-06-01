-- Additional ChapMee system content templates (existing types only).

insert into public.creator_templates (
  id,
  owner_id,
  template_type,
  title,
  description,
  content,
  plain_text,
  is_system,
  status
)
values
  (
    'a1000001-0001-4001-8001-000000000007',
    null,
    'reels',
    'Reels — cliffhanger 3 dòng',
    'Hook ngắn, căng thẳng, kêu đọc tiếp.',
    '{"body":"Dòng 1: Câu hook gây tò mò.\nDòng 2: Leo thẳng xung đột.\nDòng 3: Cắt đúng lúc cao trào — đọc chương để biết tiếp.\n\nCTA: Đọc ngay trên ChapMee.","format":"plain"}'::jsonb,
    'Hook 3 dòng + CTA đọc chương',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000008',
    null,
    'chapter',
    'Kết chương — giữ chân người đọc',
    'Cliffhanger nhẹ, không spoil quá nhiều.',
    '{"body":"...\n\nVà ngay khi {ten_nhan_vat} tưởng mọi thứ đã tạm ổn, điều không ai ngờ tới xảy ra.\n\n**Hết chương.**\n\n→ Chương sau sẽ ra vào [thời gian/ lịch đăng].","format":"plain"}'::jsonb,
    'Cliffhanger kết chương...',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000009',
    null,
    'seo',
    'SEO — mô tả tìm kiếm',
    'Mô tả meta cho trang truyện.',
    '{"body":"{ten_truyen} — [thể loại]. [1-2 câu hook chứa từ khóa chính]. Đọc miễn phí trên ChapMee.","format":"plain"}'::jsonb,
    'Mô tả SEO ngắn',
    true,
    'active'
  ),
  (
    'a1000001-0001-4001-8001-000000000010',
    null,
    'reels',
    'CTA — kêu gọi bình luận & dự đoán',
    'Kết Reels bằng câu hỏi tương tác.',
    '{"body":"Bạn đoán chuyện gì sẽ xảy ra ở chương sau?\n\nComment dự đoán của bạn — mình sẽ đọc và có thể lấy ý tưởng cho tình tiết tiếp theo.\n\n#ChapMee #Reels","format":"plain"}'::jsonb,
    'CTA bình luận dự đoán',
    true,
    'active'
  )
on conflict (id) do nothing;
