-- Content protection / anti-crawl (PROMPT 6).

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'rate_limit_hit',
      'suspicious_reader_velocity',
      'challenge_required',
      'challenge_passed',
      'challenge_failed',
      'blocked_request',
      'content_access_denied'
    )
  ),
  profile_id uuid references public.profiles(id) on delete set null,
  ip_hash text,
  user_agent text,
  path text,
  method varchar(16),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_type_created_idx
  on public.security_events (event_type, created_at desc);

create index if not exists security_events_path_created_idx
  on public.security_events (path, created_at desc);

create table if not exists public.crawl_protection_settings (
  id text primary key default 'singleton',
  enabled boolean not null default true,
  reader_rate_limit_enabled boolean not null default true,
  anonymous_chapter_reads_per_minute int not null default 20,
  anonymous_chapter_reads_per_hour int not null default 200,
  logged_in_chapter_reads_per_minute int not null default 60,
  logged_in_chapter_reads_per_hour int not null default 600,
  search_requests_per_minute int not null default 30,
  comment_requests_per_minute int not null default 10,
  reaction_requests_per_minute int not null default 30,
  review_requests_per_hour int not null default 10,
  challenge_enabled boolean not null default false,
  challenge_provider varchar(32),
  challenge_threshold_json jsonb not null default '{}'::jsonb,
  block_datacenter_mode varchar(16) not null default 'monitor'
    check (block_datacenter_mode in ('off', 'monitor', 'challenge', 'block')),
  good_bot_allowlist jsonb not null default '["Googlebot","bingbot","Applebot","DuckDuckBot"]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.crawl_protection_settings (id)
values ('singleton')
on conflict (id) do nothing;

comment on table public.security_events is
  'Security / anti-crawl audit log — no cloaking, monitoring and rate limits only.';

comment on table public.crawl_protection_settings is
  'Singleton crawl protection configuration (admin-editable).';
