import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/** Credits / orders tables + consume_credit RPC (mirrors supabase/migrations/20260708–09). */
export async function ensureCreditsSchema(db: Sql): Promise<void> {
  await db`
    CREATE TABLE IF NOT EXISTS public.user_credits (
      user_id    text        PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
      balance    int         NOT NULL DEFAULT 3 CHECK (balance >= 0),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;

  await db`
    CREATE TABLE IF NOT EXISTS public.credit_transactions (
      id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      text        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
      amount       int         NOT NULL,
      type         text        NOT NULL,
      reference_id text,
      created_at   timestamptz NOT NULL DEFAULT now()
    )`;

  await db`
    CREATE TABLE IF NOT EXISTS public.orders (
      id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           text        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
      plan              text        NOT NULL,
      payment_method    text        NOT NULL DEFAULT 'wechat',
      amount_cents      int         NOT NULL CHECK (amount_cents > 0),
      credits_amount    int         NOT NULL CHECK (credits_amount > 0),
      status            text        NOT NULL DEFAULT 'pending',
      provider_trade_no text,
      payment_url       text,
      paid_at           timestamptz,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now()
    )`;

  await db`CREATE INDEX IF NOT EXISTS idx_user_credits_updated_at ON public.user_credits (updated_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON public.credit_transactions (user_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status)`;

  await db`
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
    $$`;
}
