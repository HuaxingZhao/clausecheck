-- Privacy: hard retention for contract-bearing rows + PostgREST lockdown via RLS.
-- App server uses DATABASE_URL (table owner / bypass). No soft-delete columns.

CREATE INDEX IF NOT EXISTS idx_revisions_created_at
  ON public.revisions (created_at);

CREATE INDEX IF NOT EXISTS idx_reports_created_at
  ON public.reports (created_at);

COMMENT ON TABLE public.revisions IS
  'Temporary revision workbook rows. Contract bodies are physically DELETED by /api/cron/purge-contract-data within 24h. No soft-delete.';

COMMENT ON TABLE public.reports IS
  'Pro report metadata. Full contract source must not be stored in result.contractReview.source; cron scrubs leftovers.';

COMMENT ON COLUMN public.revisions.original_text IS
  'Ephemeral contract body — hard-deleted with the row after ≤24h.';

COMMENT ON COLUMN public.revisions.original_file IS
  'Deprecated for persistence; app writes NULL. Any leftover blobs nulled by cron.';

-- Same pattern as user_credits: RLS on, no client policies → PostgREST clients denied.
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revisions ENABLE ROW LEVEL SECURITY;
