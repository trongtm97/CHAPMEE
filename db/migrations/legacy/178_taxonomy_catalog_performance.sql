-- Migration 178: Taxonomy + story catalog performance indexes and filter RPC

-- ---------------------------------------------------------------------------
-- taxonomy_terms indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_taxonomy_terms_type
  on public.taxonomy_terms(type);

create index if not exists idx_taxonomy_terms_active_public
  on public.taxonomy_terms(is_active, is_public);

create index if not exists idx_taxonomy_terms_type_active_public
  on public.taxonomy_terms(type, is_active, is_public);

create index if not exists idx_taxonomy_terms_type_featured_sort
  on public.taxonomy_terms(type, is_featured, sort_order)
  where is_featured = true;

create index if not exists idx_taxonomy_terms_use_for_seo
  on public.taxonomy_terms(use_for_seo)
  where use_for_seo = true;

create index if not exists idx_taxonomy_terms_use_for_discover
  on public.taxonomy_terms(use_for_discover)
  where use_for_discover = true;

create index if not exists idx_taxonomy_terms_use_for_ranking
  on public.taxonomy_terms(use_for_ranking)
  where use_for_ranking = true;

-- ---------------------------------------------------------------------------
-- story_taxonomy_terms indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_story_taxonomy_terms_type_term_id
  on public.story_taxonomy_terms(type, term_id);

create index if not exists idx_story_taxonomy_terms_term_id_story_id
  on public.story_taxonomy_terms(term_id, story_id);

-- ---------------------------------------------------------------------------
-- stories catalog indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_stories_published_at
  on public.stories(published_at desc nulls last);

create index if not exists idx_stories_public_catalog
  on public.stories(visibility, status, published_at desc nulls last)
  where visibility = 'public' and status in ('published', 'approved');

create index if not exists idx_stories_updated_at
  on public.stories(updated_at desc);

create index if not exists idx_stories_creator_updated
  on public.stories(creator_id, updated_at desc);

create index if not exists idx_stories_is_completed
  on public.stories(is_completed);

-- ---------------------------------------------------------------------------
-- Delta usage_count (avoid full refresh on every story save)
-- ---------------------------------------------------------------------------
create or replace function public.apply_taxonomy_usage_count_delta(
  removed_term_ids uuid[],
  added_term_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  term_id uuid;
begin
  if removed_term_ids is not null then
    foreach term_id in array removed_term_ids loop
      update public.taxonomy_terms
      set usage_count = greatest(usage_count - 1, 0)
      where id = term_id;
    end loop;
  end if;

  if added_term_ids is not null then
    foreach term_id in array added_term_ids loop
      update public.taxonomy_terms
      set usage_count = usage_count + 1
      where id = term_id;
    end loop;
  end if;
end;
$$;

grant execute on function public.apply_taxonomy_usage_count_delta(uuid[], uuid[]) to authenticated;
grant execute on function public.apply_taxonomy_usage_count_delta(uuid[], uuid[]) to service_role;

-- ---------------------------------------------------------------------------
-- Multi-taxonomy filter: ANY within group, AND between groups
-- filter_groups jsonb: [{"type":"main_genre","slugs":["ngon-tinh"]},{"type":"setting_tag","slugs":["cong-so","hoc-duong"]}]
-- ---------------------------------------------------------------------------
create or replace function public.filter_public_story_ids_by_taxonomy_groups(
  filter_groups jsonb,
  result_limit integer default 5000
)
returns table(story_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  grp jsonb;
  grp_type text;
  grp_slugs text[];
  term_ids uuid[];
  grp_story_ids uuid[];
  acc uuid[];
  slug text;
begin
  if filter_groups is null or jsonb_array_length(filter_groups) = 0 then
    return;
  end if;

  acc := null;

  for grp in select * from jsonb_array_elements(filter_groups) loop
    grp_type := grp->>'type';
    grp_slugs := coalesce(
      array(select jsonb_array_elements_text(grp->'slugs')),
      array[]::text[]
    );

    if grp_type is null or array_length(grp_slugs, 1) is null then
      return;
    end if;

    select array_agg(t.id)
    into term_ids
    from public.taxonomy_terms t
    where t.type = grp_type
      and t.slug = any(grp_slugs)
      and t.is_active = true
      and t.is_public = true;

    if term_ids is null or array_length(term_ids, 1) is null then
      return;
    end if;

    select array_agg(distinct st.story_id)
    into grp_story_ids
    from public.story_taxonomy_terms st
    inner join public.stories s on s.id = st.story_id
    where st.term_id = any(term_ids)
      and st.type = grp_type
      and s.visibility = 'public'
      and s.status in ('published', 'approved')
      and s.quality_status <> 'permanently_hidden_low_quality';

    if grp_story_ids is null or array_length(grp_story_ids, 1) is null then
      return;
    end if;

    if acc is null then
      acc := grp_story_ids;
    else
      select array_agg(x)
      into acc
      from unnest(acc) x
      where x = any(grp_story_ids);
    end if;

    if acc is null or array_length(acc, 1) is null then
      return;
    end if;
  end loop;

  if acc is null then
    return;
  end if;

  return query
  select s.id
  from public.stories s
  where s.id = any(acc)
  order by s.published_at desc nulls last
  limit greatest(result_limit, 1);
end;
$$;

grant execute on function public.filter_public_story_ids_by_taxonomy_groups(jsonb, integer) to anon;
grant execute on function public.filter_public_story_ids_by_taxonomy_groups(jsonb, integer) to authenticated;
grant execute on function public.filter_public_story_ids_by_taxonomy_groups(jsonb, integer) to service_role;
