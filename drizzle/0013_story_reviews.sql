-- Structured story reviews + aggregate stats.

create table if not exists public.story_reviews (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  reviewer_profile_id uuid not null references public.profiles(id) on delete cascade,
  overall_rating integer not null,
  plot_score integer not null,
  character_score integer not null,
  writing_style_score integer not null,
  worldbuilding_score integer not null,
  title text,
  body text,
  status varchar(32) not null default 'visible',
  report_count integer not null default 0,
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_reviews_story_reviewer_unique unique (story_id, reviewer_profile_id),
  constraint story_reviews_overall_rating check (overall_rating between 1 and 5),
  constraint story_reviews_plot_score check (plot_score between 1 and 5),
  constraint story_reviews_character_score check (character_score between 1 and 5),
  constraint story_reviews_writing_style_score check (writing_style_score between 1 and 5),
  constraint story_reviews_worldbuilding_score check (worldbuilding_score between 1 and 5),
  constraint story_reviews_status check (
    status in ('visible', 'pending', 'hidden', 'deleted')
  ),
  constraint story_reviews_title_len check (title is null or char_length(title) <= 120),
  constraint story_reviews_body_len check (body is null or char_length(body) <= 5000)
);

create index if not exists story_reviews_story_id_idx
  on public.story_reviews (story_id);

create index if not exists story_reviews_reviewer_profile_id_idx
  on public.story_reviews (reviewer_profile_id);

create index if not exists story_reviews_status_idx
  on public.story_reviews (status);

create index if not exists story_reviews_created_at_idx
  on public.story_reviews (created_at desc);

create index if not exists story_reviews_story_visible_created_idx
  on public.story_reviews (story_id, created_at desc)
  where status = 'visible';

create table if not exists public.story_review_stats (
  story_id uuid primary key references public.stories(id) on delete cascade,
  review_count integer not null default 0,
  avg_overall numeric(4, 2),
  avg_plot numeric(4, 2),
  avg_character numeric(4, 2),
  avg_writing_style numeric(4, 2),
  avg_worldbuilding numeric(4, 2),
  rating_1_count integer not null default 0,
  rating_2_count integer not null default 0,
  rating_3_count integer not null default 0,
  rating_4_count integer not null default 0,
  rating_5_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.story_review_helpful_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.story_reviews(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint story_review_helpful_votes_unique unique (review_id, profile_id)
);

create index if not exists story_review_helpful_votes_review_id_idx
  on public.story_review_helpful_votes (review_id);

comment on table public.story_reviews is
  'Structured user reviews per story — one visible review per reviewer.';

comment on table public.story_review_stats is
  'Pre-aggregated review stats (visible reviews only). Refreshed on write.';
