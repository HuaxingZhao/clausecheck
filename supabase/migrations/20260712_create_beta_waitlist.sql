-- Beta waitlist emails (marketing). No contract content.

CREATE TABLE IF NOT EXISTS public.beta_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  source TEXT NOT NULL DEFAULT 'beta_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT beta_waitlist_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_beta_waitlist_created
  ON public.beta_waitlist (created_at DESC);
