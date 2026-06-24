import postgres from "postgres";

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
    })();
  }
  await schemaReady;
}
