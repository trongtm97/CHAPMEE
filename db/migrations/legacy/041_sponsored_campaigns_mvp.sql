create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  contact_email text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete restrict,
  name text not null,
  campaign_type text not null check (campaign_type in ('sponsored_challenge', 'banner', 'native_card')),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  budget_vnd bigint,
  revenue_vnd bigint,
  starts_at timestamptz,
  ends_at timestamptz,
  cta_text text,
  cta_url text,
  disclosure_text text not null default 'Được tài trợ',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_challenges
  add column if not exists sponsored_campaign_id uuid references public.brand_campaigns(id) on delete set null;

create index sponsors_status_idx on public.sponsors(status);
create index brand_campaigns_sponsor_id_idx on public.brand_campaigns(sponsor_id);
create index brand_campaigns_status_type_idx on public.brand_campaigns(status, campaign_type);
create index creator_challenges_sponsored_campaign_id_idx on public.creator_challenges(sponsored_campaign_id);

create trigger sponsors_set_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

create trigger brand_campaigns_set_updated_at
before update on public.brand_campaigns
for each row execute function public.set_updated_at();

alter table public.sponsors enable row level security;
alter table public.brand_campaigns enable row level security;

create policy "Sponsors are readable by authenticated users"
  on public.sponsors for select
  using (auth.uid() is not null);

create policy "Campaigns are readable by authenticated users"
  on public.brand_campaigns for select
  using (auth.uid() is not null);

create policy "Sponsors manageable by admin and founder"
  on public.sponsors for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  );

create policy "Campaigns manageable by admin and founder"
  on public.brand_campaigns for all
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'founder')
    )
  );
