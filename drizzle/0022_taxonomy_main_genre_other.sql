-- Fix taxonomy: main_genre «Thể loại khác», remove wrong subgenres, hide non-story content_type from Studio.

-- Undo mistaken subgenre «Thể loại khác» per main_genre (from 0021).
update public.taxonomy_terms
set
  is_selectable_by_creator = false,
  is_active = false,
  updated_at = now()
where type = 'subgenre'
  and slug like 'the-loai-khac-%';

-- Main genre catch-all at end of picker.
insert into public.taxonomy_terms (
  type,
  slug,
  name,
  sort_order,
  is_selectable_by_creator,
  is_public,
  is_active,
  is_featured,
  use_for_moderation,
  aliases
)
select
  'main_genre',
  'the-loai-khac',
  'Thể loại khác',
  9999,
  true,
  true,
  true,
  false,
  false,
  '[]'::jsonb
where not exists (
  select 1
  from public.taxonomy_terms
  where type = 'main_genre' and slug = 'the-loai-khac'
);

-- Editorial / platform content types — not for story create form.
update public.taxonomy_terms
set
  is_selectable_by_creator = false,
  updated_at = now()
where type = 'content_type'
  and slug in (
    'reels-truyen',
    'bai-viet',
    'thong-bao',
    'huong-dan-viet-truyen',
    'review-cam-nhan-truyen'
  );
