-- Remove legacy 'swipe' enum values from drafts, scheduling, and templates.

alter table public.creator_drafts
  drop constraint if exists creator_drafts_draft_type_check;

alter table public.scheduled_publications
  drop constraint if exists scheduled_publications_target_type_check;

alter table public.creator_templates
  drop constraint if exists creator_templates_type_check;

update public.creator_drafts
set draft_type = 'reels'
where draft_type = 'swipe';

update public.scheduled_publications
set target_type = 'reels'
where target_type = 'swipe';

update public.creator_templates
set template_type = 'reels'
where template_type = 'swipe';

alter table public.creator_drafts
  add constraint creator_drafts_draft_type_check
  check (draft_type in ('story', 'chapter', 'reels', 'seo', 'template'));

alter table public.scheduled_publications
  add constraint scheduled_publications_target_type_check
  check (target_type in ('story', 'chapter', 'reels'));

alter table public.creator_templates
  add constraint creator_templates_type_check
  check (
    template_type in (
      'story_description',
      'chapter',
      'author_note',
      'reels',
      'seo',
      'community_post'
    )
  );
