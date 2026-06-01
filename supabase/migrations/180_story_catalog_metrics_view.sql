-- Migration 180: Denormalized public story catalog metrics (materialized view)

create materialized view if not exists public.story_catalog_metrics as
select
  s.id as story_id,
  coalesce(ep.episode_count, 0)::integer as episode_count,
  coalesce(bs.save_count, 0)::integer as save_count,
  coalesce(sc.quality_score, 0)::numeric as quality_score,
  coalesce(sc.discovery_score, 0)::numeric as discovery_score,
  coalesce(sms.full_access_enabled, false) as full_access_enabled,
  sms.full_access_price_coin,
  cp.min_chapter_price_coin,
  s.published_at
from public.stories s
left join (
  select e.story_id, count(*)::bigint as episode_count
  from public.episodes e
  where e.status in ('approved', 'published')
  group by e.story_id
) ep on ep.story_id = s.id
left join (
  select bi.story_id, count(*)::bigint as save_count
  from public.bookshelf_items bi
  group by bi.story_id
) bs on bs.story_id = s.id
left join lateral (
  select css.quality_score, css.discovery_score
  from public.content_score_snapshots css
  where css.item_type = 'story'
    and css.item_id = s.id
    and css.metrics_window = '7d'
  order by css.snapshot_at desc
  limit 1
) sc on true
left join public.story_monetization_settings sms on sms.story_id = s.id
left join (
  select
    ep2.story_id,
    min(cms.coin_price)::integer as min_chapter_price_coin
  from public.chapter_monetization_settings cms
  inner join public.episodes ep2 on ep2.id = cms.chapter_id
  where cms.is_paid = true
    and cms.coin_price is not null
    and cms.coin_price > 0
  group by ep2.story_id
) cp on cp.story_id = s.id
where s.visibility = 'public'
  and s.status in ('published', 'approved')
  and s.quality_status <> 'permanently_hidden_low_quality';

create unique index if not exists idx_story_catalog_metrics_story_id
  on public.story_catalog_metrics(story_id);

create index if not exists idx_story_catalog_metrics_save_count
  on public.story_catalog_metrics(save_count desc, story_id);

create index if not exists idx_story_catalog_metrics_episode_count
  on public.story_catalog_metrics(episode_count desc, story_id);

create index if not exists idx_story_catalog_metrics_full_access_price
  on public.story_catalog_metrics(full_access_price_coin nulls last, story_id);

create index if not exists idx_story_catalog_metrics_min_chapter_price
  on public.story_catalog_metrics(min_chapter_price_coin nulls last, story_id);

create index if not exists idx_story_catalog_metrics_discovery_score
  on public.story_catalog_metrics(discovery_score desc, story_id);

create or replace function public.refresh_story_catalog_metrics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.story_catalog_metrics;
end;
$$;

grant execute on function public.refresh_story_catalog_metrics() to service_role;

create or replace function public.get_catalog_story_ids_by_metric(
  p_metric text,
  p_story_ids uuid[] default null,
  p_direction text default 'desc',
  p_limit integer default 40,
  p_offset integer default 0
)
returns table(story_id uuid, total_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  select count(*)
  into v_total
  from public.story_catalog_metrics m
  where p_story_ids is null
     or cardinality(p_story_ids) = 0
     or m.story_id = any(p_story_ids);

  return query
  select ranked.story_id, v_total as total_count
  from (
    select m.story_id
    from public.story_catalog_metrics m
    where p_story_ids is null
       or cardinality(p_story_ids) = 0
       or m.story_id = any(p_story_ids)
    order by
      case when p_metric = 'saved' and lower(p_direction) = 'desc'
        then m.save_count end desc nulls last,
      case when p_metric = 'saved' and lower(p_direction) = 'asc'
        then m.save_count end asc nulls last,
      case when p_metric = 'chapters' and lower(p_direction) = 'desc'
        then m.episode_count end desc nulls last,
      case when p_metric = 'chapters' and lower(p_direction) = 'asc'
        then m.episode_count end asc nulls last,
      case when p_metric = 'price_asc'
        then m.full_access_price_coin end asc nulls last,
      case when p_metric = 'price_desc'
        then m.full_access_price_coin end desc nulls last,
      case when p_metric = 'chapter_price_asc'
        then m.min_chapter_price_coin end asc nulls last,
      case when p_metric = 'chapter_price_desc'
        then m.min_chapter_price_coin end desc nulls last,
      case when p_metric = 'hot'
        then m.discovery_score end desc nulls last,
      m.published_at desc nulls last,
      m.story_id
    limit greatest(p_limit, 1)
    offset greatest(p_offset, 0)
  ) ranked;
end;
$$;

grant execute on function public.get_catalog_story_ids_by_metric(text, uuid[], text, integer, integer)
  to anon, authenticated, service_role;

refresh materialized view public.story_catalog_metrics;
