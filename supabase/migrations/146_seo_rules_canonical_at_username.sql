-- Canonical public profiles: /@username (legacy /tac-gia, /author noindex)

update public.seo_rules
set
  indexable = false,
  follow_links = false,
  notes = coalesce(notes, '') || ' [legacy redirect — noindex]'
where route_pattern in ('/tac-gia/*', '/author/*', '/creators/*');

insert into public.seo_rules (route_pattern, page_type, indexable, follow_links, notes)
values ('/@*', 'author', true, true, 'Public profile — /@username')
on conflict (route_pattern) do update
set
  page_type = excluded.page_type,
  indexable = excluded.indexable,
  follow_links = excluded.follow_links,
  notes = excluded.notes;
