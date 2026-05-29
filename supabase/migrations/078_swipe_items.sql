-- ChapMee Studio: nội dung Swipe thủ công (không AI)

create table public.swipe_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  chapter_id uuid references public.episodes(id) on delete set null,
  title text,
  hook text not null default '',
  body text not null default '',
  cta text,
  cta_type text,
  background_image_url text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  source_type text,
  source_text_start int,
  source_text_end int,
  view_count integer not null default 0,
  cta_click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swipe_items_status_check check (
    status in ('draft', 'scheduled', 'published', 'hidden', 'rejected')
  ),
  constraint swipe_items_source_type_check check (
    source_type is null
    or source_type in (
      'manual',
      'chapter_start',
      'dialogue',
      'question',
      'ending',
      'manual_selection',
      'story_description'
    )
  )
);

create index swipe_items_owner_status_idx
  on public.swipe_items (owner_id, status, updated_at desc);

create index swipe_items_published_idx
  on public.swipe_items (published_at desc)
  where status = 'published';

create index swipe_items_story_idx on public.swipe_items (story_id);

create trigger swipe_items_set_updated_at
before update on public.swipe_items
for each row execute function public.set_updated_at();

alter table public.swipe_items enable row level security;

create policy "Owners manage own swipe items"
on public.swipe_items
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Public read published swipe items"
on public.swipe_items
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.stories s
    where s.id = swipe_items.story_id
      and s.status in ('published', 'approved')
      and s.visibility = 'public'
  )
);
