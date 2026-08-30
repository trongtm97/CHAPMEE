-- Hide duplicate content_type options (structure is chosen separately).
update public.taxonomy_terms
set
  is_selectable_by_creator = false,
  is_active = false,
  updated_at = now()
where type = 'content_type'
  and slug in ('truyen-mot-chuong', 'truyen-nhieu-chuong');

-- Add "Thể loại khác" subgenre per main_genre parent (idempotent).
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
  aliases,
  parent_id
)
select
  'subgenre',
  'the-loai-khac-' || parent.slug,
  'Thể loại khác',
  9999,
  true,
  true,
  true,
  false,
  false,
  '[]'::jsonb,
  parent.id
from public.taxonomy_terms parent
where parent.type = 'main_genre'
  and parent.is_active = true
  and not exists (
    select 1
    from public.taxonomy_terms existing
    where existing.type = 'subgenre'
      and existing.slug = 'the-loai-khac-' || parent.slug
  );
