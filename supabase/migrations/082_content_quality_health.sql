-- Content Quality Health: reviews, story/chapter status, appeals

-- ---------------------------------------------------------------------------
-- Notification types
-- ---------------------------------------------------------------------------
alter type public.notification_type add value if not exists 'content_quality_warning';
alter type public.notification_type add value if not exists 'content_quality_needs_fix';
alter type public.notification_type add value if not exists 'content_quality_restored';
alter type public.notification_type add value if not exists 'content_quality_permanently_hidden';
alter type public.notification_type add value if not exists 'content_quality_monetization_disabled';

-- ---------------------------------------------------------------------------
-- Story / episode quality columns
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists quality_status text not null default 'good',
  add column if not exists low_quality_attempt_count int not null default 0,
  add column if not exists monetization_disabled_by_quality boolean not null default false,
  add column if not exists quality_updated_at timestamptz;

alter table public.episodes
  add column if not exists quality_status text not null default 'good',
  add column if not exists low_quality_attempt_count int not null default 0,
  add column if not exists quality_updated_at timestamptz;

alter table public.stories
  drop constraint if exists stories_quality_status_check;

alter table public.stories
  add constraint stories_quality_status_check check (
    quality_status in (
      'good',
      'needs_attention',
      'low_quality_warning_1',
      'low_quality_warning_2',
      'low_quality_final_review',
      'permanently_hidden_low_quality',
      'appealed',
      'pending_quality_review',
      'restored'
    )
  );

alter table public.stories
  drop constraint if exists stories_low_quality_attempt_count_check;

alter table public.stories
  add constraint stories_low_quality_attempt_count_check check (
    low_quality_attempt_count between 0 and 3
  );

alter table public.episodes
  drop constraint if exists episodes_quality_status_check;

alter table public.episodes
  add constraint episodes_quality_status_check check (
    quality_status in (
      'good',
      'needs_attention',
      'low_quality_warning_1',
      'low_quality_warning_2',
      'low_quality_final_review',
      'permanently_hidden_low_quality',
      'appealed',
      'pending_quality_review',
      'restored'
    )
  );

alter table public.episodes
  drop constraint if exists episodes_low_quality_attempt_count_check;

alter table public.episodes
  add constraint episodes_low_quality_attempt_count_check check (
    low_quality_attempt_count between 0 and 3
  );

create index if not exists idx_stories_quality_status
  on public.stories(creator_id, quality_status);

create index if not exists idx_episodes_quality_status
  on public.episodes(story_id, quality_status);

-- ---------------------------------------------------------------------------
-- Reviews history
-- ---------------------------------------------------------------------------
create table if not exists public.content_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  story_id uuid references public.stories(id) on delete cascade,
  chapter_id uuid references public.episodes(id) on delete cascade,
  author_id uuid not null references public.creator_profiles(id) on delete cascade,
  status text not null,
  attempt_number int not null default 0,
  reason_codes text[] not null default '{}',
  signal_snapshot jsonb,
  moderator_note text,
  author_note text,
  action_taken text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_quality_reviews_target_type_check check (
    target_type in ('story', 'chapter')
  ),
  constraint content_quality_reviews_attempt_check check (
    attempt_number between 0 and 3
  ),
  constraint content_quality_reviews_action_check check (
    action_taken is null
    or action_taken in (
      'warning_only',
      'hidden_temporarily',
      'restored',
      'resubmitted',
      'permanently_hidden',
      'monetization_disabled'
    )
  )
);

create index if not exists idx_content_quality_reviews_author
  on public.content_quality_reviews(author_id, created_at desc);

create index if not exists idx_content_quality_reviews_story
  on public.content_quality_reviews(story_id, created_at desc);

create index if not exists idx_content_quality_reviews_target
  on public.content_quality_reviews(target_type, target_id, created_at desc);

create trigger content_quality_reviews_set_updated_at
before update on public.content_quality_reviews
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Appeals (one per story after permanent hide)
-- ---------------------------------------------------------------------------
create table if not exists public.content_quality_appeals (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.creator_profiles(id) on delete cascade,
  message text not null,
  status text not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_quality_appeals_status_check check (
    status in ('pending', 'approved', 'rejected')
  )
);

create unique index if not exists idx_content_quality_appeals_story
  on public.content_quality_appeals(story_id);

create trigger content_quality_appeals_set_updated_at
before update on public.content_quality_appeals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Default admin config in app_settings
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, is_public)
values (
  'content_quality_settings',
  jsonb_build_object(
    'min_ratings_for_quality_action', 10,
    'low_rating_threshold', 2.5,
    'min_reports_for_review', 3,
    'early_drop_threshold', 0.55,
    'require_moderator_confirmation_for_penalty', true,
    'min_content_words_story', 80,
    'min_content_words_chapter', 300
  ),
  true
)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.content_quality_reviews enable row level security;
alter table public.content_quality_appeals enable row level security;

drop policy if exists "Authors read own quality reviews" on public.content_quality_reviews;
create policy "Authors read own quality reviews"
  on public.content_quality_reviews for select
  to authenticated
  using (
    author_id in (
      select id from public.creator_profiles where user_id = auth.uid()
    )
    or public.user_has_permission(auth.uid(), 'report.review')
    or public.user_has_permission(auth.uid(), 'moderation.action.create')
  );

drop policy if exists "Authors insert resubmit quality reviews" on public.content_quality_reviews;
create policy "Authors insert resubmit quality reviews"
  on public.content_quality_reviews for insert
  to authenticated
  with check (
    author_id in (
      select id from public.creator_profiles where user_id = auth.uid()
    )
    and action_taken = 'resubmitted'
  );

drop policy if exists "Staff manage quality reviews" on public.content_quality_reviews;
create policy "Staff manage quality reviews"
  on public.content_quality_reviews for all
  to authenticated
  using (
    public.user_has_permission(auth.uid(), 'report.review')
    or public.user_has_permission(auth.uid(), 'moderation.action.create')
  )
  with check (
    public.user_has_permission(auth.uid(), 'report.review')
    or public.user_has_permission(auth.uid(), 'moderation.action.create')
  );

drop policy if exists "Authors read own appeals" on public.content_quality_appeals;
create policy "Authors read own appeals"
  on public.content_quality_appeals for select
  to authenticated
  using (
    author_id in (
      select id from public.creator_profiles where user_id = auth.uid()
    )
    or public.user_has_permission(auth.uid(), 'report.review')
    or public.user_has_permission(auth.uid(), 'moderation.action.create')
  );

drop policy if exists "Authors create appeal once" on public.content_quality_appeals;
create policy "Authors create appeal once"
  on public.content_quality_appeals for insert
  to authenticated
  with check (
    author_id in (
      select id from public.creator_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "Staff manage appeals" on public.content_quality_appeals;
create policy "Staff manage appeals"
  on public.content_quality_appeals for all
  to authenticated
  using (
    public.user_has_permission(auth.uid(), 'report.review')
    or public.user_has_permission(auth.uid(), 'moderation.action.create')
  )
  with check (
    public.user_has_permission(auth.uid(), 'report.review')
    or public.user_has_permission(auth.uid(), 'moderation.action.create')
  );
