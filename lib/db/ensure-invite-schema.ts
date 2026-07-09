import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/** Invite referral tables (mirrors supabase/migrations/20260710_create_invite_system.sql). */
export async function ensureInviteSchema(db: Sql): Promise<void> {
  await db`
    CREATE TABLE IF NOT EXISTS public.invite_codes (
      id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    text        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
      code       char(6)     NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      used_by    text        REFERENCES public.users (id) ON DELETE SET NULL,
      use_count  int         NOT NULL DEFAULT 0 CHECK (use_count >= 0 AND use_count <= 50),
      CONSTRAINT invite_codes_code_unique UNIQUE (code),
      CONSTRAINT invite_codes_user_unique UNIQUE (user_id)
    )`;

  await db`
    CREATE TABLE IF NOT EXISTS public.invite_redemptions (
      id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
      invite_code_id   uuid        NOT NULL REFERENCES public.invite_codes (id) ON DELETE CASCADE,
      redeemer_user_id text        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
      device_key       text        NOT NULL,
      ip_key           text        NOT NULL,
      created_at       timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT invite_redemptions_redeemer_unique UNIQUE (redeemer_user_id)
    )`;

  await db`CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes (code)`;
  await db`
    CREATE INDEX IF NOT EXISTS idx_invite_redemptions_code
      ON public.invite_redemptions (invite_code_id, created_at DESC)`;
  await db`
    CREATE INDEX IF NOT EXISTS idx_invite_redemptions_device_recent
      ON public.invite_redemptions (device_key, created_at DESC)`;
  await db`
    CREATE INDEX IF NOT EXISTS idx_invite_redemptions_ip_recent
      ON public.invite_redemptions (ip_key, created_at DESC)`;

  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_invite_redeem_register
      ON public.credit_transactions (reference_id)
      WHERE type = 'register' AND reference_id IS NOT NULL`;
  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_invite_redeem_invite
      ON public.credit_transactions (reference_id)
      WHERE type = 'invite' AND reference_id IS NOT NULL`;
}
