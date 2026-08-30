create table public.chapter_reactions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.episodes(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapter_reactions_key_check check (reaction_key in (
    'cuon', 'soc', 'tuc', 'buon', 'hai', 'muon_chap_tiep', 'team_nam_phu', 'can_tra_thu'
  )),
  unique (chapter_id, user_id)
);

create index chapter_reactions_chapter_id_idx on public.chapter_reactions(chapter_id);
create index chapter_reactions_story_id_idx on public.chapter_reactions(story_id);
create index chapter_reactions_user_id_idx on public.chapter_reactions(user_id);

alter table public.chapter_reactions enable row level security;

create policy "Chapter reactions are readable for public chapters"
on public.chapter_reactions for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.stories
    where stories.id = chapter_reactions.story_id
      and stories.visibility = 'public'
      and stories.status in ('approved', 'published')
  )
);

create policy "Users can insert own chapter reactions"
on public.chapter_reactions for insert
with check (auth.uid() = user_id);

create policy "Users can update own chapter reactions"
on public.chapter_reactions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own chapter reactions"
on public.chapter_reactions for delete
using (auth.uid() = user_id);
