drop policy if exists "Published public stories are readable" on public.stories;
create policy "Public approved stories are readable"
on public.stories for select
using (
  (
    status in ('approved', 'published')
    and visibility = 'public'
  )
  or exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = stories.creator_id
    and creator_profiles.user_id = auth.uid()
  )
  or public.current_profile_role() in ('admin', 'moderator')
);

drop policy if exists "Published episodes are readable" on public.episodes;
create policy "Public approved episodes are readable"
on public.episodes for select
using (
  (
    status in ('approved', 'published')
    and exists (
      select 1 from public.stories
      where stories.id = episodes.story_id
      and stories.status in ('approved', 'published')
      and stories.visibility = 'public'
    )
  )
  or exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = episodes.story_id
    and creator_profiles.user_id = auth.uid()
  )
  or public.current_profile_role() in ('admin', 'moderator')
);
