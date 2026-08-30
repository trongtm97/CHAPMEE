create table public.user_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  milestone_key text not null,
  milestone_type text not null,
  title text not null,
  description text not null,
  related_story_id uuid references public.stories(id) on delete cascade,
  related_author_id uuid references public.creator_profiles(id) on delete cascade,
  related_comment_id uuid references public.comments(id) on delete cascade,
  value numeric,
  metadata jsonb not null default '{}'::jsonb,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_milestones_type_check check (
    milestone_type in ('reader', 'author', 'story', 'comment', 'general')
  ),
  constraint user_milestones_relation_check check (
    num_nonnulls(related_story_id, related_author_id, related_comment_id) <= 1
  )
);

create unique index user_milestones_global_unique_idx
on public.user_milestones(user_id, milestone_key)
where related_story_id is null
  and related_author_id is null
  and related_comment_id is null;

create unique index user_milestones_story_unique_idx
on public.user_milestones(user_id, milestone_key, related_story_id)
where related_story_id is not null;

create unique index user_milestones_author_unique_idx
on public.user_milestones(user_id, milestone_key, related_author_id)
where related_author_id is not null;

create unique index user_milestones_comment_unique_idx
on public.user_milestones(user_id, milestone_key, related_comment_id)
where related_comment_id is not null;

create index user_milestones_user_id_idx on public.user_milestones(user_id);
create index user_milestones_key_idx on public.user_milestones(milestone_key);
create index user_milestones_type_idx on public.user_milestones(milestone_type);
create index user_milestones_achieved_at_idx on public.user_milestones(achieved_at);

alter table public.user_milestones enable row level security;

create policy "Users can read own milestones"
on public.user_milestones for select
using (auth.uid() = user_id);

create policy "Active creator milestones are readable"
on public.user_milestones for select
using (
  auth.uid() = user_id
  or (
    milestone_type in ('author', 'general')
    and exists (
      select 1
      from public.creator_profiles
      where creator_profiles.user_id = user_milestones.user_id
        and creator_profiles.status = 'active'
    )
  )
  or (
    milestone_type = 'story'
    and related_story_id is not null
    and exists (
      select 1
      from public.stories
      join public.creator_profiles on creator_profiles.id = stories.creator_id
      where stories.id = user_milestones.related_story_id
        and stories.visibility = 'public'
        and stories.status in ('approved', 'published')
        and creator_profiles.status = 'active'
    )
  )
);

create policy "Users can create own milestones"
on public.user_milestones for insert
with check (auth.uid() = user_id);
