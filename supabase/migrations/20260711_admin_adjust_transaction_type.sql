-- Extend credit transaction types for admin manual adjustments

ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_type_check
  CHECK (type IN (
    'register', 'invite', 'purchase', 'consume', 'refund', 'admin_adjust'
  ));

COMMENT ON COLUMN public.credit_transactions.reference_id IS
  'Optional order id, invite code, scan id, admin reason note, etc.';
