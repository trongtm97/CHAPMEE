-- Reels rename: update user-facing labels in seed/template data (no schema change).
-- Internal keys (template_type = 'swipe', placement ids) stay for backward compatibility.

update public.creator_templates
set
  title = 'Reels — hook & CTA ngắn',
  content = jsonb_set(
    content,
    '{body}',
    to_jsonb(
      replace(
        content ->> 'body',
        'Vuốt / đọc tiếp / theo dõi tác giả.',
        'Xem Reels / đọc tiếp / theo dõi tác giả.'
      )
    )
  )
where template_type = 'swipe'
  and title ilike 'Swipe%';
