-- Community moderation fields for admin control center
alter table public.community_posts
  add column if not exists episode_id uuid references public.episodes(id) on delete set null,
  add column if not exists report_count int not null default 0,
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pinned_scope text,
  add column if not exists pinned_by uuid references public.profiles(id) on delete set null,
  add column if not exists pinned_at timestamptz,
  add column if not exists pinned_until timestamptz,
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_by uuid references public.profiles(id) on delete set null,
  add column if not exists featured_at timestamptz,
  add column if not exists featured_until timestamptz,
  add column if not exists comments_locked boolean not null default false,
  add column if not exists comments_locked_by uuid references public.profiles(id) on delete set null,
  add column if not exists comments_locked_at timestamptz,
  add column if not exists comments_locked_reason text,
  add column if not exists hidden_reason text,
  add column if not exists rejected_reason text,
  add column if not exists rejection_reason_code text,
  add column if not exists public_note text,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null,
  add column if not exists hidden_at timestamptz,
  add column if not exists risk_level text not null default 'low';

create index if not exists community_posts_status_created_idx
  on public.community_posts(status, created_at desc);

create index if not exists community_posts_type_status_idx
  on public.community_posts(type, status);

create table if not exists public.community_group_settings (
  group_type text not null check (group_type in ('story', 'author')),
  group_id uuid not null,
  status text not null default 'active'
    check (status in ('active', 'posting_restricted', 'posting_locked', 'hidden_from_recommendation')),
  posting_locked boolean not null default false,
  followers_only_posting boolean not null default false,
  hidden_from_recommendation boolean not null default false,
  pinned_notice text,
  pinned_notice_by uuid references public.profiles(id) on delete set null,
  pinned_notice_at timestamptz,
  moderator_ids uuid[] not null default '{}',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (group_type, group_id)
);

alter table public.community_group_settings enable row level security;

drop policy if exists "Staff can manage community group settings" on public.community_group_settings;
create policy "Staff can manage community group settings"
  on public.community_group_settings for all
  to authenticated
  using (
    public.current_profile_role() in ('admin', 'moderator')
    or public.user_has_permission(auth.uid(), 'community.group.moderate')
  )
  with check (
    public.current_profile_role() in ('admin', 'moderator')
    or public.user_has_permission(auth.uid(), 'community.group.moderate')
  );

drop policy if exists "Staff can read community group settings" on public.community_group_settings;
create policy "Staff can read community group settings"
  on public.community_group_settings for select
  to authenticated
  using (
    public.current_profile_role() in ('admin', 'moderator')
    or public.user_has_permission(auth.uid(), 'community.group.moderate')
    or public.user_has_permission(auth.uid(), 'community.post.moderate')
  );
