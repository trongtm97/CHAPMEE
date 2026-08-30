-- RPC: public main_genre facets with story counts (taxonomy-first)

create or replace function public.get_public_main_genres_with_story_counts()
returns table (
  slug text,
  name text,
  story_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.slug,
    t.name,
    count(distinct st.story_id)::bigint as story_count
  from public.taxonomy_terms t
  left join public.story_taxonomy_terms st
    on st.term_id = t.id
    and st.type = 'main_genre'
  left join public.stories s
    on s.id = st.story_id
    and s.visibility = 'public'
    and s.status in ('published', 'approved')
    and coalesce(s.quality_status, '') <> 'permanently_hidden_low_quality'
  where t.type = 'main_genre'
    and t.is_active = true
    and t.is_public = true
  group by t.id, t.slug, t.name, t.sort_order
  order by t.sort_order asc, t.name asc;
$$;

grant execute on function public.get_public_main_genres_with_story_counts() to anon;
grant execute on function public.get_public_main_genres_with_story_counts() to authenticated;
