-- Anti report abuse: reporter quality, report_block restriction

-- ---------------------------------------------------------------------------
-- report_block restriction type
-- ---------------------------------------------------------------------------
alter table public.account_restrictions
  drop constraint if exists account_restrictions_type_check;

alter table public.account_restrictions
  add constraint account_restrictions_type_check check (
    restriction_type in (
      'comment_block', 'post_block', 'story_publish_block',
      'creator_monetization_hold', 'payout_hold', 'recommendation_limited',
      'account_suspended', 'account_banned', 'report_block'
    )
  );

-- ---------------------------------------------------------------------------
-- Reporter quality tracking
-- ---------------------------------------------------------------------------
create table if not exists public.reporter_quality (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  trust_score int not null default 50,
  reports_submitted int not null default 0,
  reports_valid int not null default 0,
  reports_rejected int not null default 0,
  reports_abuse int not null default 0,
  spam_suspected boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reporter_quality_trust_range check (trust_score between 0 and 100)
);

create trigger reporter_quality_set_updated_at
before update on public.reporter_quality
for each row execute function public.set_updated_at();

create index if not exists idx_reporter_quality_spam
  on public.reporter_quality(spam_suspected)
  where spam_suspected = true;

create index if not exists idx_reporter_quality_trust
  on public.reporter_quality(trust_score);

alter table public.reporter_quality enable row level security;

drop policy if exists "Users read own reporter quality" on public.reporter_quality;
create policy "Users read own reporter quality"
  on public.reporter_quality for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_permission(auth.uid(), 'report.review')
  );

drop policy if exists "System upsert reporter quality" on public.reporter_quality;
create policy "System upsert reporter quality"
  on public.reporter_quality for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update own reporter quality insert" on public.reporter_quality;
create policy "Users update own reporter quality on insert"
  on public.reporter_quality for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Staff manage reporter quality" on public.reporter_quality;
create policy "Staff manage reporter quality"
  on public.reporter_quality for all
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'))
  with check (public.user_has_permission(auth.uid(), 'report.review'));

-- Staff/service updates via security definer RPCs below

create or replace function public.ensure_reporter_quality_row(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.reporter_quality (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.ensure_reporter_quality_row(uuid) to authenticated;

create or replace function public.increment_reporter_submitted(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_reporter_quality_row(p_user_id);
  update public.reporter_quality
  set reports_submitted = reports_submitted + 1,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

grant execute on function public.increment_reporter_submitted(uuid) to authenticated;

create or replace function public.apply_reporter_outcome(
  p_reporter_id uuid,
  p_outcome text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.reporter_quality%rowtype;
  v_trust int;
  v_submitted int;
  v_rejected int;
begin
  perform public.ensure_reporter_quality_row(p_reporter_id);

  if p_outcome = 'valid' then
    update public.reporter_quality
    set reports_valid = reports_valid + 1,
        trust_score = least(100, trust_score + 3),
        updated_at = now()
    where user_id = p_reporter_id;
  elsif p_outcome = 'no_violation' then
    update public.reporter_quality
    set reports_rejected = reports_rejected + 1,
        trust_score = greatest(0, trust_score - 2),
        updated_at = now()
    where user_id = p_reporter_id;
  elsif p_outcome = 'abuse' then
    update public.reporter_quality
    set reports_abuse = reports_abuse + 1,
        reports_rejected = reports_rejected + 1,
        trust_score = greatest(0, trust_score - 10),
        updated_at = now()
    where user_id = p_reporter_id;
  else
    return;
  end if;

  select * into v_row from public.reporter_quality where user_id = p_reporter_id;
  v_submitted := greatest(v_row.reports_submitted, 1);
  v_rejected := v_row.reports_rejected + v_row.reports_abuse;

  if v_row.reports_abuse >= 2
     or (v_row.reports_submitted >= 8 and (v_rejected::float / v_submitted) > 0.65) then
    update public.reporter_quality
    set spam_suspected = true, updated_at = now()
    where user_id = p_reporter_id;
  end if;
end;
$$;

grant execute on function public.apply_reporter_outcome(uuid, text) to authenticated;

-- Allow authenticated users to record their own rate-limit events (reports, comments, …)
drop policy if exists "Rate limit events are private" on public.rate_limit_events;

drop policy if exists "Users insert own rate limit events" on public.rate_limit_events;
create policy "Users insert own rate limit events"
  on public.rate_limit_events for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users read own rate limit events" on public.rate_limit_events;
create policy "Users read own rate limit events"
  on public.rate_limit_events for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Staff read all rate limit events" on public.rate_limit_events;
create policy "Staff read all rate limit events"
  on public.rate_limit_events for select
  to authenticated
  using (public.user_has_permission(auth.uid(), 'report.review'));
