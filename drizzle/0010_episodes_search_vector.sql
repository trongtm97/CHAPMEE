-- Full-text search on episode metadata (no S3 body reads).

alter table public.episodes
  add column if not exists search_vector tsvector;

create or replace function public.episodes_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.plain_text_preview, '')), 'C');
  return new;
end;
$$;

drop trigger if exists episodes_search_vector_trigger on public.episodes;
create trigger episodes_search_vector_trigger
before insert or update of title, excerpt, plain_text_preview
on public.episodes
for each row
execute function public.episodes_search_vector_update();

update public.episodes
set title = title
where search_vector is null;

create index if not exists idx_episodes_search_vector
  on public.episodes using gin (search_vector);

create or replace function public.search_public_episode_ids(
  search_query text,
  result_limit integer default 40
)
returns table(episode_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.episodes e
  inner join public.stories s on s.id = e.story_id
  where s.visibility = 'public'
    and s.status in ('published', 'approved')
    and e.status in ('published', 'approved')
    and length(trim(search_query)) >= 2
    and e.search_vector @@ plainto_tsquery('simple', trim(search_query))
  order by ts_rank(e.search_vector, plainto_tsquery('simple', trim(search_query))) desc
  limit greatest(result_limit, 1);
$$;

grant execute on function public.search_public_episode_ids(text, integer) to anon;
grant execute on function public.search_public_episode_ids(text, integer) to authenticated;
grant execute on function public.search_public_episode_ids(text, integer) to service_role;
