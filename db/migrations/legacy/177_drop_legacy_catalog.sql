-- Drop legacy genre/tag catalog after taxonomy backfill (162) and app migration.
-- Canonical catalog: taxonomy_terms + story_taxonomy_terms.

drop index if exists public.ranking_snapshots_genre_idx;
alter table if exists public.ranking_snapshots
  drop column if exists genre_id;

drop index if exists public.stories_genre_id_idx;
alter table if exists public.stories
  drop column if exists genre_id;

drop policy if exists "Story tags on readable stories are readable" on public.story_tags;
drop policy if exists "Creators can manage tags on own stories" on public.story_tags;
drop table if exists public.story_tags;

drop policy if exists "Tags are readable" on public.tags;
drop policy if exists "Moderators can manage tags" on public.tags;
drop table if exists public.tags;

drop policy if exists "Genres are readable" on public.genres;
drop policy if exists "Moderators can manage genres" on public.genres;
drop table if exists public.genres;
