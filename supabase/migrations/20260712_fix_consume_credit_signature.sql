-- =============================================================================
-- consume_credit 签名修复：uuid → text（与 user_credits.user_id TEXT 对齐）
-- =============================================================================
-- 执行时机：部署含 lib/credits/user-credits.ts 新代码之前（P0 阻断）
-- 幂等性：可重复执行；旧 uuid 签名会被 DROP，text 签名 CREATE OR REPLACE
--
-- Dashboard：Supabase → SQL Editor → 粘贴全文 → Run
-- 本地/CI：npm run db:verify-consume-credit（需 DATABASE_URL）
-- =============================================================================

BEGIN;

-- 1) 删除旧 uuid 签名（若从未部署过旧版，此步无影响）
DROP FUNCTION IF EXISTS public.consume_credit(uuid);

-- 2) 创建 / 更新 text 签名
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_balance int;
BEGIN
  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RETURN false;
  END IF;

  v_user_id := btrim(p_user_id);

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN
    RETURN false;
  END IF;

  SELECT balance
    INTO v_balance
    FROM public.user_credits
   WHERE user_id = v_user_id
     FOR UPDATE;

  IF NOT FOUND OR v_balance < 1 THEN
    RETURN false;
  END IF;

  UPDATE public.user_credits
     SET balance = balance - 1
   WHERE user_id = v_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type)
  VALUES (v_user_id, -1, 'consume');

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.consume_credit(text)
  IS 'Atomically deduct 1 credit for p_user_id (TEXT); caller must authorize in app layer.';

GRANT EXECUTE ON FUNCTION public.consume_credit(text) TO PUBLIC;

-- 3) 验证：失败则整个事务回滚
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'consume_credit'
       AND pg_get_function_identity_arguments(p.oid) = 'p_user_id text'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAILED: consume_credit(p_user_id text) not found after migration';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = 'consume_credit'
       AND pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAILED: legacy consume_credit(uuid) still exists';
  END IF;

  RAISE NOTICE 'VERIFY OK: consume_credit(p_user_id text) is active; consume_credit(uuid) removed';
END $$;

COMMIT;

-- =============================================================================
-- 手动验证查询（可选，Run 后单独执行查看结果）
-- =============================================================================
-- SELECT
--   p.proname AS function_name,
--   pg_get_function_identity_arguments(p.oid) AS arguments,
--   CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'consume_credit';
-- 预期：仅 1 行 → consume_credit | p_user_id text | SECURITY DEFINER
--
-- =============================================================================
-- ROLLBACK（仅在必须回退到旧版应用代码时手动执行；会恢复 uuid 签名）
-- =============================================================================
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.consume_credit(text);
-- CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id uuid)
-- RETURNS boolean
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- DECLARE
--   v_user_id text;
--   v_balance int;
-- BEGIN
--   IF p_user_id IS NULL THEN RETURN false; END IF;
--   v_user_id := p_user_id::text;
--   IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id) THEN RETURN false; END IF;
--   SELECT balance INTO v_balance FROM public.user_credits WHERE user_id = v_user_id FOR UPDATE;
--   IF NOT FOUND OR v_balance < 1 THEN RETURN false; END IF;
--   UPDATE public.user_credits SET balance = balance - 1 WHERE user_id = v_user_id;
--   INSERT INTO public.credit_transactions (user_id, amount, type) VALUES (v_user_id, -1, 'consume');
--   RETURN true;
-- END;
-- $$;
-- GRANT EXECUTE ON FUNCTION public.consume_credit(uuid) TO PUBLIC;
-- COMMIT;
-- ⚠️ 回滚后必须同时部署仍调用 consume_credit(uuid) 的旧应用代码，否则扫描扣费会失败。
