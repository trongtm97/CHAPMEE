-- Migration 179: Full-text search vector for public story catalog

alter table public.stories
  add column if not exists search_vector tsvector;

create or replace function public.stories_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.hook, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.short_description, '')), 'C');
  return new;
end;
$$;

drop trigger if exists stories_search_vector_trigger on public.stories;
create trigger stories_search_vector_trigger
before insert or update of title, hook, short_description
on public.stories
for each row
execute function public.stories_search_vector_update();

update public.stories
set title = title
where search_vector is null;

create index if not exists idx_stories_search_vector
  on public.stories using gin (search_vector);

create or replace function public.search_public_story_ids(
  search_query text,
  result_limit integer default 60
)
returns table(story_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.stories s
  where s.visibility = 'public'
    and s.status in ('published', 'approved')
    and s.quality_status <> 'permanently_hidden_low_quality'
    and length(trim(search_query)) >= 2
    and s.search_vector @@ plainto_tsquery('simple', trim(search_query))
  order by ts_rank(s.search_vector, plainto_tsquery('simple', trim(search_query))) desc
  limit greatest(result_limit, 1);
$$;

grant execute on function public.search_public_story_ids(text, integer) to anon;
grant execute on function public.search_public_story_ids(text, integer) to authenticated;
grant execute on function public.search_public_story_ids(text, integer) to service_role;
