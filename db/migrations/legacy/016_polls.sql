create table public.polls (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_id uuid references public.episodes(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  status text not null default 'active',
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint polls_status_check check (status in ('active', 'closed'))
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_text text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  constraint poll_options_sort_order_check check (sort_order between 1 and 4),
  constraint poll_options_text_length check (char_length(option_text) between 1 and 140),
  unique (poll_id, sort_order)
);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create trigger polls_set_updated_at
before update on public.polls
for each row execute function public.set_updated_at();

create unique index polls_story_unique_idx
on public.polls(story_id)
where chapter_id is null;

create unique index polls_chapter_unique_idx
on public.polls(story_id, chapter_id)
where chapter_id is not null;

create index polls_story_id_idx on public.polls(story_id);
create index polls_chapter_id_idx on public.polls(chapter_id);
create index polls_author_id_idx on public.polls(author_id);
create index poll_options_poll_id_idx on public.poll_options(poll_id);
create index poll_votes_poll_id_idx on public.poll_votes(poll_id);
create index poll_votes_user_id_idx on public.poll_votes(user_id);

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

create policy "Polls are readable on public stories"
on public.polls for select
using (
  auth.uid() = author_id
  or exists (
    select 1
    from public.stories
    where stories.id = polls.story_id
      and stories.visibility = 'public'
      and stories.status in ('approved', 'published')
  )
);

create policy "Users can create own polls"
on public.polls for insert
with check (auth.uid() = author_id);

create policy "Users can update own polls"
on public.polls for update
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

create policy "Poll options are readable with polls"
on public.poll_options for select
using (
  exists (
    select 1
    from public.polls
    join public.stories on stories.id = polls.story_id
    where polls.id = poll_options.poll_id
      and (
        polls.author_id = auth.uid()
        or (
          stories.visibility = 'public'
          and stories.status in ('approved', 'published')
        )
      )
  )
);

create policy "Users can manage own poll options"
on public.poll_options for all
using (
  exists (
    select 1
    from public.polls
    where polls.id = poll_options.poll_id
      and polls.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.polls
    where polls.id = poll_options.poll_id
      and polls.author_id = auth.uid()
  )
);

create policy "Poll votes are readable"
on public.poll_votes for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.polls
    join public.stories on stories.id = polls.story_id
    where polls.id = poll_votes.poll_id
      and stories.visibility = 'public'
      and stories.status in ('approved', 'published')
  )
);

create policy "Users can vote for own user id"
on public.poll_votes for insert
with check (auth.uid() = user_id);

create policy "Users can update own votes"
on public.poll_votes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

