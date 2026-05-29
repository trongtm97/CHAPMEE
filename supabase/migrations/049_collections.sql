create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  visibility text not null default 'private' check (visibility in ('public', 'private')),
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  sort_order integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  constraint unique_collection_story unique (collection_id, story_id)
);

create index if not exists idx_collections_user_created_at on public.collections(user_id, created_at desc);
create index if not exists idx_collection_items_collection on public.collection_items(collection_id, sort_order asc, created_at asc);
create index if not exists idx_collection_items_story on public.collection_items(story_id);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

create policy "Users can view their own collections"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Public collections are viewable"
  on public.collections for select
  using (visibility = 'public');

create policy "Users can insert own collections"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own collections"
  on public.collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own collections"
  on public.collections for delete
  using (auth.uid() = user_id);

create policy "Collection items are viewable via collection visibility"
  on public.collection_items for select
  using (exists (
    select 1 from public.collections c
    where c.id = collection_items.collection_id
      and (c.visibility = 'public' or c.user_id = auth.uid())
  ));

create policy "Users can manage items in own collections"
  on public.collection_items for all
  using (exists (
    select 1 from public.collections c
    where c.id = collection_items.collection_id
      and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.collections c
    where c.id = collection_items.collection_id
      and c.user_id = auth.uid()
  ));
