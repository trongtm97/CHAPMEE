alter type public.report_status rename value 'open' to 'pending';
alter type public.report_status add value if not exists 'reviewed';

alter table public.stories
  add column if not exists moderation_status public.moderation_case_status not null default 'open';

alter table public.episodes
  add column if not exists moderation_status public.moderation_case_status not null default 'open';

alter table public.comments
  add column if not exists moderation_status public.moderation_case_status not null default 'open';

alter table public.stories
  add column if not exists ai_spam_suspected boolean,
  add column if not exists quality_score numeric,
  add column if not exists moderation_flags jsonb not null default '{}'::jsonb;

alter table public.episodes
  add column if not exists ai_spam_suspected boolean,
  add column if not exists quality_score numeric,
  add column if not exists moderation_flags jsonb not null default '{}'::jsonb;

alter table public.comments
  add column if not exists ai_spam_suspected boolean,
  add column if not exists quality_score numeric,
  add column if not exists moderation_flags jsonb not null default '{}'::jsonb;

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  limit_key text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_user_key_created_idx
  on public.rate_limit_events(user_id, limit_key, created_at desc);

alter table public.rate_limit_events enable row level security;

create policy "Rate limit events are private"
  on public.rate_limit_events for all
  using (public.current_profile_role() in ('admin', 'moderator'))
  with check (public.current_profile_role() in ('admin', 'moderator'));

create or replace function public.report_is_duplicate(
  input_reporter_id uuid,
  input_target_type text,
  input_target_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.reports
    where reporter_id = input_reporter_id
      and target_type = input_target_type
      and target_id = input_target_id
      and status = 'pending'
  );
$$;

create or replace function public.get_moderation_queue()
returns table (
  id uuid,
  target_type text,
  target_id uuid,
  reason text,
  report_count bigint,
  preview text,
  status public.report_status,
  created_at timestamptz,
  moderation_status public.moderation_case_status
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    r.target_type,
    r.target_id,
    r.reason,
    count(*) over (partition by r.target_type, r.target_id) as report_count,
    coalesce(s.title, e.title, c.content, u.display_name, r.details) as preview,
    r.status,
    r.created_at,
    coalesce(s.moderation_status, e.moderation_status, c.moderation_status, 'open'::public.moderation_case_status) as moderation_status
  from public.reports r
  left join public.stories s on r.target_type = 'story' and s.id = r.target_id
  left join public.episodes e on r.target_type = 'chapter' and e.id = r.target_id
  left join public.comments c on r.target_type = 'comment' and c.id = r.target_id
  left join public.profiles u on r.target_type = 'user' and u.id = r.target_id
  where r.status = 'pending'
  order by r.created_at desc;
$$;

create or replace function public.flag_content_if_reported(
  input_target_type text,
  input_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_count integer;
begin
  select count(*) into report_count
  from public.reports
  where target_type = input_target_type
    and target_id = input_target_id
    and status = 'pending';

  if report_count >= 3 then
    if input_target_type = 'story' then
      update public.stories set moderation_status = 'flagged' where id = input_target_id;
    elsif input_target_type = 'chapter' then
      update public.episodes set moderation_status = 'flagged' where id = input_target_id;
    elsif input_target_type = 'comment' then
      update public.comments set moderation_status = 'flagged' where id = input_target_id;
    end if;
  end if;
end;
$$;
