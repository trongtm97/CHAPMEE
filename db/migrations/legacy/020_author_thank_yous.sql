create table public.author_thank_yous (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.creator_profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  recipient_user_id uuid references public.profiles(id) on delete set null,
  recipient_group_type text,
  message text not null,
  created_at timestamptz not null default now()
);

create index author_thank_yous_author_id_idx on public.author_thank_yous(author_id);
create index author_thank_yous_story_id_idx on public.author_thank_yous(story_id);
create index author_thank_yous_recipient_user_id_idx on public.author_thank_yous(recipient_user_id);

alter table public.author_thank_yous enable row level security;

create policy "Author thank yous are readable by author or recipient"
on public.author_thank_yous for select
using (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = author_thank_yous.author_id
      and creator_profiles.user_id = auth.uid()
  )
  or author_thank_yous.recipient_user_id = auth.uid()
);

create policy "Authors can create own thank yous"
on public.author_thank_yous for insert
with check (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = author_thank_yous.author_id
      and creator_profiles.user_id = auth.uid()
  )
);

create policy "Authors can update own thank yous"
on public.author_thank_yous for update
using (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = author_thank_yous.author_id
      and creator_profiles.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.creator_profiles
    where creator_profiles.id = author_thank_yous.author_id
      and creator_profiles.user_id = auth.uid()
  )
);
