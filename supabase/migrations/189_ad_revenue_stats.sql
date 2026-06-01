-- Migration 189: Ad revenue estimate aggregates (internal, not payout)

create table if not exists public.ad_revenue_estimate_settings (
  id uuid primary key default '11111111-1111-1111-1111-111111111111'::uuid,
  default_rpm_vnd numeric not null default 5000,
  creator_pool_percent numeric not null default 30,
  reserve_percent numeric not null default 15,
  reserve_hold_days int not null default 60,
  min_payout_vnd numeric not null default 200000,
  is_creator_ads_revenue_enabled boolean not null default false,
  is_estimate_visible_to_creators boolean not null default false,
  notes text,
  updated_at timestamptz not null default now(),
  constraint ad_revenue_estimate_settings_singleton check (id = '11111111-1111-1111-1111-111111111111'::uuid),
  constraint ad_revenue_estimate_settings_percent_range check (
    creator_pool_percent >= 0 and creator_pool_percent <= 100
    and reserve_percent >= 0 and reserve_percent <= 100
  )
);

insert into public.ad_revenue_estimate_settings (id)
values ('11111111-1111-1111-1111-111111111111'::uuid)
on conflict (id) do nothing;

create table if not exists public.ad_daily_author_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  placement_key text,
  surface text,
  device text,
  rendered_impressions int not null default 0,
  estimated_pageviews int not null default 0,
  estimated_reads int not null default 0,
  estimated_revenue_vnd numeric not null default 0,
  invalid_adjustment_vnd numeric not null default 0,
  net_estimated_revenue_vnd numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ad_daily_author_stats_unique_idx
  on public.ad_daily_author_stats (
    stat_date,
    author_id,
    coalesce(story_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(placement_key, ''),
    coalesce(device, '')
  );

create index if not exists idx_ad_daily_author_stats_date on public.ad_daily_author_stats(stat_date desc);
create index if not exists idx_ad_daily_author_stats_author on public.ad_daily_author_stats(author_id, stat_date desc);

create table if not exists public.ad_monthly_author_stats (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rendered_impressions int not null default 0,
  estimated_pageviews int not null default 0,
  estimated_reads int not null default 0,
  estimated_gross_revenue_vnd numeric not null default 0,
  invalid_adjustment_vnd numeric not null default 0,
  reserve_hold_vnd numeric not null default 0,
  estimated_payable_vnd numeric not null default 0,
  status text not null default 'estimate',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_monthly_author_stats_month_format check (month ~ '^\d{4}-\d{2}$'),
  constraint ad_monthly_author_stats_status_check check (
    status in ('estimate', 'locked', 'reconciled', 'adjusted')
  ),
  unique (month, author_id)
);

create index if not exists idx_ad_monthly_author_stats_month on public.ad_monthly_author_stats(month desc);

create or replace function public.touch_ad_revenue_stats_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_ad_daily_author_stats_updated_at on public.ad_daily_author_stats;
create trigger trg_touch_ad_daily_author_stats_updated_at
before update on public.ad_daily_author_stats
for each row execute function public.touch_ad_revenue_stats_updated_at();

drop trigger if exists trg_touch_ad_monthly_author_stats_updated_at on public.ad_monthly_author_stats;
create trigger trg_touch_ad_monthly_author_stats_updated_at
before update on public.ad_monthly_author_stats
for each row execute function public.touch_ad_revenue_stats_updated_at();

drop trigger if exists trg_touch_ad_revenue_estimate_settings_updated_at on public.ad_revenue_estimate_settings;
create trigger trg_touch_ad_revenue_estimate_settings_updated_at
before update on public.ad_revenue_estimate_settings
for each row execute function public.touch_ad_revenue_stats_updated_at();

alter table public.ad_revenue_estimate_settings enable row level security;
alter table public.ad_daily_author_stats enable row level security;
alter table public.ad_monthly_author_stats enable row level security;

drop policy if exists "Admin founder read ad revenue settings" on public.ad_revenue_estimate_settings;
create policy "Admin founder read ad revenue settings"
  on public.ad_revenue_estimate_settings for select
  using (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder update ad revenue settings" on public.ad_revenue_estimate_settings;
create policy "Admin founder update ad revenue settings"
  on public.ad_revenue_estimate_settings for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Creators read ad revenue settings when visible" on public.ad_revenue_estimate_settings;
create policy "Creators read ad revenue settings when visible"
  on public.ad_revenue_estimate_settings for select
  using (
    is_estimate_visible_to_creators = true
    and auth.uid() is not null
  );

drop policy if exists "Admin founder manage ad daily stats" on public.ad_daily_author_stats;
create policy "Admin founder manage ad daily stats"
  on public.ad_daily_author_stats for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Authors read own ad daily stats" on public.ad_daily_author_stats;
create policy "Authors read own ad daily stats"
  on public.ad_daily_author_stats for select
  using (
    author_id = auth.uid()
    and exists (
      select 1 from public.ad_revenue_estimate_settings s
      where s.is_estimate_visible_to_creators = true
    )
  );

drop policy if exists "Admin founder manage ad monthly stats" on public.ad_monthly_author_stats;
create policy "Admin founder manage ad monthly stats"
  on public.ad_monthly_author_stats for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));

drop policy if exists "Authors read own ad monthly stats" on public.ad_monthly_author_stats;
create policy "Authors read own ad monthly stats"
  on public.ad_monthly_author_stats for select
  using (
    author_id = auth.uid()
    and exists (
      select 1 from public.ad_revenue_estimate_settings s
      where s.is_estimate_visible_to_creators = true
    )
  );

