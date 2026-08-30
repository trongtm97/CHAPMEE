-- Foundation briefly created a real table `media_assets`; migration 198 replaces it with a VIEW.
-- Only drop when still a table (skip if already the compatibility view).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'media_assets'
      AND c.relkind = 'r'
  ) THEN
    DROP TABLE public.media_assets CASCADE;
  END IF;
END
$$;
