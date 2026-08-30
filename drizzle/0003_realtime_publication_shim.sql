-- Supabase Realtime publication stub for legacy migrations (067_messages_realtime.sql).
-- Logical replication is not used in self-hosted MVP; publication satisfies ALTER PUBLICATION.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
