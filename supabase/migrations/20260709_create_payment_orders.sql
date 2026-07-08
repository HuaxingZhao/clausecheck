-- Payment orders for WeChat top-up → credit balance (integer cents, idempotent fulfillment)
-- Depends on: 20260708_create_user_credits_system.sql (credit_transactions)

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
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_plan_check CHECK (plan IN ('pro', 'boost')),
  CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('wechat')),
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'paid', 'failed', 'cancelled'))
);

COMMENT ON TABLE public.orders IS 'Pending/completed credit top-up orders (WeChat Pay).';
COMMENT ON COLUMN public.orders.amount_cents IS 'Charge amount in CNY fen (integer).';
COMMENT ON COLUMN public.orders.credits_amount IS 'Credits granted on successful payment.';

CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_provider_trade_no
  ON public.orders (provider_trade_no)
  WHERE provider_trade_no IS NOT NULL;

-- One purchase ledger row per order (webhook idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_purchase_order
  ON public.credit_transactions (reference_id)
  WHERE type = 'purchase' AND reference_id IS NOT NULL;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- No client policies; server application writes only
