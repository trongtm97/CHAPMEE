create type public.notification_type as enum (
  'new_chapter_from_followed_story',
  'author_replied_to_comment',
  'comment_liked_milestone',
  'comment_pinned_by_author',
  'became_early_fan',
  'became_top_fan',
  'poll_result_updated',
  'challenge_result_announced',
  'milestone_achieved',
  'new_comment_on_story',
  'story_reached_reads_milestone',
  'new_follower',
  'story_saved_milestone',
  'top_fan_updated',
  'challenge_entry_received',
  'author_thank_you_sent',
  'welcome',
  'onboarding_reminder',
  'community_guideline_update'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  target_type text,
  target_id uuid,
  action_url text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_target_type_check check (
    target_type is null
    or target_type in ('story', 'chapter', 'comment', 'author', 'challenge', 'milestone', 'profile')
  )
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_read_at_idx on public.notifications(read_at);
create index notifications_created_at_idx on public.notifications(created_at desc);
create index notifications_user_created_at_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can read own notifications"
on public.notifications for select
using (auth.uid() = user_id);

create policy "Users can update own notifications"
on public.notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Authenticated users can insert notifications"
on public.notifications for insert
with check (auth.uid() is not null);
