-- Recommendation tickets (Phiếu đề cử) — separate from Coin and legacy reward_points.

create table if not exists public.recommendation_ticket_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  lifetime_earned int not null default 0,
  lifetime_spent int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_ticket_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check (amount <> 0),
  type text not null check (type in ('earn', 'spend', 'admin_adjustment')),
  source_type text not null check (
    source_type in (
      'coin_topup',
      'chapter_completion',
      'story_reading_milestone',
      'valid_comment',
      'daily_activity',
      'admin_bonus',
      'story_recommendation'
    )
  ),
  source_id text,
  story_id uuid references public.stories(id) on delete set null,
  chapter_id uuid references public.episodes(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists recommendation_ticket_ledger_earn_dedupe_idx
  on public.recommendation_ticket_ledger (user_id, source_type, source_id)
  where type = 'earn' and source_id is not null;

create index if not exists recommendation_ticket_ledger_user_created_idx
  on public.recommendation_ticket_ledger (user_id, created_at desc);

create index if not exists recommendation_ticket_ledger_story_idx
  on public.recommendation_ticket_ledger (story_id)
  where story_id is not null;

create table if not exists public.story_recommendations (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tickets_spent int not null check (tickets_spent > 0),
  status text not null default 'active' check (status in ('active', 'removed')),
  created_at timestamptz not null default now()
);

create index if not exists story_recommendations_story_created_idx
  on public.story_recommendations (story_id, created_at desc);

create index if not exists story_recommendations_user_created_idx
  on public.story_recommendations (user_id, created_at desc);

comment on table public.recommendation_ticket_wallets is
  'User balance of recommendation tickets (Phiếu đề cử).';
comment on table public.recommendation_ticket_ledger is
  'Immutable ledger for recommendation ticket earn/spend.';
comment on table public.story_recommendations is
  'Each spend of tickets supporting a story — ranking sums tickets_spent.';
