-- Review feedback for Beta golden-set collection.
-- Stores SHA-256 of contract text only — never the body.

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_hash TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT '',
  prompt_version TEXT NOT NULL DEFAULT '',
  rag_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  comment TEXT,
  user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_contract_hash
  ON public.feedback (contract_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_type
  ON public.feedback (feedback_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_target
  ON public.feedback (target_type, target_id, feedback_type);
