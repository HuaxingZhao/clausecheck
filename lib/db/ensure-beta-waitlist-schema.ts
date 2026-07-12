import type postgres from "postgres";

export async function ensureBetaWaitlistSchema(db: ReturnType<typeof postgres>) {
  await db`
    CREATE TABLE IF NOT EXISTS beta_waitlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL,
      locale TEXT NOT NULL DEFAULT 'en',
      source TEXT NOT NULL DEFAULT 'beta_page',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT beta_waitlist_email_unique UNIQUE (email)
    )`;
  await db`
    CREATE INDEX IF NOT EXISTS idx_beta_waitlist_created
    ON beta_waitlist (created_at DESC)`;
}
