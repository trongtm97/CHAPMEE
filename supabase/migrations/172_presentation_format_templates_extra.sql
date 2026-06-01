-- Additional story_format_templates with example_json for social_feed, script, mixed_media

insert into public.story_format_templates (
  mode,
  name,
  description,
  is_default,
  sort_order,
  is_active,
  example_json
)
select
  v.mode,
  v.name,
  v.description,
  v.is_default,
  v.sort_order,
  true,
  v.example_json::jsonb
from (
  values
  (
    'social_feed',
    'Feed mạng xã hội mẫu',
    'Hai bài đăng giả lập với tương tác.',
    true,
    1,
    '{"platform":"ChapSocial","posts":[{"author":"Lan Nguyễn","handle":"@lan.nguyen","time":"2 giờ","text":"Ai còn thức không?","likes":24,"comments_count":5},{"author":"Minh Trần","handle":"@minh","time":"1 giờ","text":"Mình vừa thấy điều gì đó lạ.","likes":8,"comments_count":2}]}'
  ),
  (
    'script',
    'Kịch bản mẫu',
    'Cảnh, hành động và thoại.',
    true,
    1,
    '{"lines":[{"type":"scene","text":"INT. PHÒNG TRỌ - ĐÊM"},{"type":"action","text":"Lan ngồi trước điện thoại."},{"type":"dialogue","speaker":"LAN","parenthetical":"(thì thầm)","text":"Cậu còn thức không?"},{"type":"dialogue","speaker":"MINH","text":"Có."}]}'
  ),
  (
    'mixed_media',
    'Hỗn hợp mẫu',
    'Văn xuôi, thông báo, trích dẫn.',
    true,
    1,
    '{"blocks":[{"type":"prose","content":"Tôi mở điện thoại."},{"type":"notice","title":"Ghi chú","content":"Nội dung hư cấu."},{"type":"quote","content":"Đừng tin màn hình.","attribution":"— Ẩn danh"},{"type":"divider"},{"type":"prose","content":"Tôi gõ rồi xóa."}]}'
  )
) as v(mode, name, description, is_default, sort_order, example_json)
on conflict (mode, name) do update set
  description = excluded.description,
  example_json = excluded.example_json,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
