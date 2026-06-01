-- Migration 158: Numeric public_code URL system (idempotent)

create or replace function public.generate_numeric_public_code(len int default 10)
returns text
language plpgsql
as $$
declare
  result text;
  i int;
begin
  if len < 8 or len > 12 then
    raise exception 'public_code length must be between 8 and 12';
  end if;

  result := (floor(random() * 9) + 1)::int::text;
  for i in 2..len loop
    result := result || floor(random() * 10)::int::text;
  end loop;

  return result;
end;
$$;

alter table public.stories
  add column if not exists public_code text,
  add column if not exists slug_updated_at timestamptz,
  add column if not exists title_updated_at timestamptz;

alter table public.episodes
  add column if not exists public_code text,
  add column if not exists slug text,
  add column if not exists canonical_path text,
  add column if not exists slug_updated_at timestamptz,
  add column if not exists title_updated_at timestamptz;

alter table public.reels_items
  add column if not exists public_code text,
  add column if not exists slug text,
  add column if not exists canonical_path text,
  add column if not exists slug_updated_at timestamptz;

alter table public.admin_content_posts
  add column if not exists public_code text,
  add column if not exists canonical_path text,
  add column if not exists slug_updated_at timestamptz;

alter table public.platform_announcements
  add column if not exists public_code text,
  add column if not exists slug_updated_at timestamptz;

create table if not exists public.url_redirects (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,
  target_path text not null,
  entity_type text,
  entity_id uuid,
  status_code integer not null default 301,
  is_active boolean not null default true,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint url_redirects_source_target_diff check (source_path <> target_path),
  constraint url_redirects_status_code_check check (status_code in (301, 302, 307, 308))
);

create unique index if not exists url_redirects_active_source_path_uidx
  on public.url_redirects (source_path)
  where is_active = true;

create index if not exists url_redirects_target_path_idx on public.url_redirects (target_path);
create index if not exists url_redirects_entity_idx on public.url_redirects (entity_type, entity_id);

create table if not exists public.entity_slug_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  old_slug text,
  new_slug text,
  old_path text,
  new_path text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists entity_slug_history_entity_idx
  on public.entity_slug_history (entity_type, entity_id);
create index if not exists entity_slug_history_changed_at_idx
  on public.entity_slug_history (changed_at desc);

do $$
declare
  r record;
  code text;
  attempts int;
begin
  for r in select id from public.stories where public_code is null loop
    attempts := 0;
    loop
      code := public.generate_numeric_public_code(10);
      exit when not exists (select 1 from public.stories where public_code = code);
      attempts := attempts + 1;
      if attempts >= 20 then
        raise exception 'Failed to backfill stories.public_code for %', r.id;
      end if;
    end loop;
    update public.stories set public_code = code where id = r.id;
  end loop;
end;
$$;

do $$
declare
  r record;
  code text;
  attempts int;
  base_slug text;
