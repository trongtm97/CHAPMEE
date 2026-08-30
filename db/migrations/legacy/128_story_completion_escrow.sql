-- Migration 128: Admin-confirmed story completion + full-story revenue escrow

alter table public.stories
  add column if not exists admin_completion_status text not null default 'not_requested'
    check (
      admin_completion_status in ('not_requested', 'pending_review', 'approved', 'rejected')
    ),
  add column if not exists admin_completion_requested_at timestamptz,
  add column if not exists admin_completion_reviewed_at timestamptz,
  add column if not exists admin_completion_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists admin_completion_note text,
  add column if not exists author_completion_request_note text;

create index if not exists idx_stories_admin_completion_status
  on public.stories(admin_completion_status, admin_completion_requested_at desc)
  where admin_completion_status in ('pending_review', 'rejected');

alter table public.creator_earning_transactions
  add column if not exists release_status text not null default 'available'
    check (
      release_status in (
        'available',
        'locked_until_story_completion',
        'released',
        'refunded',
        'cancelled'
      )
    ),
  add column if not exists locked_reason text;

create index if not exists idx_creator_earning_tx_story_release
  on public.creator_earning_transactions(story_id, release_status)
  where source_type = 'story_unlock' and release_status = 'locked_until_story_completion';

comment on column public.stories.admin_completion_status is
  'Admin review for story completion. Only approved unlocks full-story escrow revenue.';
comment on column public.stories.is_completed is
  'Author/public completion flag. Does NOT unlock full-story escrow by itself.';
comment on column public.creator_earning_transactions.release_status is
  'Withdrawal release state for creator net earnings.';
