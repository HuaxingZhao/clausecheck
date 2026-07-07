/**
 * Verify DATABASE_URL connectivity and run ensureSchema tables.
 * Usage: npm run db:check
 */
import postgres from "postgres";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await readFile(path.join(ROOT, file), "utf8");
      const m = raw.match(/^DATABASE_URL=(.+)$/m);
      if (m?.[1]?.trim()) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {
      /* ignore */
    }
  }
  return null;
}

const url = await loadDatabaseUrl();
if (!url) {
  console.error("❌ DATABASE_URL not set. Add it to .env.local first.");
  console.error("   See docs/DEPLOY.md §1 (Neon Postgres)");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const [{ now }] = await sql`SELECT NOW() AS now`;
  console.log("✅ Connected to Postgres at", now);

  await sql`
    CREATE TABLE IF NOT EXISTS app_metrics (
      key TEXT PRIMARY KEY,
      value BIGINT NOT NULL DEFAULT 0
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS pay_per_use_credits (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      stripe_session_id TEXT UNIQUE NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS scan_quota (
      id TEXT PRIMARY KEY,
      trial_start TIMESTAMPTZ,
      month_key TEXT NOT NULL DEFAULT '',
      scan_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT,
      props JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;

  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;
  console.log("✅ Schema OK — tables:", tables.map((t) => t.table_name).join(", "));
} catch (err) {
  console.error("❌ Database check failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end();
}
