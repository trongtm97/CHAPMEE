-- Migration 188: Ad placements & render events (admin-controlled monetization)

create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  placement_key text unique not null,
  name text not null,
  description text,
  surface text not null,
  page_pattern text,
  device text not null default 'all',
  ad_format text not null,
  size_mode text not null,
  width int,
  height int,
  adsense_slot_id text,
  adsense_client_id text,
  is_enabled boolean not null default false,
  is_test_mode boolean not null default true,
  max_per_page int not null default 1,
  min_content_gap int not null default 0,
  frequency_rule jsonb not null default '{}'::jsonb,
  excluded_routes text[] not null default '{}',
  allowed_roles text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ad_placements_device_check
    check (device in ('all', 'mobile', 'desktop')),
  constraint ad_placements_ad_format_check
    check (ad_format in ('display', 'in_article', 'in_feed', 'anchor', 'multiplex', 'custom')),
  constraint ad_placements_size_mode_check
    check (size_mode in ('responsive', 'fixed', 'fluid'))
);

create index if not exists idx_ad_placements_surface on public.ad_placements(surface);
create index if not exists idx_ad_placements_enabled on public.ad_placements(is_enabled) where is_enabled = true;

create table if not exists public.ad_render_events (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid references public.ad_placements(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  story_id uuid,
  chapter_id uuid,
  author_id uuid,
  route text,
  device text,
  event_type text not null,
  reason text,
  session_id text,
  created_at timestamptz not null default now(),
  constraint ad_render_events_event_type_check
    check (event_type in ('impression_attempt', 'rendered', 'blocked', 'clicked_estimate'))
);

create index if not exists idx_ad_render_events_placement_id on public.ad_render_events(placement_id);
create index if not exists idx_ad_render_events_created_at on public.ad_render_events(created_at desc);

create or replace function public.touch_ad_placements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_ad_placements_updated_at on public.ad_placements;
create trigger trg_touch_ad_placements_updated_at
before update on public.ad_placements
for each row
execute function public.touch_ad_placements_updated_at();

alter table public.ad_placements enable row level security;
alter table public.ad_render_events enable row level security;

-- Public read: only enabled placements (config for rendering)
drop policy if exists "Public can read enabled ad placements" on public.ad_placements;
create policy "Public can read enabled ad placements"
  on public.ad_placements for select
  using (is_enabled = true or public.is_admin_or_founder(auth.uid()));

drop policy if exists "Admin founder manage ad placements" on public.ad_placements;
create policy "Admin founder manage ad placements insert" on public.ad_placements
  for insert
  with check (public.is_admin_or_founder(auth.uid()));
create policy "Admin founder manage ad placements update" on public.ad_placements
  for update
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));
create policy "Admin founder manage ad placements delete" on public.ad_placements
  for delete
  using (public.is_admin_or_founder(auth.uid()));

-- Anyone authenticated or anon can log render events (best-effort analytics)
drop policy if exists "Anyone can insert ad render events" on public.ad_render_events;
create policy "Anyone can insert ad render events"
  on public.ad_render_events for insert
  with check (true);

drop policy if exists "Admin founder read ad render events" on public.ad_render_events;
create policy "Admin founder read ad render events"
  on public.ad_render_events for select
  using (public.is_admin_or_founder(auth.uid()));

-- Seed default placements (disabled by default)
insert into public.ad_placements (
  placement_key,
  name,
  description,
  surface,
  page_pattern,
  device,
  ad_format,
  size_mode,
  is_enabled,
  is_test_mode,
  max_per_page,
  min_content_gap
)
values
  (
    'reader_top_mobile',
    'Đầu trang đọc chương (mobile)',
    'Banner phía trên nội dung chương trên mobile. Mặc định tắt để tránh nhồi quảng cáo màn đầu.',
    'chapter_reader',
    '/truyen/*/chuong/*',
    'mobile',
    'display',
    'responsive',
    false,
    true,
    1,
    0
  ),
  (
    'reader_mid_content_mobile',
    'Giữa nội dung chương (mobile)',
    'Chèn sau đủ số đoạn/block nội dung (min_content_gap). Không hiển thị nếu chương quá ngắn.',
    'chapter_reader',
    '/truyen/*/chuong/*',
    'mobile',
    'in_article',
    'responsive',
    false,
    true,
    1,
    8
  ),
  (
    'reader_bottom_mobile',
    'Cuối chương (mobile)',
    'Banner sau nội dung chương, trước phản ứng/bình luận.',
    'chapter_reader',
    '/truyen/*/chuong/*',
    'mobile',
    'display',
    'responsive',
    false,
    true,
    1,
    0
  ),
  (
    'story_detail_bottom_mobile',
    'Cuối trang chi tiết truyện (mobile)',
    'Banner cuối trang truyện trên mobile.',
    'story_detail',
    '/truyen/*',
    'mobile',
    'display',
    'responsive',
    false,
    true,
    1,
    0
  ),
  (
    'discover_in_feed_mobile',
    'Giữa feed Khám phá (mobile)',
    'Chèn giữa các cụm đề xuất trên Khám phá.',
    'discover',
    '/discover',
    'mobile',
    'in_feed',
    'responsive',
    false,
    true,
    1,
    0
  ),
  (
    'ranking_between_sections_mobile',
    'Giữa cụm bảng xếp hạng (mobile)',
    'Chèn giữa các section trên trang bảng xếp hạng.',
    'ranking',
    '/bang-xep-hang/*',
    'mobile',
    'in_feed',
    'responsive',
    false,
    true,
    1,
    0
  ),
  (
    'content_hub_article_mid',
    'Giữa bài viết / blog',
    'Chèn giữa nội dung bài viết công khai.',
    'content_hub',
    '/bai-viet/*',
    'all',
    'in_article',
    'responsive',
    false,
    true,
    1,
    6
  ),
  (
    'desktop_reader_sidebar',
    'Sidebar đọc chương (desktop)',
    'Vị trí sidebar khi layout desktop có chỗ.',
    'chapter_reader',
    '/truyen/*/chuong/*',
    'desktop',
    'display',
    'responsive',
    false,
    true,
    1,
    0
  ),
  (
    'desktop_reader_bottom',
    'Cuối trang đọc chương (desktop)',
    'Banner cuối nội dung chương trên desktop.',
    'chapter_reader',
    '/truyen/*/chuong/*',
    'desktop',
    'display',
    'responsive',
    false,
    true,
    1,
    0
  )
on conflict (placement_key) do nothing;
