-- Chapter reaction catalog + migrate legacy chapter_reactions to multi-type toggle model.

create table if not exists public.chapter_reaction_types (
  id uuid primary key default gen_random_uuid(),
  key varchar(64) not null unique,
  label text not null,
  emoji text not null,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.chapter_reaction_types (key, label, emoji, sort_order)
values
  ('funny', 'Hài', '😂', 10),
  ('wow', 'Sốc', '😮', 20),
  ('cry', 'Khóc', '😭', 30),
  ('angry', 'Phẫn nộ', '😡', 40),
  ('hooked', 'Cuốn', '🔥', 50),
  ('next', 'Muốn chương tiếp', '👉', 60),
  ('love', 'Thích', '❤️', 70)
on conflict (key) do update set
  label = excluded.label,
  emoji = excluded.emoji,
  sort_order = excluded.sort_order,
  updated_at = now();

-- Fresh table when legacy migration never ran.
create table if not exists public.chapter_reactions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.episodes(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction_type_key varchar(64) not null references public.chapter_reaction_types(key),
  origin varchar(32) not null default 'user',
  created_at timestamptz not null default now(),
  constraint chapter_reactions_origin_check check (
    origin in ('user', 'admin_seed', 'system_seed')
  ),
  constraint chapter_reactions_chapter_profile_type_unique unique (
    chapter_id,
    profile_id,
    reaction_type_key
  )
);

-- Migrate legacy columns (supabase/migrations/018_chapter_reactions.sql).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chapter_reactions'
      and column_name = 'reaction_key'
  ) then
    alter table public.chapter_reactions
      add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

    alter table public.chapter_reactions
      add column if not exists reaction_type_key varchar(64);

    alter table public.chapter_reactions
      add column if not exists origin varchar(32) not null default 'user';

    update public.chapter_reactions
    set profile_id = user_id
    where profile_id is null and user_id is not null;

    update public.chapter_reactions
    set reaction_type_key = case reaction_key
      when 'hai' then 'funny'
      when 'soc' then 'wow'
      when 'buon' then 'cry'
      when 'tuc' then 'angry'
      when 'cuon' then 'hooked'
      when 'muon_chap_tiep' then 'next'
      when 'team_nam_phu' then 'love'
      when 'can_tra_thu' then 'angry'
      else null
    end
    where reaction_type_key is null;

    delete from public.chapter_reactions where reaction_type_key is null;

    drop policy if exists "Chapter reactions are readable for public chapters" on public.chapter_reactions;
    drop policy if exists "Users can insert own chapter reactions" on public.chapter_reactions;
    drop policy if exists "Users can update own chapter reactions" on public.chapter_reactions;
    drop policy if exists "Users can delete own chapter reactions" on public.chapter_reactions;

    alter table public.chapter_reactions drop constraint if exists chapter_reactions_key_check;
    alter table public.chapter_reactions drop constraint if exists chapter_reactions_chapter_id_user_id_key;

    alter table public.chapter_reactions drop column if exists story_id;
    alter table public.chapter_reactions drop column if exists user_id;
    alter table public.chapter_reactions drop column if exists reaction_key;
    alter table public.chapter_reactions drop column if exists updated_at;

    alter table public.chapter_reactions
      alter column profile_id set not null;

    alter table public.chapter_reactions
      alter column reaction_type_key set not null;

    alter table public.chapter_reactions
      drop constraint if exists chapter_reactions_chapter_profile_type_unique;

    alter table public.chapter_reactions
      add constraint chapter_reactions_chapter_profile_type_unique unique (
        chapter_id,
        profile_id,
        reaction_type_key
      );

    alter table public.chapter_reactions
      drop constraint if exists chapter_reactions_origin_check;

    alter table public.chapter_reactions
      add constraint chapter_reactions_origin_check check (
        origin in ('user', 'admin_seed', 'system_seed')
      );

    create policy "Chapter reactions are readable for public chapters"
      on public.chapter_reactions for select
      using (
        auth.uid() = profile_id
        or exists (
          select 1
          from public.episodes e
          inner join public.stories s on s.id = e.story_id
          where e.id = chapter_reactions.chapter_id
            and s.visibility = 'public'
            and s.status in ('approved', 'published')
        )
      );

    create policy "Users can insert own chapter reactions"
      on public.chapter_reactions for insert
      with check (auth.uid() = profile_id and origin = 'user');

    create policy "Users can delete own chapter reactions"
      on public.chapter_reactions for delete
      using (auth.uid() = profile_id and origin = 'user');
  end if;
end $$;

-- Ensure FK to catalog for existing/new rows.
alter table public.chapter_reactions
  drop constraint if exists chapter_reactions_reaction_type_key_fkey;

alter table public.chapter_reactions
  add constraint chapter_reactions_reaction_type_key_fkey
  foreign key (reaction_type_key) references public.chapter_reaction_types(key);

create index if not exists chapter_reactions_chapter_id_idx
  on public.chapter_reactions (chapter_id);

create index if not exists chapter_reactions_profile_id_idx
  on public.chapter_reactions (profile_id);

create index if not exists chapter_reactions_reaction_type_key_idx
  on public.chapter_reactions (reaction_type_key);

create index if not exists chapter_reactions_origin_idx
  on public.chapter_reactions (origin);

create index if not exists chapter_reaction_types_enabled_sort_idx
  on public.chapter_reaction_types (is_enabled, sort_order);

comment on table public.chapter_reaction_types is
  'Admin-configurable chapter reaction catalog for reader engagement.';

comment on column public.chapter_reactions.origin is
  'user = real engagement; admin_seed/system_seed excluded from real_count aggregates.';
