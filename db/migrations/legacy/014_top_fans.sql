create table public.fan_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  author_id uuid references public.creator_profiles(id) on delete cascade,
  score integer not null default 0,
  score_type text not null,
  last_calculated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fan_scores_scope_required check (num_nonnulls(story_id, author_id) = 1),
  constraint fan_scores_type_check check (score_type in ('story', 'author')),
  constraint fan_scores_score_non_negative check (score >= 0),
  constraint fan_scores_story_unique unique (user_id, story_id, score_type),
  constraint fan_scores_author_unique unique (user_id, author_id, score_type)
);

create table public.fan_score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  author_id uuid references public.creator_profiles(id) on delete cascade,
  score_type text not null,
  event_key text not null,
  dedupe_key text not null unique,
  points integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fan_score_events_scope_required check (num_nonnulls(story_id, author_id) = 1),
  constraint fan_score_events_type_check check (score_type in ('story', 'author')),
  constraint fan_score_events_points_non_negative check (points >= 0)
);

create trigger fan_scores_set_updated_at
before update on public.fan_scores
for each row execute function public.set_updated_at();

create index fan_scores_story_rank_idx
  on public.fan_scores(score_type, story_id, score desc, last_calculated_at asc);
create index fan_scores_author_rank_idx
  on public.fan_scores(score_type, author_id, score desc, last_calculated_at asc);
create index fan_scores_user_idx on public.fan_scores(user_id);
create index fan_score_events_user_idx on public.fan_score_events(user_id);
create index fan_score_events_story_idx on public.fan_score_events(story_id);
create index fan_score_events_author_idx on public.fan_score_events(author_id);
create index fan_score_events_created_at_idx on public.fan_score_events(created_at);

alter table public.fan_scores enable row level security;
alter table public.fan_score_events enable row level security;