create or replace function public.rebuild_ad_daily_stats(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rpm numeric;
  v_rows int;
begin
  if p_from is null or p_to is null or p_from > p_to then
    return jsonb_build_object('ok', false, 'error', 'invalid_date_range');
  end if;

  select default_rpm_vnd into v_rpm
  from public.ad_revenue_estimate_settings
  where id = '11111111-1111-1111-1111-111111111111'::uuid;

  v_rpm := coalesce(v_rpm, 5000);

  delete from public.ad_daily_author_stats
  where stat_date >= p_from and stat_date <= p_to;

  insert into public.ad_daily_author_stats (
    stat_date,
    author_id,
    story_id,
    chapter_id,
    placement_key,
    surface,
    device,
    rendered_impressions,
    estimated_pageviews,
    estimated_reads,
    estimated_revenue_vnd,
    invalid_adjustment_vnd,
    net_estimated_revenue_vnd
  )
  select
    (e.created_at at time zone 'Asia/Ho_Chi_Minh')::date as stat_date,
    cp.user_id as author_id,
    coalesce(e.story_id, ep.story_id) as story_id,
    e.chapter_id,
    p.placement_key,
    p.surface,
    coalesce(nullif(trim(e.device), ''), 'unknown') as device,
    count(*) filter (where e.event_type = 'rendered')::int as rendered_impressions,
    count(*) filter (where e.event_type = 'impression_attempt')::int as estimated_pageviews,
    count(distinct e.session_id) filter (
      where e.event_type = 'rendered' and e.session_id is not null
    )::int as estimated_reads,
    0::numeric,
    0::numeric,
    0::numeric
  from public.ad_render_events e
  left join public.ad_placements p on p.id = e.placement_id
  left join public.episodes ep on ep.id = e.chapter_id
  left join public.stories s on s.id = coalesce(e.story_id, ep.story_id)
  left join public.creator_profiles cp on cp.id = s.creator_id
  where (e.created_at at time zone 'Asia/Ho_Chi_Minh')::date >= p_from
    and (e.created_at at time zone 'Asia/Ho_Chi_Minh')::date <= p_to
    and e.event_type in ('rendered', 'impression_attempt')
    and cp.user_id is not null
  group by 1, 2, 3, 4, 5, 6, 7;

  get diagnostics v_rows = row_count;

  update public.ad_daily_author_stats d
  set
    estimated_revenue_vnd = (d.rendered_impressions::numeric / 1000.0) * v_rpm,
    net_estimated_revenue_vnd =
      (d.rendered_impressions::numeric / 1000.0) * v_rpm - d.invalid_adjustment_vnd
  where d.stat_date >= p_from and d.stat_date <= p_to;

  return jsonb_build_object('ok', true, 'daily_rows', v_rows);
end;
$$;

create or replace function public.rebuild_ad_monthly_stats(p_from date, p_to date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool numeric;
  v_reserve numeric;
  v_rows int;
begin
  select creator_pool_percent, reserve_percent
  into v_pool, v_reserve
  from public.ad_revenue_estimate_settings
  where id = '11111111-1111-1111-1111-111111111111'::uuid;

  v_pool := coalesce(v_pool, 30);
  v_reserve := coalesce(v_reserve, 15);

  insert into public.ad_monthly_author_stats (
    month,
    author_id,
    rendered_impressions,
    estimated_pageviews,
    estimated_reads,
    estimated_gross_revenue_vnd,
    invalid_adjustment_vnd,
    reserve_hold_vnd,
    estimated_payable_vnd,
    status
  )
  select
    to_char(d.stat_date, 'YYYY-MM') as month,
    d.author_id,
    sum(d.rendered_impressions)::int,
    sum(d.estimated_pageviews)::int,
    sum(d.estimated_reads)::int,
    sum(d.estimated_revenue_vnd) as estimated_gross_revenue_vnd,
    sum(d.invalid_adjustment_vnd) as invalid_adjustment_vnd,
    0::numeric as reserve_hold_vnd,
    0::numeric as estimated_payable_vnd,
    'estimate' as status
  from public.ad_daily_author_stats d
  where d.stat_date >= p_from and d.stat_date <= p_to
  group by 1, 2
  on conflict (month, author_id) do update set
    rendered_impressions = excluded.rendered_impressions,
    estimated_pageviews = excluded.estimated_pageviews,
    estimated_reads = excluded.estimated_reads,
    estimated_gross_revenue_vnd = excluded.estimated_gross_revenue_vnd,
    invalid_adjustment_vnd = excluded.invalid_adjustment_vnd,
    updated_at = now();

  get diagnostics v_rows = row_count;

  update public.ad_monthly_author_stats m
  set
    reserve_hold_vnd = (m.estimated_gross_revenue_vnd * (v_pool / 100.0)) * (v_reserve / 100.0),
    estimated_payable_vnd =
      (m.estimated_gross_revenue_vnd * (v_pool / 100.0)) * (1.0 - (v_reserve / 100.0))
  where m.month >= to_char(p_from, 'YYYY-MM')
    and m.month <= to_char(p_to, 'YYYY-MM');

  return jsonb_build_object('ok', true, 'monthly_upserts', v_rows);
end;
$$;

grant execute on function public.rebuild_ad_daily_stats(date, date) to authenticated;
grant execute on function public.rebuild_ad_monthly_stats(date, date) to authenticated;
