-- Accept 'reels' alongside legacy 'swipe' for scheduling and drafts.

alter table public.creator_drafts
  drop constraint if exists creator_drafts_draft_type_check;

alter table public.creator_drafts
  add constraint creator_drafts_draft_type_check
  check (draft_type in ('story', 'chapter', 'swipe', 'reels', 'seo', 'template'));

alter table public.scheduled_publications
  drop constraint if exists scheduled_publications_target_type_check;

alter table public.scheduled_publications
  add constraint scheduled_publications_target_type_check
  check (target_type in ('story', 'chapter', 'swipe', 'reels'));
