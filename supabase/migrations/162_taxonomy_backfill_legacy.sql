-- Migration 162: Backfill story_taxonomy_terms from legacy genres/tags (idempotent)

-- main_genre from stories.genre_id
insert into public.story_taxonomy_terms (story_id, term_id, type)
select distinct s.id, t.id, 'main_genre'
from public.stories s
inner join public.genres g on g.id = s.genre_id
inner join public.taxonomy_terms t
  on t.type = 'main_genre'
  and t.is_active = true
  and (
    t.slug = g.slug
    or lower(trim(t.name)) = lower(trim(g.name))
  )
where s.genre_id is not null
on conflict (story_id, term_id) do nothing;

-- trope_tag from legacy story_tags (best-effort slug/name match)
insert into public.story_taxonomy_terms (story_id, term_id, type)
select distinct st.story_id, t.id, 'trope_tag'
from public.story_tags st
inner join public.tags tag on tag.id = st.tag_id
inner join public.taxonomy_terms t
  on t.type = 'trope_tag'
  and t.is_active = true
  and (
    t.slug = tag.slug
    or lower(trim(t.name)) = lower(trim(tag.name))
  )
on conflict (story_id, term_id) do nothing;

-- presentation_mode default for stories missing settings
insert into public.story_presentation_settings (story_id, mode)
select s.id, 'standard_prose'
from public.stories s
where not exists (
  select 1
  from public.story_presentation_settings p
  where p.story_id = s.id
)
on conflict (story_id) do nothing;

-- age_rating term from stories.age_rating column
insert into public.story_taxonomy_terms (story_id, term_id, type)
select distinct s.id, t.id, 'age_rating'
from public.stories s
inner join public.taxonomy_terms t
  on t.type = 'age_rating'
  and t.slug = s.age_rating
  and t.is_active = true
where s.age_rating is not null
on conflict (story_id, term_id) do nothing;

select public.refresh_taxonomy_usage_counts();
