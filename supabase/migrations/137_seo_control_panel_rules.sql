-- Migration 137: SEO control panel — bổ sung default rules

insert into public.seo_rules (route_pattern, page_type, indexable, follow_links, notes)
values
  ('/studio/*', 'studio', false, false, 'Studio workspace — noindex'),
  ('/admin/*', 'admin', false, false, 'Admin dashboard — noindex'),
  ('/discover', 'discover', true, true, 'Discover feed'),
  ('/reels', 'reels', true, true, 'Reels feed'),
  ('/truyen', 'story_catalog', true, true, 'Story catalog index'),
  ('/truyen/*', 'story', true, true, 'Story detail — maps /truyen/[slug]'),
  ('/truyen/*/chuong/*', 'chapter', true, true, 'Chapter reader — maps /truyen/[slug]/chuong/[chapter]'),
  ('/author/*', 'author', true, true, 'Author profile — maps /author/[username]'),
  ('/tac-gia/*', 'author', true, true, 'Author profile (VI route)'),
  ('/bai-viet', 'content_post_catalog', true, true, 'Content posts index'),
  ('/bai-viet/*', 'content_post', true, true, 'Content post — maps /bai-viet/[slug]'),
  ('/thong-bao', 'announcement_catalog', true, true, 'Announcements index'),
  ('/thong-bao/*', 'announcement', false, false, 'Announcement detail — index when content indexable=true')
on conflict (route_pattern) do nothing;
