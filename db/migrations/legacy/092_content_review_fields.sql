-- Migration 092: Content review metadata for stories/episodes
-- Lưu ý: index dùng changes_requested nằm ở 093 (PG không cho dùng enum mới trong cùng transaction).

alter type public.content_status add value if not exists 'changes_requested';

alter table public.stories
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason_code text,
  add column if not exists rejection_note text,
  add column if not exists changes_requested_note text,
  add column if not exists submitted_for_review_at timestamptz;

alter table public.episodes
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason_code text,
  add column if not exists rejection_note text,
  add column if not exists changes_requested_note text,
  add column if not exists submitted_for_review_at timestamptz;
