import postgres from "postgres";
import { ensureCreditsSchema } from "./ensure-credits-schema";
import { ensureDocumentQuotaSchema } from "./ensure-document-quota-schema";
import { ensureInviteSchema } from "./ensure-invite-schema";
import { ensurePhoneAuthSchema } from "./ensure-phone-auth-schema";
import { ensureFeedbackSchema } from "./ensure-feedback-schema";
import { ensureBetaWaitlistSchema } from "./ensure-beta-waitlist-schema";

let sql: ReturnType<typeof postgres> | null = null;

export function usePostgres(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not configured");
  }
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL, { max: 10, prepare: false });
  }
  return sql;
}

let schemaReady: Promise<void> | null = null;

export async function ensureSchema() {
  if (!usePostgres()) return;
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getSql();
      await db`
        CREATE TABLE IF NOT EXISTS teams (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          owner_id TEXT,
          stripe_customer_id TEXT,
          subscription_status TEXT NOT NULL DEFAULT 'none',
          pro_until TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          stripe_customer_id TEXT,
          subscription_status TEXT NOT NULL DEFAULT 'none',
          pro_until TIMESTAMPTZ,
          team_id TEXT REFERENCES teams(id),
          team_role TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS team_invites (
          id TEXT PRIMARY KEY,
          team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          email TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          file_name TEXT,
          locale TEXT NOT NULL DEFAULT 'zh',
          score_num INT NOT NULL DEFAULT 0,
          score_text TEXT NOT NULL DEFAULT '',
          result JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS magic_tokens (
          token TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS revisions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          locale TEXT NOT NULL DEFAULT 'zh',
          original_text TEXT NOT NULL DEFAULT '',
          revised_contract TEXT NOT NULL DEFAULT '',
          changes JSONB NOT NULL DEFAULT '[]'::jsonb,
          original_file TEXT,
          original_file_type TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`ALTER TABLE revisions ADD COLUMN IF NOT EXISTS original_file TEXT`;
      await db`ALTER TABLE revisions ADD COLUMN IF NOT EXISTS original_file_type TEXT`;
      await db`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
      await db`
        CREATE TABLE IF NOT EXISTS app_metrics (
          key TEXT PRIMARY KEY,
          value BIGINT NOT NULL DEFAULT 0
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS pay_per_use_credits (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          stripe_session_id TEXT UNIQUE NOT NULL,
          consumed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`CREATE INDEX IF NOT EXISTS idx_ppu_credits_email ON pay_per_use_credits(email) WHERE consumed_at IS NULL`;
      await db`
        CREATE TABLE IF NOT EXISTS scan_quota (
          id TEXT PRIMARY KEY,
          trial_start TIMESTAMPTZ,
          month_key TEXT NOT NULL DEFAULT '',
          scan_count INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`
        CREATE TABLE IF NOT EXISTS analytics_events (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT,
          props JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`;
      await db`CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(name, created_at DESC)`;
      await ensureCreditsSchema(db);
      await ensureDocumentQuotaSchema(db);
      await ensureInviteSchema(db);
      await ensurePhoneAuthSchema(db);
      await ensureFeedbackSchema(db);
      await ensureBetaWaitlistSchema(db);
    })();
  }
  await schemaReady;
}
