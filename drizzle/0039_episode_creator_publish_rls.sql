-- Allow creator self-publish: insert/update episodes with status published.
-- Previous policies only allowed draft|pending, blocking createEpisodeAction(intent=review).

drop policy if exists "Creators can create own episodes" on public.episodes;
create policy "Creators can create own episodes"
  on public.episodes for insert
  with check (
    status in ('draft', 'pending', 'published')
    and not public.is_user_write_blocked(auth.uid())
    and exists (
      select 1
      from public.stories
      join public.creator_profiles on creator_profiles.id = stories.creator_id
      where stories.id = episodes.story_id
        and creator_profiles.user_id = auth.uid()
    )
  );

drop policy if exists "Creators can update own draft or pending episodes" on public.episodes;
create policy "Creators can update own episodes"
  on public.episodes for update
  using (
    not public.is_user_write_blocked(auth.uid())
    and exists (
      select 1
      from public.stories
      join public.creator_profiles on creator_profiles.id = stories.creator_id
      where stories.id = episodes.story_id
        and creator_profiles.user_id = auth.uid()
    )
  )
  with check (
    status in ('draft', 'pending', 'published')
    and not public.is_user_write_blocked(auth.uid())
    and exists (
      select 1
      from public.stories
      join public.creator_profiles on creator_profiles.id = stories.creator_id
      where stories.id = episodes.story_id
        and creator_profiles.user_id = auth.uid()
    )
  );
