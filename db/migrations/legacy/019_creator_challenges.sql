create table public.creator_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  prompt_text text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.challenge_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.creator_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  chapter_id uuid references public.episodes(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (challenge_id, story_id, chapter_id)
);

create table public.challenge_votes (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.creator_challenges(id) on delete cascade,
  entry_id uuid not null references public.challenge_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (challenge_id, entry_id, user_id)
);

create index challenge_entries_challenge_id_idx on public.challenge_entries(challenge_id);
create index challenge_entries_user_id_idx on public.challenge_entries(user_id);
create index challenge_votes_challenge_id_idx on public.challenge_votes(challenge_id);
create index challenge_votes_entry_id_idx on public.challenge_votes(entry_id);

alter table public.creator_challenges enable row level security;
alter table public.challenge_entries enable row level security;
alter table public.challenge_votes enable row level security;

create policy "Challenges are public to read"
  on public.creator_challenges for select
  using (status in ('active', 'closed') or auth.uid() is not null);

create policy "Challenge entries are public for approved challenges"
  on public.challenge_entries for select
  using (
    exists (
      select 1 from public.creator_challenges
      where creator_challenges.id = challenge_entries.challenge_id
        and creator_challenges.status in ('active', 'closed')
    )
  );

create policy "Users can insert own entries"
  on public.challenge_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.challenge_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Challenge votes public readable"
  on public.challenge_votes for select
  using (auth.uid() = user_id or exists (
    select 1 from public.creator_challenges
    where creator_challenges.id = challenge_votes.challenge_id
      and creator_challenges.status in ('active', 'closed')
  ));

create policy "Users can vote with own id"
  on public.challenge_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own votes"
  on public.challenge_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
