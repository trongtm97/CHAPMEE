create extension if not exists pgcrypto;

create type public.profile_role as enum ('user', 'admin', 'moderator');
create type public.creator_status as enum ('active', 'suspended');
create type public.content_status as enum (
  'draft',
  'pending',
  'approved',
  'rejected',
  'published',
  'archived'
);
create type public.visibility_status as enum ('public', 'private');
create type public.bookshelf_status as enum ('saved', 'reading', 'completed');
create type public.reaction_target_type as enum (
  'story',
  'episode',
  'comment',
  'community_post'
);
create type public.reaction_type as enum ('like');
create type public.comment_status as enum (
  'visible',
  'hidden',
  'deleted',
  'pending'
);
create type public.community_post_type as enum (
  'discussion',
  'review',
  'poll_placeholder',
  'challenge'
);
create type public.community_post_status as enum (
  'pending',
  'approved',
  'rejected',
  'hidden'
);
create type public.report_status as enum (
  'open',
  'reviewing',
  'resolved',
  'rejected'
);
create type public.moderation_case_status as enum (
  'open',
  'resolved',
  'rejected'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  role public.profile_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (
    username is null
    or char_length(username) between 3 and 30
  )
);

create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pen_name text not null,
  bio text,
  status public.creator_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_profiles_pen_name_length check (char_length(pen_name) between 1 and 80)
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  title text not null,
  slug text not null unique,
  hook text,
  short_description text,
  long_description text,
  cover_url text,
  genre_id uuid references public.genres(id) on delete set null,
  status public.content_status not null default 'draft',
  visibility public.visibility_status not null default 'private',
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint stories_title_length check (char_length(title) between 1 and 160)
);

create table public.story_tags (
  story_id uuid not null references public.stories(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (story_id, tag_id)
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  episode_number integer not null,
  title text not null,
  content text not null,
  excerpt text,
  status public.content_status not null default 'draft',
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint episodes_episode_number_positive check (episode_number > 0),
  constraint episodes_word_count_non_negative check (word_count >= 0),
  constraint episodes_title_length check (char_length(title) between 1 and 160),
  unique (story_id, episode_number)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid references public.creator_profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_one_target check (num_nonnulls(creator_id, story_id) = 1)
);

create table public.bookshelf_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  status public.bookshelf_status not null default 'saved',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, story_id)
);

create table public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  progress_percent integer not null default 0,
  last_position integer,
  updated_at timestamptz not null default now(),
  constraint reading_progress_percent_range check (progress_percent between 0 and 100),
  constraint reading_progress_last_position_non_negative check (
    last_position is null
    or last_position >= 0
  ),
  unique (user_id, story_id)
);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.reaction_target_type not null,
  target_id uuid not null,
  reaction_type public.reaction_type not null default 'like',
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, reaction_type)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  status public.comment_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_content_length check (char_length(content) between 1 and 2000),
  constraint comments_target_required check (num_nonnulls(story_id, episode_id) >= 1)
);

create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  creator_id uuid references public.creator_profiles(id) on delete set null,
  type public.community_post_type not null default 'discussion',
  title text not null,
  content text not null,
  status public.community_post_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_posts_title_length check (char_length(title) between 1 and 160),
  constraint community_posts_content_length check (char_length(content) between 1 and 5000)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_reason_length check (char_length(reason) between 1 and 160)
);

