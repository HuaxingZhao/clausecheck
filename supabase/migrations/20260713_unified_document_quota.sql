-- Unified document review quota — merges scan_quota + pay_per_use_credits + user_credits.
-- Prerequisite: public.users (20260708 user_credits system).
-- Safe to re-run (idempotent DDL + ON CONFLICT upserts).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. document_quota table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_quota (
  user_id           text        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  pool_id           text        NOT NULL DEFAULT 'main',
  used              int         NOT NULL DEFAULT 0 CHECK (used >= 0),
  quota_limit       int         NOT NULL CHECK (quota_limit >= 0),
  unit              text        NOT NULL DEFAULT 'document' CHECK (unit = 'document'),
  reset_at          timestamptz,
  trial_start       timestamptz,
  legacy_month_key  text,
  legacy_month_used int         NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, pool_id)
);

COMMENT ON TABLE public.document_quota IS 'Unified document review quota per user/pool.';
COMMENT ON COLUMN public.document_quota.pool_id IS 'main | legacy_ppu | addon';
COMMENT ON COLUMN public.document_quota.quota_limit IS 'Max documents per billing cycle for this pool.';
COMMENT ON COLUMN public.document_quota.reset_at IS 'Subscription anniversary reset (ISO).';

CREATE INDEX IF NOT EXISTS idx_document_quota_reset
  ON public.document_quota (reset_at);

ALTER TABLE public.document_quota ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. consume_document_quota RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_document_quota(p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_pool text;
  v_used int;
  v_limit int;
BEGIN
  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RETURN false;
  END IF;

  v_user_id := btrim(p_user_id);

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RETURN false;
  END IF;

  FOR v_pool IN
    SELECT pool_id FROM public.document_quota
     WHERE user_id = v_user_id
     ORDER BY CASE pool_id
       WHEN 'legacy_ppu' THEN 0
       WHEN 'addon' THEN 1
       ELSE 2
     END
  LOOP
    SELECT used, quota_limit
      INTO v_used, v_limit
      FROM public.document_quota
     WHERE user_id = v_user_id
       AND pool_id = v_pool
       FOR UPDATE;

    IF v_used < v_limit THEN
      UPDATE public.document_quota
         SET used = used + 1,
             updated_at = now()
       WHERE user_id = v_user_id
         AND pool_id = v_pool;
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.consume_document_quota(text)
  IS 'Atomically consume one document review from legacy_ppu → addon → main pools.';

GRANT EXECUTE ON FUNCTION public.consume_document_quota(text) TO PUBLIC;

-- ---------------------------------------------------------------------------
-- 3. Migrate user_credits → main pool (proportional to Pro 10-doc cycle)
-- ---------------------------------------------------------------------------
INSERT INTO public.document_quota (
  user_id, pool_id, used, quota_limit, unit, trial_start, legacy_month_key, legacy_month_used
)
SELECT
  uc.user_id,
  'main',
  0,
  GREATEST(1, CEIL(uc.balance * 10.0 / 3.0)),
  'document',
  now(),
  to_char(now(), 'YYYY-MM'),
  0
FROM public.user_credits uc
WHERE uc.balance > 0
ON CONFLICT (user_id, pool_id) DO UPDATE SET
  quota_limit = GREATEST(public.document_quota.quota_limit, EXCLUDED.quota_limit),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. Migrate scan_quota (user:* keys) — preserve 3-day trial + 3/month legacy
-- ---------------------------------------------------------------------------
INSERT INTO public.document_quota (
  user_id, pool_id, used, quota_limit, unit, trial_start, legacy_month_key, legacy_month_used
)
SELECT
  substring(sq.id FROM 6),
  'main',
  0,
  GREATEST(1, 3),
  'document',
  sq.trial_start,
  sq.month_key,
  CASE WHEN sq.month_key = to_char(now(), 'YYYY-MM') THEN sq.scan_count ELSE 0 END
FROM public.scan_quota sq
WHERE sq.id LIKE 'user:%'
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = substring(sq.id FROM 6))
ON CONFLICT (user_id, pool_id) DO UPDATE SET
  trial_start = COALESCE(public.document_quota.trial_start, EXCLUDED.trial_start),
  legacy_month_key = EXCLUDED.legacy_month_key,
  legacy_month_used = GREATEST(public.document_quota.legacy_month_used, EXCLUDED.legacy_month_used),
  quota_limit = GREATEST(public.document_quota.quota_limit, EXCLUDED.quota_limit),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. Migrate unconsumed pay_per_use_credits → legacy_ppu pool
-- ---------------------------------------------------------------------------
INSERT INTO public.document_quota (user_id, pool_id, used, quota_limit, unit)
SELECT
  u.id,
  'legacy_ppu',
  0,
  COUNT(*)::int,
  'document'
FROM public.pay_per_use_credits p
JOIN public.users u ON lower(u.email) = lower(p.email)
WHERE p.consumed_at IS NULL
GROUP BY u.id
HAVING COUNT(*) > 0
ON CONFLICT (user_id, pool_id) DO UPDATE SET
  quota_limit = EXCLUDED.quota_limit,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 6. Active Pro subscribers → 10-doc cycle with reset_at = pro_until
-- ---------------------------------------------------------------------------
INSERT INTO public.document_quota (user_id, pool_id, used, quota_limit, unit, reset_at)
SELECT
  u.id,
  'main',
  0,
  10,
  'document',
  u.pro_until
FROM public.users u
WHERE u.subscription_status = 'active'
  AND (u.pro_until IS NULL OR u.pro_until > now())
ON CONFLICT (user_id, pool_id) DO UPDATE SET
  quota_limit = 10,
  reset_at = EXCLUDED.reset_at,
  used = 0,
  trial_start = NULL,
  legacy_month_key = NULL,
  legacy_month_used = 0,
  updated_at = now();

COMMIT;

-- Verification (optional):
-- SELECT pool_id, COUNT(*), SUM(quota_limit), SUM(used) FROM document_quota GROUP BY pool_id;