begin
  for r in
    select e.id, e.title, e.episode_number, e.public_code, e.slug
    from public.episodes e
    where e.public_code is null or e.slug is null or e.slug = ''
  loop
    base_slug := lower(regexp_replace(
      translate(
        r.title,
        'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
      ),
      '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' or base_slug is null then
      base_slug := 'chuong-' || r.episode_number::text;
    end if;
    base_slug := left(base_slug, 80);

    if r.public_code is null then
      attempts := 0;
      loop
        code := public.generate_numeric_public_code(10);
        exit when not exists (select 1 from public.episodes where public_code = code);
        attempts := attempts + 1;
        if attempts >= 20 then
          raise exception 'Failed to backfill episodes.public_code for %', r.id;
        end if;
      end loop;
    else
      code := r.public_code;
    end if;

    update public.episodes
    set
      public_code = coalesce(public_code, code),
      slug = coalesce(nullif(slug, ''), base_slug)
    where id = r.id;
  end loop;
end;
$$;

do $$
declare
  r record;
  code text;
  attempts int;
  base_slug text;
begin
  for r in
    select id, coalesce(nullif(trim(title), ''), nullif(trim(hook), ''), 'reel-' || left(id::text, 8)) as label
    from public.reels_items
    where public_code is null
  loop
    attempts := 0;
    loop
      code := public.generate_numeric_public_code(10);
      exit when not exists (select 1 from public.reels_items where public_code = code);
      attempts := attempts + 1;
      if attempts >= 20 then
        raise exception 'Failed to backfill reels_items.public_code';
      end if;
    end loop;

    base_slug := lower(regexp_replace(
      translate(
        r.label,
        'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
      ),
      '[^a-z0-9]+', '-', 'g'
    ));
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    if base_slug = '' then
      base_slug := 'reel-' || code;
    end if;
    base_slug := left(base_slug, 80);

    update public.reels_items
    set public_code = code, slug = coalesce(nullif(slug, ''), base_slug)
    where id = r.id;
  end loop;
end;
$$;

do $$
declare
  r record;
  code text;
  attempts int;
begin
  for r in select id from public.admin_content_posts where public_code is null loop
    attempts := 0;
    loop
      code := public.generate_numeric_public_code(10);
      exit when not exists (select 1 from public.admin_content_posts where public_code = code);
      attempts := attempts + 1;
      if attempts >= 20 then
        raise exception 'Failed to backfill admin_content_posts.public_code';
      end if;
    end loop;
    update public.admin_content_posts set public_code = code where id = r.id;
  end loop;
end;
$$;

do $$
declare
  r record;
  code text;
  attempts int;
begin
  for r in
    select id from public.platform_announcements
    where public_code is null
      and visibility = 'public'
      and status in ('published', 'scheduled')
  loop
    attempts := 0;
    loop
      code := public.generate_numeric_public_code(10);
      exit when not exists (select 1 from public.platform_announcements where public_code = code);
      attempts := attempts + 1;
      if attempts >= 20 then
        raise exception 'Failed to backfill platform_announcements.public_code';
      end if;
    end loop;
    update public.platform_announcements set public_code = code where id = r.id;
  end loop;
end;
$$;

do $$
begin
  if exists (select 1 from public.stories where public_code is null) then
    raise exception 'stories.public_code still null after backfill';
  end if;
  if exists (select 1 from public.episodes where public_code is null or slug is null or slug = '') then
    raise exception 'episodes.public_code/slug still null after backfill';
  end if;
  if exists (select 1 from public.reels_items where public_code is null or slug is null or slug = '') then
    raise exception 'reels_items.public_code/slug still null after backfill';
  end if;
  if exists (select 1 from public.admin_content_posts where public_code is null) then
    raise exception 'admin_content_posts.public_code still null after backfill';
  end if;
end;
$$;

alter table public.stories alter column public_code set not null;
create unique index if not exists stories_public_code_uidx on public.stories (public_code);

alter table public.episodes alter column public_code set not null;
alter table public.episodes alter column slug set not null;
create unique index if not exists episodes_public_code_uidx on public.episodes (public_code);

alter table public.reels_items alter column public_code set not null;
alter table public.reels_items alter column slug set not null;
create unique index if not exists reels_items_public_code_uidx on public.reels_items (public_code);

alter table public.admin_content_posts alter column public_code set not null;
create unique index if not exists admin_content_posts_public_code_uidx on public.admin_content_posts (public_code);

create unique index if not exists platform_announcements_public_code_uidx
  on public.platform_announcements (public_code)
  where public_code is not null;

alter table public.stories drop constraint if exists stories_public_code_numeric_check;
alter table public.stories
  add constraint stories_public_code_numeric_check
  check (public_code ~ '^[0-9]{8,12}$');

alter table public.episodes drop constraint if exists episodes_public_code_numeric_check;
alter table public.episodes
  add constraint episodes_public_code_numeric_check
  check (public_code ~ '^[0-9]{8,12}$');

alter table public.reels_items drop constraint if exists reels_items_public_code_numeric_check;
alter table public.reels_items
  add constraint reels_items_public_code_numeric_check
  check (public_code ~ '^[0-9]{8,12}$');

alter table public.admin_content_posts drop constraint if exists admin_content_posts_public_code_numeric_check;
alter table public.admin_content_posts
  add constraint admin_content_posts_public_code_numeric_check
  check (public_code ~ '^[0-9]{8,12}$');

alter table public.platform_announcements drop constraint if exists platform_announcements_public_code_numeric_check;
alter table public.platform_announcements
  add constraint platform_announcements_public_code_numeric_check
  check (public_code is null or public_code ~ '^[0-9]{8,12}$');

alter table public.url_redirects enable row level security;
alter table public.entity_slug_history enable row level security;

drop policy if exists "Public read active url redirects" on public.url_redirects;
create policy "Public read active url redirects"
on public.url_redirects
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Staff manage url redirects" on public.url_redirects;
create policy "Staff manage url redirects"
on public.url_redirects
for all
to authenticated
using (public.user_has_permission(auth.uid(), 'seo.rule.update'))
with check (public.user_has_permission(auth.uid(), 'seo.rule.update'));

drop policy if exists "Staff read slug history" on public.entity_slug_history;
create policy "Staff read slug history"
on public.entity_slug_history
for select
to authenticated
using (
  public.user_has_permission(auth.uid(), 'seo.rule.view')
  or public.user_has_permission(auth.uid(), 'seo.audit.view')
  or public.user_has_permission(auth.uid(), 'admin.dashboard.view')
);

drop policy if exists "Staff insert slug history" on public.entity_slug_history;
create policy "Staff insert slug history"
on public.entity_slug_history
for insert
to authenticated
with check (public.user_has_permission(auth.uid(), 'seo.rule.update'));

drop trigger if exists url_redirects_set_updated_at on public.url_redirects;
create trigger url_redirects_set_updated_at
before update on public.url_redirects
for each row execute function public.set_updated_at();
