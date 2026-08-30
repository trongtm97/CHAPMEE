-- Supabase Auth compatibility for legacy RLS policies (self-hosted Postgres).
-- Safe to re-run (CREATE OR REPLACE / IF NOT EXISTS).

CREATE SCHEMA IF NOT EXISTS auth;

-- Roles referenced by legacy policies (TO authenticated / anon / service_role).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA auth TO PUBLIC;
GRANT anon TO chapmee;
GRANT authenticated TO chapmee;
GRANT service_role TO chapmee;

-- PostgREST / Supabase JWT: claim "sub" = user id (uuid).
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    coalesce(
      current_setting('request.jwt.claim.role', true),
      current_setting('request.jwt.claims', true)::jsonb ->> 'role'
    ),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN coalesce(current_setting('request.jwt.claims', true), '') = '' THEN '{}'::jsonb
    ELSE current_setting('request.jwt.claims', true)::jsonb
  END;
$$;

GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.role() TO PUBLIC;
GRANT EXECUTE ON FUNCTION auth.jwt() TO PUBLIC;
