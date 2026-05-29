-- ChapMee demo seed for development and staging.
--
-- Option A:
-- Copy and paste this file into Supabase Dashboard -> SQL Editor.
--
-- Option B:
-- Use the Supabase CLI if this project is already linked, then run the seed workflow.
--
-- Run all migrations before this seed.
-- This seed does not create auth.users or fake profiles.
-- It requires one real user to exist in profiles and creator_profiles.
-- After it finishes, run:
--
--   NOTIFY pgrst, 'reload schema';

begin;

do $$
begin
  if not exists (
    select 1
    from public.creator_profiles cp
    join public.profiles p on p.id = cp.user_id
  ) then
    raise exception 'Create a user in the app, log in, enable Creator Mode, then run this seed again.';
  end if;
end
$$;

insert into public.genres (id, name, slug, description)
values
  ('30000000-0000-0000-0000-000000000001', 'Ngôn tình', 'ngon-tinh', 'Tình cảm hiện đại, cảm xúc rõ, chương ngắn dễ đọc trên điện thoại.'),
  ('30000000-0000-0000-0000-000000000002', 'Drama', 'drama', 'Mâu thuẫn gia đình, công sở và những lựa chọn khó nói.'),
  ('30000000-0000-0000-0000-000000000003', 'Kinh dị', 'kinh-di', 'Không khí lạ và rùng mình nhẹ, phù hợp MVP text-only.'),
  ('30000000-0000-0000-0000-000000000004', 'Trinh thám', 'trinh-tham', 'Manh mối, mất tích, suy luận và cú lật cuối chương.'),
  ('30000000-0000-0000-0000-000000000005', 'Xuyên không', 'xuyen-khong', 'Nhân vật bước sang thời gian hoặc thế giới khác.'),
  ('30000000-0000-0000-0000-000000000006', 'Chat story', 'chat-story', 'Truyện kể qua tin nhắn, ghi chú và hội thoại nhanh.'),
  ('30000000-0000-0000-0000-000000000007', 'Truyện ngắn', 'truyen-ngan', 'Câu chuyện gọn, hook rõ, twist nhanh.'),
  ('30000000-0000-0000-0000-000000000008', 'Chữa lành', 'chua-lanh', 'Nhẹ nhàng, ấm áp, cho người đọc thở chậm lại.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.tags (id, name, slug)
values
  ('40000000-0000-0000-0000-000000000001', 'báo thù', 'bao-thu'),
  ('40000000-0000-0000-0000-000000000002', 'bí mật', 'bi-mat'),
  ('40000000-0000-0000-0000-000000000003', 'cưới trước yêu sau', 'cuoi-truoc-yeu-sau'),
  ('40000000-0000-0000-0000-000000000004', 'mất tích', 'mat-tich'),
  ('40000000-0000-0000-0000-000000000005', 'trọng sinh', 'trong-sinh'),
  ('40000000-0000-0000-0000-000000000006', 'tổng tài', 'tong-tai'),
  ('40000000-0000-0000-0000-000000000007', 'học đường', 'hoc-duong'),
  ('40000000-0000-0000-0000-000000000008', 'twist cuối', 'twist-cuoi'),
  ('40000000-0000-0000-0000-000000000009', 'gia đình', 'gia-dinh'),
  ('40000000-0000-0000-0000-000000000010', 'tâm lý', 'tam-ly')
on conflict (slug) do update set
  name = excluded.name;

with selected_creator as (
  select cp.id as creator_id, cp.user_id
  from public.creator_profiles cp
  join public.profiles p on p.id = cp.user_id
  order by cp.created_at, cp.id
  limit 1
),
story_seed (
  id,
  title,
  slug,
  hook,
  short_description,
  long_description,
  genre_slug,
  status,
  visibility,
  is_completed,
  published_offset
) as (
  values
    (
      '50000000-0000-0000-0000-000000000001'::uuid,
      'Hợp Đồng Lúc 0 Giờ',
      'hop-dong-luc-0-gio',
      'Đúng 0 giờ, Mai nhận được hợp đồng cưới từ người cô vừa chặn ba năm trước.',
      'Một bản hợp đồng có chữ ký của mẹ khiến Mai phải bước vào cuộc hôn nhân giả.',
      'Mai chỉ muốn giữ tiệm bánh của mẹ. Khánh cần một cuộc hôn nhân trong 90 ngày để cứu một bí mật gia đình. Cả hai đều nghĩ mình đang cầm lá bài an toàn nhất, cho đến khi trang cuối của hợp đồng nhắc đúng tên người đã mất tích ba năm trước.',
      'ngon-tinh',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '20 days'
    ),
    (
      '50000000-0000-0000-0000-000000000002'::uuid,
      'Tin Nhắn Từ Phòng 404',
      'tin-nhan-tu-phong-404',
      'Mỗi đêm, lễ tân khách sạn đều nhận cuộc gọi từ phòng 404, dù tầng bốn không tồn tại.',
      'Phòng 404 gọi tên Vy và biết cả ngày cô chưa từng sống qua.',
      'Khách sạn Ánh Sao không có tầng bốn. Vậy mà máy tổng đài vẫn đổ chuông đúng 1 giờ sáng, giọng nói bên kia đọc vanh vách màu áo Vy đang mặc và chiếc vali cô chưa hề mang tới. Càng tìm hiểu, Vy càng thấy mình là người bị nhắc đến trong hồ sơ cũ của khách sạn.',
      'kinh-di',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '18 days'
    ),
    (
      '50000000-0000-0000-0000-000000000003'::uuid,
      'Ngày Tôi Mượn Tuổi 17',
      'ngay-toi-muon-tuoi-17',
      'Vừa tỉnh dậy, An đã thấy đồng hồ trên cổ tay đếm lùi từ 23:59:58.',
      'An quay về lớp 12 và có đúng một ngày để sửa tin nhắn cũ.',
      'An tưởng mình gặp ác mộng cho đến khi nhìn thấy lớp 12A3 và chiếc bàn cuối cùng nơi cô từng ngồi. Điện thoại chứa một tin nhắn chưa gửi mười năm trước. Mỗi lần An thay đổi một chi tiết nhỏ, một người trong lớp lại biến mất khỏi ký ức của mọi người.',
      'xuyen-khong',
      'published'::public.content_status,
      'public'::public.visibility_status,
      true,
      interval '16 days'
    ),
    (
      '50000000-0000-0000-0000-000000000004'::uuid,
      'Group Chat Không Có Tôi',
      'group-chat-khong-co-toi',
      'Cả lớp có một nhóm chat bí mật, và tin nhắn ghim đầu tiên là tên Nhi.',
      'Nhi vô tình thấy nhóm chat đang bàn cách đẩy cô ra khỏi mọi ảnh chụp.',
      'Nhi chỉ định mượn điện thoại lớp trưởng. Nhưng trên màn hình, nhóm chat không tên hiện ra với hàng chục tin nhắn nói về một người vắng mặt. Tới khi Nhi đọc hết lịch sử, cô mới hiểu người bị xóa khỏi lớp không phải người khác.',
      'chat-story',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '14 days'
    ),
    (
      '50000000-0000-0000-0000-000000000005'::uuid,
      'Tiệm Trà Sau Cơn Mưa',
      'tiem-tra-sau-con-mua',
      'Mỗi vị khách của tiệm trà đều để lại một mẫu giấy, như thể đang lần về một ký ức cũ.',
      'Hạ mở lại tiệm trà của mẹ và phát hiện những lá thư dẫn tới món nợ cuối cùng.',
      'Sau cơn mưa, tiệm trà nhỏ của Hạ chỉ còn vài bộ bàn ghế và một cuốn sổ nợ cũ. Một vị khách lạ luôn gọi đúng món mẹ cô từng pha, rồi lặng lẽ để lại những mảnh giấy ghi địa chỉ. Hạ lần theo chúng và nhận ra mẹ mình đã giấu một cuộc hẹn kéo dài nhiều năm.',
      'chua-lanh',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '12 days'
    ),
    (
      '50000000-0000-0000-0000-000000000006'::uuid,
      'Sếp Tổng Đọc Nhật Ký Của Tôi',
      'sep-tong-doc-nhat-ky-cua-toi',
      'Bản nhật ký riêng của Lan bỗng xuất hiện ngay giữa phòng họp.',
      'Mọi người đều đọc được dòng cô viết về sếp tổng.',
      'Lan viết nhật ký để tự nhắc mình đừng khóc ở công ty. Thế mà sáng nay, trang cô giấu trong ngăn bàn lại nằm trên máy chiếu của cuộc họp. Điều tệ hơn là sếp tổng không hề bất ngờ. Ông chỉ hỏi: còn trang sau, em viết gì?',
      'drama',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '10 days'
    ),
    (
      '50000000-0000-0000-0000-000000000007'::uuid,
      'Bản Đồ Những Người Mất Tích',
      'ban-do-nhung-nguoi-mat-tich',
      'Một bản đồ giấy tự đánh dấu vị trí người mất tích tiếp theo.',
      'Phúc nhận bản đồ từ cha và phát hiện mỗi chấm đỏ đều chạy trước một vụ biến mất.',
      'Cha Phúc để lại một chiếc hộp nhỏ cùng lời dặn không được chạm vào chấm đỏ đầu tiên. Sáng hôm sau, công viên ven sông sáng lên một dấu mới. Khi Phúc tới nơi, băng ghế vẫn còn ấm, nhưng người ngồi đó đã không còn trên bất kỳ camera nào.',
      'trinh-tham',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '8 days'
    ),
    (
      '50000000-0000-0000-0000-000000000008'::uuid,
      'Căn Hộ Tầng 13 Rưỡi',
      'can-ho-tang-13-ruoi',
      'Thang máy dừng ở tầng 13 rưỡi, nơi chỉ có một mùi hoa nhài cũ.',
      'Tú chuyển vào căn hộ rẻ bất thường và thấy nhà mình có thêm một chiếc cửa không ai nhắc đến.',
      'Tòa nhà chỉ có 13 tầng, nhưng mỗi khi trời mưa, bảng điều khiển lại sáng lên một nút 13 rưỡi. Tú tưởng lỗi hệ thống cho đến khi nghe tiếng gõ ngay sau bức tường phòng tắm. Bên ngoài cánh cửa bí mật là hành lang giống hệt hành lang trong ảnh cưới cũ của mẹ.',
      'kinh-di',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '6 days'
    ),
    (
      '50000000-0000-0000-0000-000000000009'::uuid,
      'Ba Phút Trước Khi Chuông Reo',
      'ba-phut-truoc-khi-chuong-reo',
      'Mỗi lần tiếng chuông sắp reo, Vy lại quay về đúng ba phút trước đó.',
      'Trong vòng lặp của tiết học cuối ngày, Vy chỉ có thời gian để nhận ra ai đang nói dối.',
      'Ba phút là đủ để Vy thuộc lòng từng tiếng kéo ghế, từng cái liếc mắt và cả lời thì thầm sau lưng mình. Nhưng vòng lặp chỉ bắt đầu thay đổi khi cô xin lỗi người ngồi phía sau. Câu trả lời nhận lại làm cả lớp im bặt, vì cái tên bị xóa khỏi danh sách chính là của Vy.',
      'truyen-ngan',
      'published'::public.content_status,
      'public'::public.visibility_status,
      true,
      interval '4 days'
    ),
    (
      '50000000-0000-0000-0000-000000000010'::uuid,
      'Bữa Cơm Có Ghế Trống',
      'bua-com-co-ghe-trong',
      'Nhà My luôn bày sáu bộ bát đũa, nhưng tối nay chỉ có năm người ngồi quanh bàn.',
      'Một chiếc ghế trống bắt đầu tự kéo ra và để lại dấu hiệu của một người đã biến mất.',
      'Gia đình My gọi đó là thói quen. Mẹ luôn dọn thừa một chỗ như thể chờ ai đó về muộn. Nhưng tối sinh nhật, chiếc ghế trống tự lùi ra khỏi bàn và dưới mặt gỗ hiện lên một cái tên được khắc bằng móng tay. Tối đó, My phát hiện bữa cơm gia đình đã thiếu một người từ rất lâu.',
      'drama',
      'published'::public.content_status,
      'public'::public.visibility_status,
      false,
      interval '2 days'
    )
)
insert into public.stories (
  id,
  creator_id,
  title,
  slug,
  hook,
  short_description,
  long_description,
  cover_url,
  genre_id,
  status,
  visibility,
  is_completed,
  published_at
)
select
  seed.id,
  selected_creator.creator_id,
  seed.title,
  seed.slug,
  seed.hook,
  seed.short_description,
  seed.long_description,
  null,
  genres.id,
  seed.status,
  seed.visibility,
  seed.is_completed,
  now() - seed.published_offset
from story_seed seed
join public.genres genres on genres.slug = seed.genre_slug
cross join selected_creator
on conflict (slug) do update set
  creator_id = excluded.creator_id,
  title = excluded.title,
  hook = excluded.hook,
  short_description = excluded.short_description,
  long_description = excluded.long_description,
  genre_id = excluded.genre_id,
  status = excluded.status,
  visibility = excluded.visibility,
  is_completed = excluded.is_completed,
  published_at = excluded.published_at,
  updated_at = now();

with tag_seed (story_slug, tag_slug) as (
  values
    ('hop-dong-luc-0-gio', 'cuoi-truoc-yeu-sau'),
    ('hop-dong-luc-0-gio', 'tong-tai'),
    ('hop-dong-luc-0-gio', 'bi-mat'),
    ('tin-nhan-tu-phong-404', 'mat-tich'),
    ('tin-nhan-tu-phong-404', 'kinh-di'),
    ('tin-nhan-tu-phong-404', 'twist-cuoi'),
    ('ngay-toi-muon-tuoi-17', 'hoc-duong'),
    ('ngay-toi-muon-tuoi-17', 'trong-sinh'),
    ('ngay-toi-muon-tuoi-17', 'twist-cuoi'),
    ('group-chat-khong-co-toi', 'hoc-duong'),
    ('group-chat-khong-co-toi', 'bi-mat'),
    ('group-chat-khong-co-toi', 'tam-ly'),
    ('tiem-tra-sau-con-mua', 'gia-dinh'),
    ('tiem-tra-sau-con-mua', 'chua-lanh'),
    ('tiem-tra-sau-con-mua', 'bi-mat'),
    ('sep-tong-doc-nhat-ky-cua-toi', 'tong-tai'),
    ('sep-tong-doc-nhat-ky-cua-toi', 'tam-ly'),
    ('sep-tong-doc-nhat-ky-cua-toi', 'bi-mat'),
    ('ban-do-nhung-nguoi-mat-tich', 'mat-tich'),
    ('ban-do-nhung-nguoi-mat-tich', 'twist-cuoi'),
    ('ban-do-nhung-nguoi-mat-tich', 'bi-mat'),
    ('can-ho-tang-13-ruoi', 'kinh-di'),
    ('can-ho-tang-13-ruoi', 'bi-mat'),
    ('can-ho-tang-13-ruoi', 'twist-cuoi'),
    ('ba-phut-truoc-khi-chuong-reo', 'hoc-duong'),
    ('ba-phut-truoc-khi-chuong-reo', 'twist-cuoi'),
    ('ba-phut-truoc-khi-chuong-reo', 'tam-ly'),
    ('bua-com-co-ghe-trong', 'gia-dinh'),
    ('bua-com-co-ghe-trong', 'tam-ly'),
    ('bua-com-co-ghe-trong', 'bi-mat')
)
insert into public.story_tags (story_id, tag_id)
select stories.id, tags.id
from tag_seed
join public.stories stories on stories.slug = tag_seed.story_slug
join public.tags tags on tags.slug = tag_seed.tag_slug
on conflict (story_id, tag_id) do nothing;

with episode_seed (
  id,
  story_slug,
  episode_number,
  title,
  content,
  excerpt,
  word_count,
  status,
  published_offset
) as (
  values
    (
      '60000000-0000-0000-0000-000000000001'::uuid,
      'hop-dong-luc-0-gio',
      1,
      'Tin nhắn lúc nửa đêm',
      '23:59, Mai vừa khóa cửa tiệm bánh thì điện thoại rung lên. Tin nhắn từ Khánh hiện kèm một file PDF có tiêu đề Hợp đồng 90 ngày. Trang cuối có chữ ký của mẹ cô. Mai định xóa đi thì ngoài cửa vang đúng ba tiếng gõ rất khẽ.',
      'Mai nhận hợp đồng cưới từ người cô vừa chặn ba năm trước.',
      101,
      'published'::public.content_status,
      interval '20 days'
    ),
    (
      '60000000-0000-0000-0000-000000000002'::uuid,
      'hop-dong-luc-0-gio',
      2,
      'Điều kiện thứ bảy',
      'Khánh xuất hiện lúc sáng sớm, tay cầm chìa khóa kho hàng cũ của mẹ Mai. Anh nói nếu cô muốn biết vì sao mẹ biến mất, cô phải ký trước khi đồng hồ chỉ đúng một giờ. Trong kho, Mai tìm thấy một phong bì ghi tên mình, nhưng nét chữ là của chính cô.',
      'Khánh đưa ra chìa khóa và một điều kiện lạ.',
      108,
      'published'::public.content_status,
      interval '19 days'
    ),
    (
      '60000000-0000-0000-0000-000000000003'::uuid,
      'hop-dong-luc-0-gio',
      3,
      'Chữ ký của người đã mất',
      'Mai mở phong bì và thấy bản ghi chú về ngày mẹ cô rời đi. Dòng cuối viết rất rõ: đừng tin người đã cứu con hôm đó. Khi cô ngẩng lên, Khánh đang đứng ở cửa kho, mắt nhìn thẳng vào tờ giấy như thể anh đã chờ câu này từ lâu.',
      'Bức thư của mẹ làm hợp đồng đổi nghĩa.',
      114,
      'published'::public.content_status,
      interval '18 days'
    ),
    (
      '60000000-0000-0000-0000-000000000004'::uuid,
      'tin-nhan-tu-phong-404',
      1,
      'Cuộc gọi lúc 1 giờ sáng',
      '23:07, tổng đài khách sạn gọi phòng trực của Vy. Đầu dây bên kia xin khăn tắm cho phòng 404, trong khi khách sạn không có tầng bốn. Vy bật camera hành lang. Cửa cuối dãy đang mở hé, nhưng trên bảng phòng chỉ hiện số 403.',
      'Phòng 404 gọi tên Vy và biết cả ngày cô chưa từng sống qua.',
      103,
      'published'::public.content_status,
      interval '18 days'
    ),
    (
      '60000000-0000-0000-0000-000000000005'::uuid,
      'tin-nhan-tu-phong-404',
      2,
      'Tên trên sổ đặt phòng',
      'Sổ đặt phòng cũ in ra một cái tên Vy cho ngày mai. Lạ hơn, chữ ký nhận phòng ở cột kế bên giống hệt chữ ký của cô trong hồ sơ nhân viên. Vy xuống lễ tân, nhưng cô lễ tân ca đêm lại hỏi vì sao Vy đến trễ một ngày.',
      'Sổ đặt phòng ghi tên Vy cho một ngày chưa tới.',
      109,
      'published'::public.content_status,
      interval '17 days'
    ),
    (
      '60000000-0000-0000-0000-000000000006'::uuid,
      'tin-nhan-tu-phong-404',
      3,
      'Cánh cửa không nằm trên bản vẽ',
      'Vy theo tiếng chuông đến cuối hành lang và thấy thang máy dừng ở tầng không có thật. Cửa mở ra, bên trong là quầy lễ tân bị phủ bụi và một màn hình đang phát lại cảnh cô tự bước vào khách sạn ba năm trước. Trên màn hình, Vy quay đầu và nói: đừng mở phòng 404.',
      'Phòng 404 không thuộc về thế giới này.',
      117,
      'published'::public.content_status,
      interval '16 days'
    ),
    (
      '60000000-0000-0000-0000-000000000007'::uuid,
      'ngay-toi-muon-tuoi-17',
      1,
      'Chiếc đồng hồ ngược',
      'An tỉnh dậy trong lớp 12A3 với chiếc đồng hồ ngược trên cổ tay. Tin nhắn chưa gửi mười năm trước hiện sẵn trên màn hình: nếu em đọc được, đừng để Huy ngồi vào bàn cuối. Chuông ra chơi chưa kịp reo thì Huy đã bước vào lớp.',
      'An quay về lớp 12 và có đúng một ngày để sửa tin nhắn cũ.',
      102,
      'published'::public.content_status,
      interval '16 days'
    ),
    (
      '60000000-0000-0000-0000-000000000008'::uuid,
      'ngay-toi-muon-tuoi-17',
      2,
      'Tin nhắn chưa gửi',
      'An chặn Huy ngoài hành lang và hỏi vì sao tên cậu ấy lại gắn với tin nhắn cũ. Huy chỉ cười, nói rằng cô từng gửi cho cậu một lời nhắn trong tương lai. Tối đó, An mở album lớp và thấy ảnh tập thể thiếu mất chính mình.',
      'Mỗi lần đổi một chi tiết, một người lại biến mất khỏi ký ức.',
      110,
      'published'::public.content_status,
      interval '15 days'
    ),
    (
      '60000000-0000-0000-0000-000000000009'::uuid,
      'ngay-toi-muon-tuoi-17',
      3,
      'Người bị xóa khỏi ảnh',
      'Ngày cuối cùng của vòng lặp, An quyết định đổi chỗ ngồi. Cô viết lại tin nhắn bằng tay, rồi để nó trong ngăn bàn của Huy. Khi đồng hồ chạm 23:59:58, cả lớp cùng quay đầu. Người biến mất không phải Huy, mà là cô bạn bàn trước đã đứng cạnh An suốt từ đầu.',
      'Ảnh tập thể hé lộ người bị xóa chưa từng là Huy.',
      118,
      'published'::public.content_status,
      interval '14 days'
    ),
    (
      '60000000-0000-0000-0000-000000000010'::uuid,
      'group-chat-khong-co-toi',
      1,
      'Tên ghim đầu tiên',
      'Nhi chỉ muốn mượn điện thoại lớp trưởng để tra thời khóa biểu. Nhưng nhóm chat bí mật hiện ra với tên gọi không ai nhớ đã lập. Tin ghim đầu tiên ghi: tối nay xóa Nhi khỏi ảnh kỷ yếu trước khi cô ấy thấy được mình.',
      'Nhi vô tình thấy nhóm chat đang bàn cách đẩy cô ra khỏi mọi ảnh chụp.',
      104,
      'published'::public.content_status,
      interval '14 days'
    ),
    (
      '60000000-0000-0000-0000-000000000011'::uuid,
      'group-chat-khong-co-toi',
      2,
      'Ảnh tập thể bị che',
      'Nhi lướt lên và phát hiện mọi tin nhắn đều bắt đầu từ ngày cô nghỉ học một buổi vì sốt. Trong ảnh tập thể ở cuối thread, gương mặt cô bị dán giấy che đúng lúc có một tài khoản lạ nhắn: đừng trả điện thoại cho chủ nó.',
      'Thread cũ bắt đầu từ ngày Nhi nghỉ học vì sốt.',
      112,
      'published'::public.content_status,
      interval '13 days'
    ),
    (
      '60000000-0000-0000-0000-000000000012'::uuid,
      'group-chat-khong-co-toi',
      3,
      'Người ngồi cạnh cô',
      'Khi chuông tan học reo, nhóm chat tự đổi tên thành tên Nhi. Cô mở camera trước và thấy phía sau mình có thêm một bóng người đang cúi đọc màn hình. Tin nhắn mới bật lên: không phải cô bị xóa, mà là người ngồi cạnh cô từ đầu.',
      'Bóng người phía sau mới là bí mật thật.',
      120,
      'published'::public.content_status,
      interval '12 days'
    ),
    (
      '60000000-0000-0000-0000-000000000013'::uuid,
      'tiem-tra-sau-con-mua',
      1,
      'Món trà mẹ từng pha',
      'Hạ mở cửa tiệm trà sau cơn mưa đầu mùa. Khách đầu tiên gọi đúng món trà mẹ cô pha lúc buồn nhất và để lại một mẩu giấy ghi địa chỉ hẻm cũ. Trên giấy có nét gạch quen thuộc của cuốn sổ nợ năm xưa.',
      'Hạ mở lại tiệm trà và nhận một mẩu giấy lạ.',
      104,
      'published'::public.content_status,
      interval '12 days'
    ),
    (
      '60000000-0000-0000-0000-000000000014'::uuid,
      'tiem-tra-sau-con-mua',
      2,
      'Cuốn sổ nợ cũ',
      'Hạ lần theo địa chỉ tới căn nhà khóa kín cuối hẻm. Bên trong là một chiếc hộp thiếc đựng lá thư của mẹ và danh sách những người từng uống trà ở tiệm. Tên cuối cùng trong danh sách là của chính Hạ, nhưng ngày ghé lại là ngày mai.',
      'Lá thư của mẹ dẫn Hạ đến một căn nhà khóa kín.',
      110,
      'published'::public.content_status,
      interval '11 days'
    ),
    (
      '60000000-0000-0000-0000-000000000015'::uuid,
      'tiem-tra-sau-con-mua',
      3,
      'Nhà là nơi con tìm lại',
      'Người khách quen trở lại lúc tiệm sắp đóng cửa, đặt lên bàn một tách trà còn nóng. Ông nói mẹ Hạ đã nhờ ông giữ chìa khóa này cho đến khi cô đủ bình tĩnh để đọc lá thư cuối. Khi Hạ mở phong bì, cô chỉ thấy một câu: con không mất mẹ, con đang tìm lại nhà.',
      'Lá thư cuối nói mẹ chưa từng rời đi thật xa.',
      118,
      'published'::public.content_status,
      interval '10 days'
    ),
    (
      '60000000-0000-0000-0000-000000000016'::uuid,
      'sep-tong-doc-nhat-ky-cua-toi',
      1,
      'Slide số bảy',
      'Trong cuộc họp sáng, slide số bảy bất ngờ hiện một trang nhật ký cá nhân của Lan. Cả phòng im lặng khi đọc đến dòng cô viết về nụ cười của sếp tổng. Lan tưởng mình xong rồi, nhưng ông chỉ nhìn cô và bảo: em để quên trang này ở bàn họp hôm qua.',
      'Bản nhật ký của Lan bị chiếu giữa phòng họp.',
      107,
      'published'::public.content_status,
      interval '10 days'
    ),
    (
      '60000000-0000-0000-0000-000000000017'::uuid,
      'sep-tong-doc-nhat-ky-cua-toi',
      2,
      'Tờ giấy gấp tư',
      'Lan rà lại máy tính, không thấy file nào bị lộ. Nhưng trong ngăn bàn lại xuất hiện tờ giấy gấp tư, bên ngoài ghi tên em gái cô. Dòng chữ bên trong nhắc đúng bí mật mà chỉ hai chị em biết: đừng tin người nói dối bằng cà phê.',
      'Một tờ giấy nhắc đúng bí mật chỉ em gái Lan biết.',
      113,
      'published'::public.content_status,
      interval '9 days'
    ),
    (
      '60000000-0000-0000-0000-000000000018'::uuid,
      'sep-tong-doc-nhat-ky-cua-toi',
      3,
      'Cô ấy chưa về',
      'Đêm đó, Lan ở lại văn phòng và phát hiện máy in cứ nhả ra từng trang nhật ký mới. Trang cuối không có chữ của cô, mà là chữ của sếp tổng, kể lại lần ông nhìn thấy em gái Lan rời khỏi công ty trong một cơn mưa. Câu sau cùng chỉ có bốn chữ: cô ấy chưa về.',
      'Trang cuối có chữ của sếp tổng.',
      121,
      'published'::public.content_status,
      interval '8 days'
    ),
    (
      '60000000-0000-0000-0000-000000000019'::uuid,
      'ban-do-nhung-nguoi-mat-tich',
      1,
      'Chấm đỏ đầu tiên',
      'Phúc nhận một bản đồ giấy từ chiếc hộp cha để lại. Trên đó có một chấm đỏ đang nhấp nháy ở công viên ven sông, đúng lúc điện thoại của anh báo mất sóng. Đến nơi, chiếc ghế gỗ còn ấm nhưng xung quanh không có ai.',
      'Bản đồ tự đánh dấu nơi một người sắp biến mất.',
      106,
      'published'::public.content_status,
      interval '8 days'
    ),
    (
      '60000000-0000-0000-0000-000000000020'::uuid,
      'ban-do-nhung-nguoi-mat-tich',
      2,
      'Quy tắc của cha',
      'Trong cuốn sổ tay của cha, Phúc đọc thấy một quy tắc kỳ lạ: đừng cứu người đầu tiên trên bản đồ. Anh chưa kịp hiểu thì một người đàn ông lạ đứng sau lưng, hỏi vì sao Phúc giống hệt người từng đến đây ba năm trước.',
      'Cuốn sổ tay cảnh báo Phúc về một cái giá.',
      112,
      'published'::public.content_status,
      interval '7 days'
    ),
    (
      '60000000-0000-0000-0000-000000000021'::uuid,
      'ban-do-nhung-nguoi-mat-tich',
      3,
      'Người biết tên cha anh',
      'Phúc quay về nhà và thấy chấm đỏ mới xuất hiện ngay trước cửa căn hộ mình. Bên kia hành lang, người hàng xóm già cầm chiếc khăn trẻ em mất tích hôm qua và nói cha anh đã từng hỏi đúng câu này. Phúc mở sổ tay lần nữa và tìm thấy một trang bị xé dở, ghi tên mình.',
      'Trang bị xé dở ghi đúng tên Phúc.',
      119,
      'published'::public.content_status,
      interval '6 days'
    ),
    (
      '60000000-0000-0000-0000-000000000022'::uuid,
      'can-ho-tang-13-ruoi',
      1,
      'Nút 13 rưỡi',
      'Tú chuyển vào căn hộ rẻ bất thường ở tầng 13. Thang máy chỉ có nút 13 rưỡi khi trời bắt đầu mưa. Cửa mở ra một hành lang quen đến rợn người, mùi hoa nhài cũ bám trên tay nắm cửa như vừa có ai đi qua.',
      'Tòa nhà có thêm một tầng không tồn tại.',
      109,
      'published'::public.content_status,
      interval '6 days'
    ),
    (
      '60000000-0000-0000-0000-000000000023'::uuid,
      'can-ho-tang-13-ruoi',
      2,
      'Bức tường phòng tắm',
      'Buổi tối, Tú nghe tiếng gõ từ bức tường nhà tắm. Bên kia là một giọng nói hỏi cô có còn nhớ căn phòng từng ở khi còn nhỏ không. Trên gương, dòng hơi nước hiện ra một số nhà: 1308.',
      'Bức tường phòng tắm biết tên căn phòng cũ.',
      111,
      'published'::public.content_status,
      interval '5 days'
    ),
    (
      '60000000-0000-0000-0000-000000000024'::uuid,
      'can-ho-tang-13-ruoi',
      3,
      'Ảnh cưới của mẹ',
      'Cô lần theo tiếng động đến cuối hành lang và thấy một cánh cửa không có trong bản vẽ tòa nhà. Đằng sau là ảnh cưới cũ của mẹ, trong đó một người đàn ông đang đứng ngay sau lưng mẹ và chạm tay vào vai Tú khi cô còn bé. Tấm ảnh có ghi: đừng mở cửa này một lần nữa.',
      'Cánh cửa bí mật dẫn tới một bức ảnh cũ.',
      123,
      'published'::public.content_status,
      interval '4 days'
    ),
    (
      '60000000-0000-0000-0000-000000000025'::uuid,
      'ba-phut-truoc-khi-chuong-reo',
      1,
      'Ba phút đầu tiên',
      'Vy bị mắc kẹt trong đúng ba phút trước giờ chuông. Mỗi lần cô chạy ra cửa lớp là mọi thứ lại quay về đầu tiết. Cô thử viết lên bàn, thử bấm điện thoại, nhưng tất cả đều biến mất cùng lúc chuông chưa kịp reo.',
      'Vy bị mắc kẹt trong đúng ba phút trước giờ chuông.',
      103,
      'published'::public.content_status,
      interval '4 days'
    ),
    (
      '60000000-0000-0000-0000-000000000026'::uuid,
      'ba-phut-truoc-khi-chuong-reo',
      2,
      'Đừng quay lại',
      'Ở vòng lặp thứ mười, người ngồi sau lưng Vy thì thầm đừng quay lại. Cô làm ngơ, để ý thấy trên bảng danh sách có một cái tên bị gạch bằng bút đỏ. Khi Vy hỏi đó là ai, cả lớp đồng loạt nhìn sang chiếc ghế trống ở góc phòng.',
      'Có một cái tên bị gạch đỏ trong danh sách lớp.',
      110,
      'published'::public.content_status,
      interval '3 days'
    ),
    (
      '60000000-0000-0000-0000-000000000027'::uuid,
      'ba-phut-truoc-khi-chuong-reo',
      3,
      'Tên bị gạch đỏ',
      'Lần cuối cùng, Vy quay lại thật chậm và nói xin lỗi. Tiếng chuông im bặt. Trên bảng, cái tên bị gạch đỏ biến thành tên của chính cô, nhưng lớp học đã thừa ra một người từ lúc nào không ai nhớ.',
      'Lần lặp cuối đổi tên người bị xóa.',
      116,
      'published'::public.content_status,
      interval '2 days'
    ),
    (
      '60000000-0000-0000-0000-000000000028'::uuid,
      'bua-com-co-ghe-trong',
      1,
      'Chiếc ghế tự kéo ra',
      'Nhà My luôn dọn thêm một bộ bát đũa, dù chỉ có năm người ăn tối. Tối sinh nhật, chiếc ghế trống tự lùi ra khỏi bàn. Dưới mặt gỗ hiện lên một vết khắc rất mới: tên My và một ngày sinh không phải của cô.',
      'Chiếc ghế trống bắt đầu tự di chuyển.',
      107,
      'published'::public.content_status,
      interval '2 days'
    ),
    (
      '60000000-0000-0000-0000-000000000029'::uuid,
      'bua-com-co-ghe-trong',
      2,
      'Người trong ảnh bị cắt',
      'Mẹ My lật album cũ và chỉ cho cô xem một bức ảnh đã bị cắt mất một người. Bên cạnh là dòng ghi chú: đừng nhắc đến người ngồi ở ghế thứ sáu. Ngoài bếp, chiếc bát trống bỗng vang lên tiếng va chạm như có ai đang ngồi xuống.',
      'Album cũ thiếu mất một người.',
      113,
      'published'::public.content_status,
      interval '1 day'
    ),
    (
      '60000000-0000-0000-0000-000000000030'::uuid,
      'bua-com-co-ghe-trong',
      3,
      'Tên thật dưới ngăn kéo',
      'Đêm khuya, My mở ngăn kéo và tìm thấy lá thư cha viết trước khi mất. Ông bảo chiếc ghế không trống, nó chỉ đang chờ người về đúng tên thật. Khi My đọc xong, từ phòng khách vang lên tiếng gọi đầu tiên không phải tên cô.',
      'Lá thư của cha nhắc đến tên thật của người ngồi ghế trống.',
      119,
      'published'::public.content_status,
      interval '12 hours'
    )
)
insert into public.episodes (
  id,
  story_id,
  episode_number,
  title,
  content,
  excerpt,
  word_count,
  status,
  published_at
)
select
  seed.id,
  stories.id,
  seed.episode_number,
  seed.title,
  seed.content,
  seed.excerpt,
  seed.word_count,
  seed.status,
  now() - seed.published_offset
from episode_seed seed
join public.stories stories on stories.slug = seed.story_slug
on conflict (story_id, episode_number) do update set
  title = excluded.title,
  content = excluded.content,
  excerpt = excluded.excerpt,
  word_count = excluded.word_count,
  status = excluded.status,
  published_at = excluded.published_at,
  updated_at = now();

with creator_context as (
  select cp.id as creator_id, cp.user_id
  from public.creator_profiles cp
  join public.profiles p on p.id = cp.user_id
  order by cp.created_at, cp.id
  limit 1
),
comment_seed (id, story_slug, episode_number, content) as (
  values
    (
      '70000000-0000-0000-0000-000000000001'::uuid,
      'hop-dong-luc-0-gio',
      1,
      'Hook vào nhanh quá, đúng kiểu mở một chương là muốn bấm tiếp ngay.'
    ),
    (
      '70000000-0000-0000-0000-000000000002'::uuid,
      'tin-nhan-tu-phong-404',
      2,
      'Bầu không khí lạnh sống lưng nhưng vẫn đọc rất cuốn. Mình muốn biết phòng 404 là gì.'
    ),
    (
      '70000000-0000-0000-0000-000000000003'::uuid,
      'tiem-tra-sau-con-mua',
      null::integer,
      'Tiệm trà này ấm quá. Lá thư của mẹ làm mình muốn đọc tiếp ngay.'
    )
)
insert into public.comments (
  id,
  user_id,
  story_id,
  episode_id,
  parent_id,
  content,
  status
)
select
  seed.id,
  creator_context.user_id,
  stories.id,
  episodes.id,
  null,
  seed.content,
  'visible'::public.comment_status
from comment_seed seed
join public.stories stories on stories.slug = seed.story_slug
left join public.episodes episodes
  on episodes.story_id = stories.id
  and episodes.episode_number = seed.episode_number
cross join creator_context
on conflict (id) do update set
  story_id = excluded.story_id,
  episode_id = excluded.episode_id,
  content = excluded.content,
  status = excluded.status,
  updated_at = now();

with creator_context as (
  select cp.id as creator_id, cp.user_id
  from public.creator_profiles cp
  join public.profiles p on p.id = cp.user_id
  order by cp.created_at, cp.id
  limit 1
),
post_seed (id, type, title, content, story_slug) as (
  values
    (
      '71000000-0000-0000-0000-000000000001'::uuid,
      'discussion'::public.community_post_type,
      'Chap nào mở màn tốt nhất?',
      'Mình đang test feed và thấy Hợp Đồng Lúc 0 Giờ mở rất nhanh. Mọi người thích kiểu hook bằng tin nhắn hay bằng bí mật gia đình hơn?',
      'hop-dong-luc-0-gio'
    ),
    (
      '71000000-0000-0000-0000-000000000002'::uuid,
      'review'::public.community_post_type,
      'Review nhanh: Tin Nhắn Từ Phòng 404',
      'Không khí vừa đủ rùng mình, không nặng. Câu chuyện từ lễ tân sang căn phòng lạ đọc trên mobile rất ổn.',
      'tin-nhan-tu-phong-404'
    ),
    (
      '71000000-0000-0000-0000-000000000003'::uuid,
      'challenge'::public.community_post_type,
      'Challenge: twist cuối trong 300 chữ',
      'Tuần này thử viết một đoạn text ngắn có cú lật ở câu cuối. Không ảnh, không video, chỉ chữ.',
      null::text
    ),
    (
      '71000000-0000-0000-0000-000000000004'::uuid,
      'poll_placeholder'::public.community_post_type,
      'Tối nay đọc mood nào?',
      'Chữa lành, drama, kinh dị hay chat story. Chọn một mood và để feed dẫn bạn đi tiếp.',
      'tiem-tra-sau-con-mua'
    )
)
insert into public.community_posts (
  id,
  user_id,
  story_id,
  creator_id,
  type,
  title,
  content,
  status
)
select
  seed.id,
  creator_context.user_id,
  stories.id,
  creator_context.creator_id,
  seed.type,
  seed.title,
  seed.content,
  'approved'::public.community_post_status
from post_seed seed
left join public.stories stories on stories.slug = seed.story_slug
cross join creator_context
on conflict (id) do update set
  story_id = excluded.story_id,
  creator_id = excluded.creator_id,
  type = excluded.type,
  title = excluded.title,
  content = excluded.content,
  status = excluded.status,
  updated_at = now();

with creator_context as (
  select cp.id as creator_id, cp.user_id
  from public.creator_profiles cp
  join public.profiles p on p.id = cp.user_id
  order by cp.created_at, cp.id
  limit 1
),
event_seed (
  id,
  event_name,
  target_type,
  story_slug,
  episode_number,
  session_id,
  use_creator_user,
  metadata
) as (
  values
    (
      '90000000-0000-0000-0000-000000000001'::uuid,
      'open_story',
      'story',
      'hop-dong-luc-0-gio',
      null::integer,
      'seed-session-1',
      false,
      '{"source":"seed","surface":"home","action":"open_story"}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000002'::uuid,
      'start_reading',
      'episode',
      'tin-nhan-tu-phong-404',
      1,
      'seed-session-1',
      false,
      '{"source":"seed","surface":"story_detail","action":"start_reading"}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000003'::uuid,
      'complete_chap',
      'episode',
      'ngay-toi-muon-tuoi-17',
      3,
      'seed-session-2',
      true,
      '{"source":"seed","surface":"reader","action":"complete_chap"}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000004'::uuid,
      'next_chap_click',
      'episode',
      'group-chat-khong-co-toi',
      2,
      'seed-session-2',
      false,
      '{"source":"seed","surface":"reader","action":"next_chap_click"}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000005'::uuid,
      'feed_impression',
      'story',
      'tiem-tra-sau-con-mua',
      null::integer,
      'seed-session-3',
      false,
      '{"source":"seed","surface":"feed","action":"feed_impression","rank":1}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000006'::uuid,
      'feed_read_more',
      'story',
      'tiem-tra-sau-con-mua',
      null::integer,
      'seed-session-3',
      false,
      '{"source":"seed","surface":"feed","action":"feed_read_more","rank":1}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000007'::uuid,
      'save_story',
      'story',
      'sep-tong-doc-nhat-ky-cua-toi',
      null::integer,
      'seed-session-4',
      true,
      '{"source":"seed","surface":"story_detail","action":"save_story"}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000008'::uuid,
      'follow_creator',
      'story',
      'ban-do-nhung-nguoi-mat-tich',
      null::integer,
      'seed-session-4',
      true,
      '{"source":"seed","surface":"creator_card","action":"follow_creator"}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000009'::uuid,
      'comment_created',
      'story',
      'bua-com-co-ghe-trong',
      null::integer,
      'seed-session-5',
      true,
      '{"source":"seed","surface":"comments","action":"comment_created"}'::jsonb
    ),
    (
      '90000000-0000-0000-0000-000000000010'::uuid,
      'open_story',
      'story',
      'can-ho-tang-13-ruoi',
      null::integer,
      'seed-session-6',
      false,
      '{"source":"seed","surface":"discover","action":"open_story"}'::jsonb
    )
)
insert into public.analytics_events (
  id,
  user_id,
  session_id,
  event_name,
  target_type,
  target_id,
  metadata,
  created_at
)
select
  seed.id,
  case when seed.use_creator_user then creator_context.user_id else null end,
  seed.session_id,
  seed.event_name,
  seed.target_type,
  case
    when seed.target_type = 'story' then stories.id
    else episodes.id
  end,
  jsonb_strip_nulls(
    seed.metadata
    || jsonb_build_object(
      'story_slug', seed.story_slug,
      'story_id', stories.id,
      'episode_number', seed.episode_number,
      'episode_id', episodes.id
    )
  ),
  now() - case seed.id
    when '90000000-0000-0000-0000-000000000001'::uuid then interval '180 minutes'
    when '90000000-0000-0000-0000-000000000002'::uuid then interval '165 minutes'
    when '90000000-0000-0000-0000-000000000003'::uuid then interval '150 minutes'
    when '90000000-0000-0000-0000-000000000004'::uuid then interval '135 minutes'
    when '90000000-0000-0000-0000-000000000005'::uuid then interval '120 minutes'
    when '90000000-0000-0000-0000-000000000006'::uuid then interval '115 minutes'
    when '90000000-0000-0000-0000-000000000007'::uuid then interval '95 minutes'
    when '90000000-0000-0000-0000-000000000008'::uuid then interval '85 minutes'
    when '90000000-0000-0000-0000-000000000009'::uuid then interval '60 minutes'
    else interval '45 minutes'
  end
from event_seed seed
join public.stories stories on stories.slug = seed.story_slug
left join public.episodes episodes
  on episodes.story_id = stories.id
  and episodes.episode_number = seed.episode_number
cross join creator_context
on conflict (id) do update set
  user_id = excluded.user_id,
  session_id = excluded.session_id,
  event_name = excluded.event_name,
  target_type = excluded.target_type,
  target_id = excluded.target_id,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

commit;

NOTIFY pgrst, 'reload schema';
