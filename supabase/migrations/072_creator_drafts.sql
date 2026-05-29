-- Studio autosave drafts + version history (internal: creator_drafts)

create table public.creator_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  chapter_id uuid references public.episodes(id) on delete cascade,
  draft_type text not null,
  title text,
  content jsonb not null default '{}'::jsonb,
  plain_text text,
  status text not null default 'draft',
  last_saved_at timestamptz not null default now(),
  last_version_at timestamptz,
  version_checkpoint_word_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_drafts_type_check check (
    draft_type in ('story', 'chapter', 'swipe', 'seo', 'template')
  ),
  constraint creator_drafts_status_check check (status in ('draft', 'archived'))
);

create unique index creator_drafts_owner_scope_uidx on public.creator_drafts (
  owner_id,
  draft_type,
  coalesce(story_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index creator_drafts_owner_saved_idx
  on public.creator_drafts (owner_id, last_saved_at desc);

create index creator_drafts_story_idx on public.creator_drafts (story_id);

create trigger creator_drafts_set_updated_at
before update on public.creator_drafts
for each row execute function public.set_updated_at();

create table public.creator_draft_versions (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.creator_drafts(id) on delete cascade,
  version_number integer not null,
  title text,
  content jsonb not null default '{}'::jsonb,
  plain_text text,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  constraint creator_draft_versions_number_positive check (version_number > 0),
  unique (draft_id, version_number)
);

create index creator_draft_versions_draft_idx
  on public.creator_draft_versions (draft_id, version_number desc);

alter table public.creator_drafts enable row level security;
alter table public.creator_draft_versions enable row level security;

-- profiles.id = auth.users.id (không có profiles.user_id)
create policy "Owners read own creator drafts"
on public.creator_drafts for select
using (owner_id = auth.uid());

create policy "Owners insert own creator drafts"
on public.creator_drafts for insert
with check (owner_id = auth.uid());

create policy "Owners update own creator drafts"
on public.creator_drafts for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Owners delete own creator drafts"
on public.creator_drafts for delete
using (owner_id = auth.uid());

create policy "Owners read own draft versions"
on public.creator_draft_versions for select
using (
  exists (
    select 1
    from public.creator_drafts d
    where d.id = creator_draft_versions.draft_id
    and d.owner_id = auth.uid()
  )
);

create policy "Owners insert own draft versions"
on public.creator_draft_versions for insert
with check (
  exists (
    select 1
    from public.creator_drafts d
    where d.id = creator_draft_versions.draft_id
    and d.owner_id = auth.uid()
  )
  and created_by = auth.uid()
);

create policy "Owners delete own draft versions"
on public.creator_draft_versions for delete
using (
  exists (
    select 1
    from public.creator_drafts d
    where d.id = creator_draft_versions.draft_id
    and d.owner_id = auth.uid()
  )
);
