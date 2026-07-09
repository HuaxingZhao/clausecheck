import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/** Unified document review quota (mirrors supabase/migrations/20260713_unified_document_quota.sql). */
export async function ensureDocumentQuotaSchema(db: Sql): Promise<void> {
  await db`
    CREATE TABLE IF NOT EXISTS public.document_quota (
      user_id          text        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
      pool_id          text        NOT NULL DEFAULT 'main',
      used             int         NOT NULL DEFAULT 0 CHECK (used >= 0),
      quota_limit      int         NOT NULL CHECK (quota_limit >= 0),
      unit             text        NOT NULL DEFAULT 'document' CHECK (unit = 'document'),
      reset_at         timestamptz,
      trial_start      timestamptz,
      legacy_month_key text,
      legacy_month_used int        NOT NULL DEFAULT 0,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, pool_id)
    )`;

  await db`CREATE INDEX IF NOT EXISTS idx_document_quota_reset ON public.document_quota (reset_at)`;

  await db`
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

      FOR v_pool IN SELECT pool_id FROM public.document_quota
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
    $$`;
}
