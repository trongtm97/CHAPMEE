-- Transactional email queue (SMTP / console modes).

CREATE TABLE IF NOT EXISTS public.email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  html text NOT NULL,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text,
  provider_message_id text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  error_message text,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_jobs_status_scheduled_idx
  ON public.email_jobs (status, scheduled_at)
  WHERE status IN ('pending', 'sending');

CREATE INDEX IF NOT EXISTS email_jobs_to_email_created_idx
  ON public.email_jobs (to_email, created_at DESC);

COMMENT ON TABLE public.email_jobs IS 'Transactional email outbox; processed by scripts/email-worker.ts';
