-- ChapMee rebrand: cập nhật nội dung hiển thị trong DB (không đổi tên bảng/cột).

update public.badges
set description = replace(description, 'ChapChap', 'ChapMee')
where description like '%ChapChap%';

update public.app_settings
set value = jsonb_set(
  value,
  '{contact_description}',
  to_jsonb(
    replace(
      coalesce(value->>'contact_description', ''),
      'ChapChap',
      'ChapMee'
    )
  ),
  true
)
where key = 'contact_feedback'
  and coalesce(value->>'contact_description', '') like '%ChapChap%';
