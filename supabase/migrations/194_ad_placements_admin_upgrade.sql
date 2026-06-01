-- Migration 194: Ad placements admin upgrade + daily stats aggregate

alter table public.ad_placements
  add column if not exists position text not null default 'bottom',
  add column if not exists priority int not null default 100,
  add column if not exists max_width int,
  add column if not exists min_height int,
  add column if not exists show_label boolean not null default true,
  add column if not exists lazy_load boolean not null default true,
  add column if not exists reserve_space boolean not null default true,
  add column if not exists sticky_allowed boolean not null default false,
  add column if not exists hide_for_vip boolean not null default false,
  add column if not exists hide_for_owner boolean not null default true,
  add column if not exists hide_on_sensitive_content boolean not null default true,
  add column if not exists no_ads_respect boolean not null default true,
  add column if not exists min_paragraphs_before int not null default 0,
  add column if not exists min_paragraphs_after int not null default 0,
  add column if not exists max_ads_per_chapter int not null default 2,
  add column if not exists min_distance_px int not null default 800,
  add column if not exists feed_cooldown_items int,
  add column if not exists full_width_responsive boolean not null default true,
  add column if not exists fallback_text text,
  add column if not exists revenue_eligible boolean not null default false,
  add column if not exists attribution_mode text not null default 'platform_only',
  add column if not exists revenue_bucket text not null default 'platform_ads',
  add column if not exists internal_note text,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.ad_placements drop constraint if exists ad_placements_device_check;
alter table public.ad_placements
  add constraint ad_placements_device_check
  check (device in ('all', 'mobile', 'desktop', 'tablet'));

alter table public.ad_placements drop constraint if exists ad_placements_position_check;
alter table public.ad_placements
  add constraint ad_placements_position_check
  check (position in (
    'top', 'mid_content', 'bottom', 'sidebar',
    'between_items', 'after_section', 'before_comments'
  ));

alter table public.ad_placements drop constraint if exists ad_placements_attribution_mode_check;
alter table public.ad_placements
  add constraint ad_placements_attribution_mode_check
  check (attribution_mode in ('page_owner_author', 'platform_only', 'mixed'));

alter table public.ad_placements drop constraint if exists ad_placements_revenue_bucket_check;
alter table public.ad_placements
  add constraint ad_placements_revenue_bucket_check
  check (revenue_bucket in (
    'reader_ads', 'content_hub_ads', 'discovery_ads', 'reels_ads', 'platform_ads'
  ));

create index if not exists idx_ad_placements_archived on public.ad_placements(archived_at)
  where archived_at is null;

create table if not exists public.ad_daily_stats (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null,
  stat_date date not null,
  surface text,
  device text,
  renders int not null default 0,
  impressions int not null default 0,
  clicks int not null default 0,
  estimated_revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (placement_key, stat_date, device)
);

create index if not exists idx_ad_daily_stats_date on public.ad_daily_stats(stat_date desc);
create index if not exists idx_ad_daily_stats_placement on public.ad_daily_stats(placement_key);

create or replace function public.touch_ad_daily_stats_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_ad_daily_stats_updated_at on public.ad_daily_stats;
create trigger trg_touch_ad_daily_stats_updated_at
before update on public.ad_daily_stats
for each row execute function public.touch_ad_daily_stats_updated_at();

alter table public.ad_daily_stats enable row level security;

drop policy if exists "Admin read ad daily stats" on public.ad_daily_stats;
create policy "Admin read ad daily stats"
  on public.ad_daily_stats for select
  using (public.is_admin_or_founder(auth.uid()));

-- Backfill position from placement_key patterns
update public.ad_placements set position = 'top' where position = 'bottom' and placement_key like '%_top_%';
update public.ad_placements set position = 'mid_content' where placement_key like '%mid%';
update public.ad_placements set position = 'sidebar' where placement_key like '%sidebar%';
update public.ad_placements set position = 'between_items' where placement_key like '%between%';
update public.ad_placements set position = 'after_section' where placement_key like '%discover%' or placement_key like '%ranking%';

update public.ad_placements set revenue_bucket = 'reader_ads' where surface = 'chapter_reader';
update public.ad_placements set revenue_bucket = 'discovery_ads' where surface in ('discover', 'ranking', 'search');
update public.ad_placements set revenue_bucket = 'content_hub_ads' where surface = 'content_hub';
update public.ad_placements set revenue_bucket = 'reels_ads' where surface = 'reels';

insert into public.ad_placements (
  placement_key, name, description, surface, page_pattern, device, position,
  ad_format, size_mode, width, height, is_enabled, is_test_mode, max_per_page,
  min_content_gap, min_paragraphs_before, min_distance_px, priority
)
values
  (
    'discover_between_sections_mobile',
    'Giữa các cụm Khám phá (mobile)',
    'Chèn sau mỗi cụm đề xuất trên Khám phá.',
    'discover', '/discover', 'mobile', 'after_section',
    'in_feed', 'responsive', null, null, false, true, 1, 0, 0, 900, 110
  )
on conflict (placement_key) do nothing;