create or replace function public.record_fan_score_event(
  input_user_id uuid,
  input_score_type text,
  input_event_key text,
  input_points integer,
  input_dedupe_key text,
  input_story_id uuid default null,
  input_author_id uuid default null,
  input_source_id uuid default null,
  input_metadata jsonb default '{}'::jsonb
)
returns table (
  awarded boolean,
  score integer,
  story_id uuid,
  author_id uuid,
  score_type text,
  last_calculated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_event_id uuid;
  fan_row public.fan_scores%rowtype;
begin
  if auth.uid() is distinct from input_user_id then
    raise exception 'not authorized';
  end if;

  if input_score_type not in ('story', 'author') then
    raise exception 'invalid score type';
  end if;

  if input_score_type = 'story' and input_story_id is null then
    raise exception 'story score requires a story id';
  end if;

  if input_score_type = 'author' and input_author_id is null then
    raise exception 'author score requires an author id';
  end if;

  insert into public.fan_score_events (
    user_id,
    story_id,
    author_id,
    score_type,
    event_key,
    dedupe_key,
    points,
    metadata
  )
  values (
    input_user_id,
    input_story_id,
    input_author_id,
    input_score_type,
    input_event_key,
    input_dedupe_key,
    greatest(input_points, 0),
    coalesce(input_metadata, '{}'::jsonb)
  )
  on conflict (dedupe_key) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    if input_score_type = 'story' then
      select * into fan_row
      from public.fan_scores
      where user_id = input_user_id
        and story_id = input_story_id
        and score_type = input_score_type
      limit 1;
    else
      select * into fan_row
      from public.fan_scores
      where user_id = input_user_id
        and author_id = input_author_id
        and score_type = input_score_type
      limit 1;
    end if;

    return query
      select
        false,
        coalesce(fan_row.score, 0),
        fan_row.story_id,
        fan_row.author_id,
        fan_row.score_type,
        fan_row.last_calculated_at;
    return;
  end if;

  if input_score_type = 'story' then
    insert into public.fan_scores (
      user_id,
      story_id,
      author_id,
      score,
      score_type,
      last_calculated_at,
      metadata
    )
    values (
      input_user_id,
      input_story_id,
      null,
      greatest(input_points, 0),
      input_score_type,
      now(),
      coalesce(input_metadata, '{}'::jsonb)
    )
    on conflict (user_id, story_id, score_type) do update
      set score = public.fan_scores.score + excluded.score,
          last_calculated_at = now(),
          metadata = public.fan_scores.metadata || excluded.metadata
    returning * into fan_row;
  else
    insert into public.fan_scores (
      user_id,
      story_id,
      author_id,
      score,
      score_type,
      last_calculated_at,
      metadata
    )
    values (
      input_user_id,
      null,
      input_author_id,
      greatest(input_points, 0),
      input_score_type,
      now(),
      coalesce(input_metadata, '{}'::jsonb)
    )
    on conflict (user_id, author_id, score_type) do update
      set score = public.fan_scores.score + excluded.score,
          last_calculated_at = now(),
          metadata = public.fan_scores.metadata || excluded.metadata
    returning * into fan_row;
  end if;

  return query
    select
      true,
      fan_row.score,
      fan_row.story_id,
      fan_row.author_id,
      fan_row.score_type,
      fan_row.last_calculated_at;
end;
$$;

create or replace function public.get_story_top_fans(
  input_story_id uuid,
  input_limit integer default 5,
  input_user_id uuid default null
)
returns table (
  rank integer,
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  score integer,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      fs.user_id,
      fs.score,
      fs.last_calculated_at,
      fs.created_at,
      row_number() over (
        order by fs.score desc, fs.last_calculated_at asc, fs.created_at asc, fs.user_id asc
      ) as fan_rank
    from public.fan_scores fs
    where fs.score_type = 'story'
      and fs.story_id = input_story_id
      and fs.score > 0
  )
  select
    ranked.fan_rank as rank,
    ranked.user_id,
    coalesce(p.display_name, p.username) as display_name,
    p.username,
    p.avatar_url,
    ranked.score,
    (input_user_id is not null and ranked.user_id = input_user_id) as is_current_user
  from ranked
  join public.profiles p on p.id = ranked.user_id
  where ranked.fan_rank <= greatest(input_limit, 0)
  order by ranked.fan_rank asc;
$$;

create or replace function public.get_author_top_fans(
  input_author_id uuid,
  input_limit integer default 5,
  input_user_id uuid default null
)
returns table (
  rank integer,
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  score integer,
  is_current_user boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with ranked as (
    select
      fs.user_id,
      fs.score,
      fs.last_calculated_at,
      fs.created_at,
      row_number() over (
        order by fs.score desc, fs.last_calculated_at asc, fs.created_at asc, fs.user_id asc
      ) as fan_rank
    from public.fan_scores fs
    where fs.score_type = 'author'
      and fs.author_id = input_author_id
      and fs.score > 0
  )
  select
    ranked.fan_rank as rank,
    ranked.user_id,
    coalesce(p.display_name, p.username) as display_name,
    p.username,
    p.avatar_url,
    ranked.score,
    (input_user_id is not null and ranked.user_id = input_user_id) as is_current_user
  from ranked
  join public.profiles p on p.id = ranked.user_id
  where ranked.fan_rank <= greatest(input_limit, 0)
  order by ranked.fan_rank asc;
$$;

create or replace function public.get_user_top_fan_highlights(
  input_user_id uuid,
  input_limit integer default 5
)
returns table (
  id text,
  rank integer,
  score integer,
  kind text,
  title text,
  subtitle text,
  href text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from input_user_id then
    raise exception 'not authorized';
  end if;

  return query
    with story_ranked as (
      select
        fs.story_id as scope_id,
        fs.user_id,
        fs.score,
        row_number() over (
          partition by fs.story_id
          order by fs.score desc, fs.last_calculated_at asc, fs.created_at asc, fs.user_id asc
        ) as fan_rank
      from public.fan_scores fs
      where fs.score_type = 'story'
        and fs.score > 0
    ),
    author_ranked as (
      select
        fs.author_id as scope_id,
        fs.user_id,
        fs.score,
        row_number() over (
          partition by fs.author_id
          order by fs.score desc, fs.last_calculated_at asc, fs.created_at asc, fs.user_id asc
        ) as fan_rank
      from public.fan_scores fs
      where fs.score_type = 'author'
        and fs.score > 0
    )
    select
      concat('story:', s.id) as id,
      sr.fan_rank as rank,
      sr.score,
      'story' as kind,
      concat('Top Fan của ', s.title) as title,
      concat('Tác giả: ', coalesce(c.pen_name, 'ChapChap creator')) as subtitle,
      concat('/stories/', s.slug) as href
    from story_ranked sr
    join public.stories s on s.id = sr.scope_id
    left join public.creator_profiles c on c.id = s.creator_id
    where sr.user_id = input_user_id
      and sr.fan_rank <= greatest(input_limit, 0)

    union all

    select
      concat('author:', c.id) as id,
      ar.fan_rank as rank,
      ar.score,
      'author' as kind,
      concat('Top Fan của tác giả ', c.pen_name) as title,
      'Danh hiệu tác giả' as subtitle,
      concat('/creators/', c.id) as href
    from author_ranked ar
    join public.creator_profiles c on c.id = ar.scope_id
    where ar.user_id = input_user_id
      and ar.fan_rank <= greatest(input_limit, 0)
    order by rank asc, score desc;
end;
$$;
