-- Migration 160: ChapMee taxonomy system (terms, story links, requests, presentation)

-- ---------------------------------------------------------------------------
-- Enum-like constraints via check + helper
-- ---------------------------------------------------------------------------
create or replace function public.is_valid_taxonomy_type(input_type text)
returns boolean
language sql
immutable
as $$
  select input_type in (
    'content_type',
    'main_genre',
    'subgenre',
    'trope_tag',
    'setting_tag',
    'character_tag',
    'relationship_tag',
    'narrative_style',
    'presentation_mode',
    'reader_experience',
    'content_warning',
    'age_rating',
    'story_status',
    'monetization_access',
    'editorial_tag'
  );
$$;

-- ---------------------------------------------------------------------------
-- taxonomy_terms
-- ---------------------------------------------------------------------------
create table if not exists public.taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  parent_id uuid references public.taxonomy_terms(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  icon text,
  color text,
  display_label text,
  internal_note text,
  aliases jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_public boolean not null default true,
  is_selectable_by_creator boolean not null default true,
  is_featured boolean not null default false,
  use_for_seo boolean not null default true,
  use_for_discover boolean not null default true,
  use_for_ranking boolean not null default true,
  use_for_moderation boolean not null default false,
  sort_order integer not null default 0,
  usage_count integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_terms_type_slug_unique unique (type, slug),
  constraint taxonomy_terms_type_valid check (public.is_valid_taxonomy_type(type)),
  constraint taxonomy_terms_aliases_is_array check (jsonb_typeof(aliases) = 'array')
);

create index if not exists idx_taxonomy_terms_type_active
  on public.taxonomy_terms(type, is_active, sort_order);

create index if not exists idx_taxonomy_terms_parent_id
  on public.taxonomy_terms(parent_id)
  where parent_id is not null;

create index if not exists idx_taxonomy_terms_slug
  on public.taxonomy_terms(slug);

create trigger taxonomy_terms_set_updated_at
before update on public.taxonomy_terms
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- story_taxonomy_terms
-- ---------------------------------------------------------------------------
create table if not exists public.story_taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  term_id uuid not null references public.taxonomy_terms(id) on delete restrict,
  type text not null,
  created_at timestamptz not null default now(),
  constraint story_taxonomy_terms_story_term_unique unique (story_id, term_id),
  constraint story_taxonomy_terms_type_valid check (public.is_valid_taxonomy_type(type))
);

create index if not exists idx_story_taxonomy_terms_story_id
  on public.story_taxonomy_terms(story_id);

create index if not exists idx_story_taxonomy_terms_term_id
  on public.story_taxonomy_terms(term_id);

create index if not exists idx_story_taxonomy_terms_type
  on public.story_taxonomy_terms(type);

-- ---------------------------------------------------------------------------
-- taxonomy_requests
-- ---------------------------------------------------------------------------
create table if not exists public.taxonomy_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  name text not null,
  description text,
  example_usage text,
  related_existing_term_id uuid references public.taxonomy_terms(id) on delete set null,
  status text not null default 'pending',
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taxonomy_requests_type_valid check (public.is_valid_taxonomy_type(type)),
  constraint taxonomy_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'merged')
  )
);

create index if not exists idx_taxonomy_requests_status_created
  on public.taxonomy_requests(status, created_at desc);

create index if not exists idx_taxonomy_requests_requested_by
  on public.taxonomy_requests(requested_by);

create trigger taxonomy_requests_set_updated_at
before update on public.taxonomy_requests
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- story_format_templates
-- ---------------------------------------------------------------------------
create table if not exists public.story_format_templates (
  id uuid primary key default gen_random_uuid(),
  mode text not null,
  name text not null,
  description text,
  schema_json jsonb not null default '{}'::jsonb,
  example_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_default boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_format_templates_mode_name_unique unique (mode, name),
  constraint story_format_templates_mode_check check (
    mode in (
      'standard_prose',
      'chat_story',
      'social_feed',
      'case_file',
      'diary',
      'system_game',
      'script',
      'mixed_media'
    )
  )
);

create index if not exists idx_story_format_templates_mode
  on public.story_format_templates(mode, is_active, sort_order);

create trigger story_format_templates_set_updated_at
before update on public.story_format_templates
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- story_presentation_settings
-- ---------------------------------------------------------------------------
create table if not exists public.story_presentation_settings (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null unique references public.stories(id) on delete cascade,
  mode text not null default 'standard_prose',
  template_id uuid references public.story_format_templates(id) on delete set null,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint story_presentation_settings_mode_check check (
    mode in (
      'standard_prose',
      'chat_story',
      'social_feed',
      'case_file',
      'diary',
      'system_game',
      'script',
      'mixed_media'
    )
  )
);

create trigger story_presentation_settings_set_updated_at
before update on public.story_presentation_settings
for each row execute function public.set_updated_at();

