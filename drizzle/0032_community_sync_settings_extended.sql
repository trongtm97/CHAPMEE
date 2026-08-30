-- Extend Story Community Sync settings with additional admin keys.
-- Safe: insert-only on conflict do nothing.

insert into public.community_sync_settings (key, value_json)
values
  ('sync_reviews', 'true'::jsonb),
  ('min_comment_length_to_surface', '3'::jsonb),
  ('hide_spam_from_group', 'true'::jsonb),
  ('require_moderation_for_new_accounts', 'false'::jsonb),
  ('paid_chapter_comment_preview', '80'::jsonb),
  ('author_can_pin_group_items', 'false'::jsonb),
  ('author_can_hide_group_items', 'true'::jsonb)
on conflict (key) do nothing;
