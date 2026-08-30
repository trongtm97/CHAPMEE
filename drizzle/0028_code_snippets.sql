-- Custom Code / Snippet Manager (frontend-only, no server execution)

CREATE TABLE IF NOT EXISTS public.code_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  type varchar(32) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'draft',
  code text NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 100,
  placement_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  route_patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
  surface_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  device_target varchar(16) NOT NULL DEFAULT 'all',
  user_target varchar(16) NOT NULL DEFAULT 'all',
  starts_at timestamptz,
  ends_at timestamptz,
  notes text,
  checksum text,
  last_validation_status varchar(16),
  last_validation_message text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT code_snippets_type_check CHECK (
    type IN ('custom_css', 'head_script', 'body_start_script', 'footer_script', 'safe_html')
  ),
  CONSTRAINT code_snippets_status_check CHECK (
    status IN ('draft', 'active', 'inactive', 'error')
  ),
  CONSTRAINT code_snippets_device_check CHECK (
    device_target IN ('all', 'mobile', 'desktop')
  ),
  CONSTRAINT code_snippets_user_check CHECK (
    user_target IN ('all', 'logged_out', 'logged_in', 'reader', 'creator', 'admin')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS code_snippets_slug_uidx ON public.code_snippets (slug);
CREATE INDEX IF NOT EXISTS code_snippets_status_idx ON public.code_snippets (status);
CREATE INDEX IF NOT EXISTS code_snippets_type_idx ON public.code_snippets (type);
CREATE INDEX IF NOT EXISTS code_snippets_priority_idx ON public.code_snippets (priority);
CREATE INDEX IF NOT EXISTS code_snippets_updated_at_idx ON public.code_snippets (updated_at DESC);

COMMENT ON TABLE public.code_snippets IS 'Admin-managed frontend snippets (CSS/scripts/HTML). No server-side execution.';

CREATE TABLE IF NOT EXISTS public.code_snippet_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id uuid NOT NULL REFERENCES public.code_snippets(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  code text NOT NULL,
  config_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT code_snippet_versions_unique_version UNIQUE (snippet_id, version_number)
);

CREATE INDEX IF NOT EXISTS code_snippet_versions_snippet_version_idx
  ON public.code_snippet_versions (snippet_id, version_number DESC);

CREATE TABLE IF NOT EXISTS public.code_snippet_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snippet_id uuid REFERENCES public.code_snippets(id) ON DELETE SET NULL,
  action varchar(64) NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS code_snippet_audit_logs_snippet_idx
  ON public.code_snippet_audit_logs (snippet_id);
CREATE INDEX IF NOT EXISTS code_snippet_audit_logs_created_at_idx
  ON public.code_snippet_audit_logs (created_at DESC);

-- RBAC: highest-trust roles only
INSERT INTO public.permissions (code, name, group_key)
VALUES
  ('admin.snippets.view', 'View custom code snippets', 'admin'),
  ('admin.snippets.create', 'Create custom code snippets', 'admin'),
  ('admin.snippets.update', 'Update custom code snippets', 'admin'),
  ('admin.snippets.activate', 'Activate custom code snippets', 'admin'),
  ('admin.snippets.delete', 'Delete/archive custom code snippets', 'admin'),
  ('admin.snippets.rollback', 'Rollback custom code snippets', 'admin'),
  ('admin.snippets.import_export', 'Import/export custom code snippets', 'admin')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
INNER JOIN public.permissions p ON p.code IN (
  'admin.snippets.view',
  'admin.snippets.create',
  'admin.snippets.update',
  'admin.snippets.activate',
  'admin.snippets.delete',
  'admin.snippets.rollback',
  'admin.snippets.import_export'
)
WHERE r.code IN ('super_admin', 'owner')
ON CONFLICT DO NOTHING;

-- Safe mode default (enabled) via app_settings
DO $$
BEGIN
  IF to_regclass('public.app_settings') IS NOT NULL THEN
    INSERT INTO public.app_settings (key, value, is_public)
    SELECT 'code_snippet_settings', '{"snippets_enabled": true}'::jsonb, false
    WHERE NOT EXISTS (
      SELECT 1 FROM public.app_settings WHERE key = 'code_snippet_settings'
    );
  END IF;
END $$;
