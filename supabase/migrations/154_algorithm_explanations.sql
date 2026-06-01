-- Cached algorithm explanations for admin/creator transparency.

create table if not exists public.algorithm_explanations (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,
  item_id uuid not null,
  story_id uuid references public.stories(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete cascade,
  explanation_type text not null,
  visibility text not null default 'admin',
  title text not null,
  message text not null,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint algorithm_explanations_item_type_check check (
    item_type in ('story', 'reel', 'author', 'chapter')
  ),
  constraint algorithm_explanations_explanation_type_check check (
    explanation_type in ('ranking', 'fairness', 'cold_start', 'safety', 'spam', 'quality')
  ),
  constraint algorithm_explanations_visibility_check check (
    visibility in ('admin', 'creator')
  ),
  constraint algorithm_explanations_severity_check check (
    severity in ('info', 'warning', 'critical', 'success')
  )
);

create index if not exists algorithm_explanations_item_idx
  on public.algorithm_explanations (item_type, item_id, created_at desc);

create index if not exists algorithm_explanations_author_idx
  on public.algorithm_explanations (author_user_id, created_at desc)
  where author_user_id is not null;

create index if not exists algorithm_explanations_visibility_idx
  on public.algorithm_explanations (visibility, created_at desc);

alter table public.algorithm_explanations enable row level security;

create policy "Algorithm explanations readable by staff"
  on public.algorithm_explanations for select
  using (public.current_profile_role() in ('admin', 'moderator'));

create policy "Algorithm explanations readable by story owner"
  on public.algorithm_explanations for select
  to authenticated
  using (
    visibility = 'creator'
    and story_id is not null
    and exists (
      select 1 from public.stories s
      join public.creator_profiles cp on cp.id = s.creator_id
      where s.id = algorithm_explanations.story_id
        and cp.user_id = auth.uid()
    )
  );

create policy "Algorithm explanations insertable by service"
  on public.algorithm_explanations for insert
  with check (true);
