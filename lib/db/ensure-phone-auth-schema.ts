import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/** Phone auth columns + audit_log (Plan A auth / SOC2 prep). */
export async function ensurePhoneAuthSchema(db: Sql): Promise<void> {
  await db`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_e164 text`;
  await db`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz`;
  await db`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supabase_user_id text`;
  await db`ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL`;

  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_e164
      ON public.users (phone_e164)
      WHERE phone_e164 IS NOT NULL`;

  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id
      ON public.users (supabase_user_id)
      WHERE supabase_user_id IS NOT NULL`;

  await db`
    CREATE TABLE IF NOT EXISTS public.audit_log (
      id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    text        REFERENCES public.users (id) ON DELETE SET NULL,
      action     text        NOT NULL,
      meta       jsonb       NOT NULL DEFAULT '{}'::jsonb,
      ip         text,
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;

  await db`CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
    ON public.audit_log (user_id, created_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
    ON public.audit_log (action, created_at DESC)`;
}
