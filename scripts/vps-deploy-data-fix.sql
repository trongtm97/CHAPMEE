-- VPS one-time data fix after story URL patch deploy

UPDATE stories
SET visibility = 'public'
WHERE visibility = 'private'
  AND status IN ('approved', 'published');

UPDATE stories
SET canonical_url = '/truyen/' || slug || '-s.' || public_code
WHERE public_code IS NOT NULL
  AND public_code ~ '^[0-9]{8,12}$'
  AND (
    canonical_url IS NULL
    OR canonical_url LIKE '/studio%'
    OR canonical_url LIKE '/creator%'
    OR canonical_url LIKE '/admin%'
  );
