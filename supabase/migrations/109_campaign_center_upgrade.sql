-- Campaign Center upgrade: extended schema, metrics, settings, RBAC permissions

-- sponsors: notes + extended status
alter table public.sponsors
  add column if not exists notes text;

alter table public.sponsors drop constraint if exists sponsors_status_check;
alter table public.sponsors
  add constraint sponsors_status_check
  check (status in ('active', 'inactive', 'paused', 'archived'));

-- brand_campaigns: placement, targets, copy fields, extended type/status
alter table public.brand_campaigns
  add column if not exists placement text,
  add column if not exists target_type text,
  add column if not exists target_id text,
  add column if not exists description text,
  add column if not exists admin_note text;

alter table public.brand_campaigns drop constraint if exists brand_campaigns_campaign_type_check;
alter table public.brand_campaigns
  add constraint brand_campaigns_campaign_type_check
  check (campaign_type in (
    'sponsored_challenge',
    'banner',
    'native_card',
    'creator_opportunity',
    'story_sponsorship'
  ));

alter table public.brand_campaigns drop constraint if exists brand_campaigns_status_check;
alter table public.brand_campaigns
  add constraint brand_campaigns_status_check
  check (status in ('draft', 'scheduled', 'active', 'paused', 'ended', 'archived'));

create index if not exists brand_campaigns_placement_idx on public.brand_campaigns(placement);
create index if not exists brand_campaigns_status_placement_idx on public.brand_campaigns(status, placement);

-- campaign metrics (MVP tracking — populated when tracking pipeline exists)
create table if not exists public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.brand_campaigns(id) on delete cascade,
  date date not null,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  joins bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, date)
);

create index if not exists campaign_metrics_campaign_id_idx on public.campaign_metrics(campaign_id);
create index if not exists campaign_metrics_date_idx on public.campaign_metrics(date desc);

alter table public.campaign_metrics enable row level security;

create policy "Campaign metrics readable by authenticated users"
  on public.campaign_metrics for select
  using (auth.uid() is not null);

create policy "Campaign metrics manageable by admin and founder"
  on public.campaign_metrics for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  );

-- campaign center settings (singleton)
create table if not exists public.campaign_settings (
  id int primary key default 1 check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.campaign_settings (id, settings)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table public.campaign_settings enable row level security;

create policy "Campaign settings readable by authenticated users"
  on public.campaign_settings for select
  using (auth.uid() is not null);

create policy "Campaign settings manageable by admin and founder"
  on public.campaign_settings for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  );

-- RBAC permissions
insert into public.permissions (code, name, group_key)
values
  ('campaign.view', 'View campaign center', 'admin'),
  ('campaign.create', 'Create campaigns', 'admin'),
  ('campaign.update', 'Update campaigns', 'admin'),
  ('campaign.pause', 'Pause or end campaigns', 'admin'),
  ('campaign.archive', 'Archive campaigns', 'admin'),
  ('sponsor.view', 'View sponsors', 'admin'),
  ('sponsor.create', 'Create sponsors', 'admin'),
  ('sponsor.update', 'Update sponsors', 'admin'),
  ('campaign.finance.view', 'View campaign budget and revenue', 'finance'),
  ('campaign.settings.update', 'Update campaign center settings', 'admin')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'campaign.view',
  'campaign.create',
  'campaign.update',
  'campaign.pause',
  'campaign.archive',
  'sponsor.view',
  'sponsor.create',
  'sponsor.update',
  'campaign.finance.view',
  'campaign.settings.update'
)
where r.code in ('owner', 'super_admin', 'admin', 'finance_admin')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
inner join public.permissions p on p.code in (
  'campaign.view',
  'sponsor.view'
)
where r.code = 'content_admin'
on conflict do nothing;
