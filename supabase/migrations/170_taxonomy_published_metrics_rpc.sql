-- Migration 170: RPC batch metrics for taxonomy SEO (published story counts + latest updated)

create or replace function public.get_taxonomy_published_story_counts(term_ids uuid[])
returns table(term_id uuid, story_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    stt.term_id,
    count(distinct stt.story_id)::bigint as story_count
  from public.story_taxonomy_terms stt
  inner join public.stories s on s.id = stt.story_id
  where stt.term_id = any(term_ids)
    and s.visibility = 'public'
    and s.status in ('published', 'approved')
  group by stt.term_id;
$$;

create or replace function public.get_taxonomy_latest_story_updated(term_ids uuid[])
returns table(term_id uuid, latest_updated timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select
    stt.term_id,
    max(s.updated_at) as latest_updated
  from public.story_taxonomy_terms stt
  inner join public.stories s on s.id = stt.story_id
  where stt.term_id = any(term_ids)
    and s.visibility = 'public'
    and s.status in ('published', 'approved')
  group by stt.term_id;
$$;

grant execute on function public.get_taxonomy_published_story_counts(uuid[]) to authenticated, anon, service_role;
grant execute on function public.get_taxonomy_latest_story_updated(uuid[]) to authenticated, anon, service_role;
