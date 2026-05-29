-- Public profile privacy settings and user-to-user follows

create table if not exists public.profile_privacy_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  show_public_collections boolean not null default true,
  show_public_activities boolean not null default true,
  show_public_comments boolean not null default true,
  show_badges boolean not null default true,
  show_creator_works boolean not null default true,
  show_reading_history boolean not null default false,
  show_saved_stories boolean not null default false,
  show_followed_authors boolean not null default false,
  show_followed_groups boolean not null default false,
  allow_follow boolean not null default true,
  allow_dm boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_follows_no_self check (follower_id <> following_id),
  constraint user_follows_unique unique (follower_id, following_id)
);

create index if not exists idx_user_follows_follower on public.user_follows(follower_id, created_at desc);
create index if not exists idx_user_follows_following on public.user_follows(following_id, created_at desc);

alter table public.profile_privacy_settings enable row level security;
alter table public.user_follows enable row level security;

-- Privacy: owner read/write; others read flags only (no sensitive columns exist)
create policy "Users manage own profile privacy"
  on public.profile_privacy_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Anyone can read profile privacy flags"
  on public.profile_privacy_settings for select
  using (true);

-- Follows: public read for counts; authenticated users insert/delete own
create policy "Anyone can read user follows"
  on public.user_follows for select
  using (true);

create policy "Users can follow others"
  on public.user_follows for insert
  with check (
    auth.uid() = follower_id
    and follower_id <> following_id
    and (
      not exists (
        select 1 from public.profile_privacy_settings pps
        where pps.user_id = following_id
      )
      or exists (
        select 1 from public.profile_privacy_settings pps
        where pps.user_id = following_id
          and pps.allow_follow = true
      )
    )
  );

create policy "Users can unfollow"
  on public.user_follows for delete
  using (auth.uid() = follower_id);

create or replace function public.get_public_user_follow_stats(input_user_id uuid)
returns table (
  following_count bigint,
  follower_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      select count(*)::bigint
      from public.user_follows
      where follower_id = input_user_id
    ) as following_count,
    (
      select count(*)::bigint
      from public.user_follows
      where following_id = input_user_id
    ) as follower_count
$$;

grant execute on function public.get_public_user_follow_stats(uuid) to anon, authenticated;
grant execute on function public.get_reader_profile_metrics(uuid) to anon, authenticated;

-- Reader badges visible on public profiles when enabled (or default before row exists)
create policy "Public profile badges readable"
  on public.user_badges for select
  using (
    not exists (
      select 1 from public.profile_privacy_settings pps
      where pps.user_id = user_badges.user_id
    )
    or exists (
      select 1 from public.profile_privacy_settings pps
      where pps.user_id = user_badges.user_id
        and pps.show_badges = true
    )
  );

-- Auto-create privacy row when profile is created (existing users get row on first read via app upsert)
