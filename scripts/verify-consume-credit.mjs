/**
 * 验证 consume_credit 已迁移为 text 签名（无需手写 SQL）。
 * Usage: npm run db:verify-consume-credit
 */
import postgres from "postgres";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
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
  console.error("❌ DATABASE_URL not set (.env.local or environment)");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const rows = await sql`
    SELECT
      p.proname AS name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.prosecdef AS is_definer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'consume_credit'
    ORDER BY args
  `;

  const textFn = rows.find((r) => r.args === "p_user_id text");
  const uuidFn = rows.find((r) => r.args === "p_user_id uuid");

  if (!textFn) {
    console.error("❌ consume_credit(p_user_id text) NOT FOUND");
    console.error("   Run: supabase/migrations/20260712_fix_consume_credit_signature.sql");
    if (rows.length) {
      console.error("   Found instead:", rows.map((r) => r.args).join(", "));
    }
    process.exit(1);
  }

  if (uuidFn) {
    console.error("❌ Legacy consume_credit(uuid) still exists — drop it before deploy");
    process.exit(1);
  }

  if (!textFn.is_definer) {
    console.error("❌ consume_credit(text) must be SECURITY DEFINER");
    process.exit(1);
  }

  console.log("✅ consume_credit(p_user_id text) verified (SECURITY DEFINER)");
  console.log("   Safe to deploy application code that calls consume_credit with TEXT user_id.");
} catch (err) {
  console.error("❌ Verification failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await sql.end();
}