-- Story: explicit content-warning acknowledgment for publish gate
alter table public.stories
  add column if not exists content_warnings_confirmed boolean not null default false;

comment on column public.stories.content_warnings_confirmed is
  'Creator confirmed content warning selection (required before publish when using taxonomy).';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.creator_owns_story(
  input_story_id uuid,
  input_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.stories s
    join public.creator_profiles cp on cp.id = s.creator_id
    where s.id = input_story_id
      and cp.user_id = input_user_id
  );
$$;

grant execute on function public.creator_owns_story(uuid, uuid) to authenticated;

create or replace function public.refresh_taxonomy_usage_counts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.taxonomy_terms t
  set usage_count = coalesce(x.cnt, 0)
  from (
    select term_id, count(*)::integer as cnt
    from public.story_taxonomy_terms
    group by term_id
  ) x
  where t.id = x.term_id;

  update public.taxonomy_terms t
  set usage_count = 0
  where not exists (
    select 1 from public.story_taxonomy_terms st where st.term_id = t.id
  )
  and t.usage_count <> 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.taxonomy_terms enable row level security;
alter table public.story_taxonomy_terms enable row level security;
alter table public.taxonomy_requests enable row level security;
alter table public.story_presentation_settings enable row level security;
alter table public.story_format_templates enable row level security;

-- taxonomy_terms: public read active+public; admin full CRUD
drop policy if exists "Public read active taxonomy terms" on public.taxonomy_terms;
create policy "Public read active taxonomy terms"
  on public.taxonomy_terms for select
  using (
    (is_active and is_public)
    or public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Admin manage taxonomy terms" on public.taxonomy_terms;
create policy "Admin manage taxonomy terms"
  on public.taxonomy_terms for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

-- story_taxonomy_terms
drop policy if exists "Read story taxonomy links" on public.story_taxonomy_terms;
create policy "Read story taxonomy links"
  on public.story_taxonomy_terms for select
  using (
    public.creator_owns_story(story_id, auth.uid())
    or exists (
      select 1 from public.stories s
      where s.id = story_taxonomy_terms.story_id
        and s.status in ('approved', 'published')
        and s.visibility = 'public'
    )
    or public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
  );

drop policy if exists "Creator manage own story taxonomy" on public.story_taxonomy_terms;
create policy "Creator manage own story taxonomy"
  on public.story_taxonomy_terms for insert
  with check (public.creator_owns_story(story_id, auth.uid()));

drop policy if exists "Creator update own story taxonomy" on public.story_taxonomy_terms;
create policy "Creator update own story taxonomy"
  on public.story_taxonomy_terms for delete
  using (public.creator_owns_story(story_id, auth.uid()));

drop policy if exists "Admin manage story taxonomy" on public.story_taxonomy_terms;
create policy "Admin manage story taxonomy"
  on public.story_taxonomy_terms for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

-- taxonomy_requests
drop policy if exists "Creator read own taxonomy requests" on public.taxonomy_requests;
create policy "Creator read own taxonomy requests"
  on public.taxonomy_requests for select
  using (
    requested_by = auth.uid()
    or public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.view')
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

drop policy if exists "Creator insert taxonomy requests" on public.taxonomy_requests;
create policy "Creator insert taxonomy requests"
  on public.taxonomy_requests for insert
  with check (
    requested_by = auth.uid()
    and auth.uid() is not null
  );

drop policy if exists "Admin update taxonomy requests" on public.taxonomy_requests;
create policy "Admin update taxonomy requests"
  on public.taxonomy_requests for update
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

-- story_presentation_settings
drop policy if exists "Read story presentation settings" on public.story_presentation_settings;
create policy "Read story presentation settings"
  on public.story_presentation_settings for select
  using (
    public.creator_owns_story(story_id, auth.uid())
    or exists (
      select 1 from public.stories s
      where s.id = story_presentation_settings.story_id
        and s.status in ('approved', 'published')
        and s.visibility = 'public'
    )
    or public.is_admin_or_founder(auth.uid())
  );

drop policy if exists "Creator manage presentation settings" on public.story_presentation_settings;
create policy "Creator manage presentation settings"
  on public.story_presentation_settings for all
  using (public.creator_owns_story(story_id, auth.uid()))
  with check (public.creator_owns_story(story_id, auth.uid()));

drop policy if exists "Admin manage presentation settings" on public.story_presentation_settings;
create policy "Admin manage presentation settings"
  on public.story_presentation_settings for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );

-- story_format_templates
drop policy if exists "Public read active format templates" on public.story_format_templates;
create policy "Public read active format templates"
  on public.story_format_templates for select
  using (is_active or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin manage format templates" on public.story_format_templates;
create policy "Admin manage format templates"
  on public.story_format_templates for all
  using (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  )
  with check (
    public.is_admin_or_founder(auth.uid())
    or public.user_has_permission(auth.uid(), 'admin.settings.update')
  );