create table public.moderation_cases (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  moderator_id uuid references public.profiles(id) on delete set null,
  status public.moderation_case_status not null default 'open',
  action_taken text,
  internal_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  event_name text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_event_name_length check (char_length(event_name) between 1 and 120)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger creator_profiles_set_updated_at
before update on public.creator_profiles
for each row execute function public.set_updated_at();

create trigger stories_set_updated_at
before update on public.stories
for each row execute function public.set_updated_at();

create trigger episodes_set_updated_at
before update on public.episodes
for each row execute function public.set_updated_at();

create trigger bookshelf_items_set_updated_at
before update on public.bookshelf_items
for each row execute function public.set_updated_at();

create trigger reading_progress_set_updated_at
before update on public.reading_progress
for each row execute function public.set_updated_at();

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create trigger community_posts_set_updated_at
before update on public.community_posts
for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

create trigger moderation_cases_set_updated_at
before update on public.moderation_cases
for each row execute function public.set_updated_at();

create index creator_profiles_user_id_idx on public.creator_profiles(user_id);
create index genres_slug_idx on public.genres(slug);
create index tags_slug_idx on public.tags(slug);
create index stories_creator_id_idx on public.stories(creator_id);
create index stories_genre_id_idx on public.stories(genre_id);
create index stories_status_visibility_idx on public.stories(status, visibility);
create index episodes_story_id_idx on public.episodes(story_id);
create index episodes_status_idx on public.episodes(status);
create unique index follows_unique_creator_idx
on public.follows(follower_id, creator_id)
where creator_id is not null;
create unique index follows_unique_story_idx
on public.follows(follower_id, story_id)
where story_id is not null;
create index follows_follower_id_idx on public.follows(follower_id);
create index bookshelf_items_user_id_idx on public.bookshelf_items(user_id);
create index bookshelf_items_story_id_idx on public.bookshelf_items(story_id);
create index reading_progress_user_id_idx on public.reading_progress(user_id);
create index reactions_target_idx on public.reactions(target_type, target_id);
create index comments_story_id_idx on public.comments(story_id);
create index comments_episode_id_idx on public.comments(episode_id);
create index comments_parent_id_idx on public.comments(parent_id);
create index community_posts_user_id_idx on public.community_posts(user_id);
create index community_posts_story_id_idx on public.community_posts(story_id);
create index community_posts_creator_id_idx on public.community_posts(creator_id);
create index reports_reporter_id_idx on public.reports(reporter_id);
create index reports_target_idx on public.reports(target_type, target_id);
create index moderation_cases_report_id_idx on public.moderation_cases(report_id);
create index moderation_cases_target_idx on public.moderation_cases(target_type, target_id);
create index analytics_events_user_id_idx on public.analytics_events(user_id);
create index analytics_events_event_name_idx on public.analytics_events(event_name);
create index analytics_events_created_at_idx on public.analytics_events(created_at);

create or replace function public.current_profile_role()
returns public.profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.creator_profile_current_status(creator_profile_id uuid)
returns public.creator_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.creator_profiles where id = creator_profile_id
$$;

alter table public.profiles enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.genres enable row level security;
alter table public.tags enable row level security;
alter table public.stories enable row level security;
alter table public.story_tags enable row level security;
alter table public.episodes enable row level security;
alter table public.follows enable row level security;
alter table public.bookshelf_items enable row level security;
alter table public.reading_progress enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.community_posts enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_cases enable row level security;
alter table public.analytics_events enable row level security;

create policy "Profiles are readable"
on public.profiles for select
using (true);

create policy "Users can create own profile"
on public.profiles for insert
with check (auth.uid() = id and role = 'user');

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id and role = public.current_profile_role());

create policy "Active creator profiles are readable"
on public.creator_profiles for select
using (status = 'active' or user_id = auth.uid() or public.current_profile_role() in ('admin', 'moderator'));

create policy "Users can create own creator profile"
on public.creator_profiles for insert
with check (auth.uid() = user_id and status = 'active');

create policy "Creators can update own profile"
on public.creator_profiles for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and status = public.creator_profile_current_status(id)
);

create policy "Genres are readable"
on public.genres for select
using (true);

create policy "Moderators can manage genres"
on public.genres for all
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

create policy "Tags are readable"
on public.tags for select
using (true);

create policy "Moderators can manage tags"
on public.tags for all
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

create policy "Published public stories are readable"
on public.stories for select
using (
  (status = 'published' and visibility = 'public')
  or exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = stories.creator_id
    and creator_profiles.user_id = auth.uid()
  )
  or public.current_profile_role() in ('admin', 'moderator')
);

