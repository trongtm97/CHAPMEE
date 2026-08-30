create or replace function public.is_public_story(story_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stories
    where id = story_id
    and status in ('approved', 'published')
    and visibility = 'public'
  )
$$;

create or replace function public.is_public_episode(episode_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.episodes
    join public.stories on stories.id = episodes.story_id
    where episodes.id = episode_id
    and episodes.status in ('approved', 'published')
    and stories.status in ('approved', 'published')
    and stories.visibility = 'public'
  )
$$;

drop policy if exists "Creators can update own stories" on public.stories;
drop policy if exists "Moderators can update stories" on public.stories;
create policy "Creators can update own draft or pending stories"
on public.stories for update
using (
  status in ('draft', 'pending')
  and exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = stories.creator_id
    and creator_profiles.user_id = auth.uid()
  )
)
with check (
  status in ('draft', 'pending')
  and visibility in ('public', 'private')
  and exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = stories.creator_id
    and creator_profiles.user_id = auth.uid()
  )
);

create policy "Moderators can update stories"
on public.stories for update
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

drop policy if exists "Creators can manage tags on own stories" on public.story_tags;
create policy "Creators can manage tags on own draft or pending stories"
on public.story_tags for all
using (
  exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = story_tags.story_id
    and stories.status in ('draft', 'pending')
    and creator_profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = story_tags.story_id
    and stories.status in ('draft', 'pending')
    and creator_profiles.user_id = auth.uid()
  )
);

drop policy if exists "Creators can update own episodes" on public.episodes;
drop policy if exists "Moderators can update episodes" on public.episodes;
create policy "Creators can update own draft or pending episodes"
on public.episodes for update
using (
  status in ('draft', 'pending')
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = episodes.story_id
    and creator_profiles.user_id = auth.uid()
  )
)
with check (
  status in ('draft', 'pending')
  and exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = episodes.story_id
    and creator_profiles.user_id = auth.uid()
  )
);

create policy "Moderators can update episodes"
on public.episodes for update
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

drop policy if exists "Visible comments are readable" on public.comments;
create policy "Visible comments on public content are readable"
on public.comments for select
using (
  (
    status = 'visible'
    and public.is_public_story(story_id)
    and (
      episode_id is null
      or (
        public.is_public_episode(episode_id)
        and exists (
          select 1
          from public.episodes
          where episodes.id = comments.episode_id
          and episodes.story_id = comments.story_id
        )
      )
    )
  )
  or auth.uid() = user_id
  or public.current_profile_role() in ('admin', 'moderator')
);

drop policy if exists "Users can create own comments" on public.comments;
create policy "Users can create own comments on public content"
on public.comments for insert
with check (
  auth.uid() = user_id
  and status = 'visible'
  and public.is_public_story(story_id)
  and (
    episode_id is null
    or (
      public.is_public_episode(episode_id)
      and exists (
        select 1
        from public.episodes
        where episodes.id = comments.episode_id
        and episodes.story_id = comments.story_id
      )
    )
  )
);

drop policy if exists "Users can update own comments" on public.comments;
drop policy if exists "Moderators can update comments" on public.comments;
create policy "Users can delete own visible comments"
on public.comments for update
using (auth.uid() = user_id and status = 'visible')
with check (auth.uid() = user_id and status = 'deleted');

create policy "Moderators can update comments"
on public.comments for update
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));
