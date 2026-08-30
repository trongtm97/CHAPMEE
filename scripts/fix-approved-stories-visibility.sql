-- One-time fix: approved/published stories that stayed private never appear in /truyen.
-- Safe to run multiple times.

UPDATE stories
SET visibility = 'public'
WHERE visibility = 'private'
  AND status IN ('approved', 'published');
