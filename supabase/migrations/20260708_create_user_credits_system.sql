-- User credits system for Neon Postgres + app JWT (public.users).
-- Prerequisite: public.users must exist (app ensureSchema / lib/db/pg.ts).

-- ---------------------------------------------------------------------------
-- 1. user_credits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id    text        PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  balance    int         NOT NULL DEFAULT 3 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_credits IS 'Per-user scan credit balance; bootstrapped by app on register.';
COMMENT ON COLUMN public.user_credits.balance IS 'Remaining credits; decremented atomically via consume_credit().';

CREATE INDEX IF NOT EXISTS idx_user_credits_updated_at
  ON public.user_credits (updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_user_credits_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_credits_updated_at ON public.user_credits;
CREATE TRIGGER trg_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_credits_updated_at();

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
-- No client RLS policies: all access via application server (DATABASE_URL).

-- ---------------------------------------------------------------------------
-- 2. credit_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      text        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  amount       int         NOT NULL,
  type         text        NOT NULL,
  reference_id text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_transactions_type_check
    CHECK (type IN ('register', 'invite', 'purchase', 'consume', 'refund'))
);

COMMENT ON TABLE public.credit_transactions IS 'Immutable ledger of credit grants and debits.';
COMMENT ON COLUMN public.credit_transactions.amount IS 'Positive = credit added; negative = credit consumed.';
COMMENT ON COLUMN public.credit_transactions.reference_id IS 'Optional order id, invite code, scan id, etc.';

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created
  ON public.credit_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_type
  ON public.credit_transactions (type);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
-- No client RLS policies: writes via application server only.

-- ---------------------------------------------------------------------------
-- 3. Atomic consume RPC (FOR UPDATE row lock; no Supabase auth.uid())
-- ---------------------------------------------------------------------------
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
  IS 'Atomically deduct 1 credit for p_user_id; caller must authorize user in app layer.';

GRANT EXECUTE ON FUNCTION public.consume_credit(text) TO PUBLIC;

-- Bootstrap is handled in application code (bootstrapNewUserCredits on register/OAuth).
-- No auth.users trigger.