create policy "Creators can create own stories"
on public.stories for insert
with check (
  status in ('draft', 'pending')
  and visibility in ('public', 'private')
  and
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = stories.creator_id
    and creator_profiles.user_id = auth.uid()
  )
);

create policy "Creators can update own stories"
on public.stories for update
using (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = stories.creator_id
    and creator_profiles.user_id = auth.uid()
  )
)
with check (
  status in ('draft', 'pending', 'archived')
  and visibility in ('public', 'private')
  and
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = stories.creator_id
    and creator_profiles.user_id = auth.uid()
  )
);

create policy "Story tags on readable stories are readable"
on public.story_tags for select
using (
  exists (
    select 1 from public.stories
    where stories.id = story_tags.story_id
  )
);

create policy "Creators can manage tags on own stories"
on public.story_tags for all
using (
  exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = story_tags.story_id
    and creator_profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = story_tags.story_id
    and creator_profiles.user_id = auth.uid()
  )
);

create policy "Published episodes are readable"
on public.episodes for select
using (
  status = 'published'
  and exists (
    select 1 from public.stories
    where stories.id = episodes.story_id
    and stories.status = 'published'
    and stories.visibility = 'public'
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

create policy "Creators can create own episodes"
on public.episodes for insert
with check (
  status in ('draft', 'pending')
  and
  exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = episodes.story_id
    and creator_profiles.user_id = auth.uid()
  )
);

create policy "Creators can update own episodes"
on public.episodes for update
using (
  exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = episodes.story_id
    and creator_profiles.user_id = auth.uid()
  )
)
with check (
  status in ('draft', 'pending', 'archived')
  and
  exists (
    select 1
    from public.stories
    join public.creator_profiles on creator_profiles.id = stories.creator_id
    where stories.id = episodes.story_id
    and creator_profiles.user_id = auth.uid()
  )
);

create policy "Users can read own follows"
on public.follows for select
using (auth.uid() = follower_id);

create policy "Users can create own follows"
on public.follows for insert
with check (auth.uid() = follower_id);

create policy "Users can delete own follows"
on public.follows for delete
using (auth.uid() = follower_id);

create policy "Users can manage own bookshelf"
on public.bookshelf_items for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own reading progress"
on public.reading_progress for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Reactions are readable"
on public.reactions for select
using (
  target_type in ('story', 'episode', 'comment', 'community_post')
);

create policy "Users can create own reactions"
on public.reactions for insert
with check (auth.uid() = user_id);

create policy "Users can delete own reactions"
on public.reactions for delete
using (auth.uid() = user_id);

create policy "Visible comments are readable"
on public.comments for select
using (
  status = 'visible'
  or auth.uid() = user_id
  or public.current_profile_role() in ('admin', 'moderator')
);

create policy "Users can create own comments"
on public.comments for insert
with check (auth.uid() = user_id);

create policy "Users can update own comments"
on public.comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Approved community posts are readable"
on public.community_posts for select
using (
  status = 'approved'
  or auth.uid() = user_id
  or public.current_profile_role() in ('admin', 'moderator')
);

create policy "Users can create own community posts"
on public.community_posts for insert
with check (auth.uid() = user_id and status = 'pending');

create policy "Users can update own community posts"
on public.community_posts for update
using (auth.uid() = user_id and status = 'pending')
with check (auth.uid() = user_id and status = 'pending');

create policy "Users can create own reports"
on public.reports for insert
with check (auth.uid() = reporter_id);

create policy "Users can read own reports"
on public.reports for select
using (
  auth.uid() = reporter_id
  or public.current_profile_role() in ('admin', 'moderator')
);

create policy "Moderators can update reports"
on public.reports for update
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

create policy "Moderators can manage moderation cases"
on public.moderation_cases for all
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));

create policy "Users can create analytics events"
on public.analytics_events for insert
with check (user_id is null or auth.uid() = user_id);

create policy "Users can read own analytics events"
on public.analytics_events for select
using (
  auth.uid() = user_id
  or public.current_profile_role() in ('admin', 'moderator')
);
