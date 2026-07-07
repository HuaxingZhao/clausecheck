/**
 * P0 verification helpers — seed / restore local JSON or Postgres test state.
 * Used only by scripts/verify-p0.sh (not imported by the app).
 */
import { createHash, randomUUID } from "crypto";
import { readFile, writeFile, mkdir, copyFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..");
export const DATA_DIR = path.join(ROOT, "data");
export const APP_DB = path.join(DATA_DIR, "app-db.json");
export const METRICS_FILE = path.join(DATA_DIR, "scan-metrics.json");
export const BACKUP_DIR = path.join(__dirname, ".verify-p0-backup");

export const TEST_EMAIL = "p0-verify@clausecheck.test";
export const TEST_USER_ID = "p0-verify-user-id";
/** Fixed IP for curl + seed alignment (via X-Forwarded-For). */
export const VERIFY_CLIENT_IP = process.env.VERIFY_CLIENT_IP || "p0-verify-test-ip";

export function todayMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeIpHash(authSecret = "dev-only-change-me-in-production", ip = VERIFY_CLIENT_IP) {
  return createHash("sha256")
    .update(`${ip}:${authSecret}`)
    .digest("hex")
    .slice(0, 32);
}

export async function loadAuthSecret() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = await readFile(path.join(ROOT, file), "utf8");
      const m = raw.match(/^AUTH_SECRET=(.+)$/m);
      if (m?.[1]?.trim()) return m[1].trim();
    } catch {
      /* ignore */
    }
  }
  return "dev-only-change-me-in-production";
}

export function usePostgres() {
  return !!process.env.DATABASE_URL;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function backupState() {
  await mkdir(BACKUP_DIR, { recursive: true });
  for (const [src, name] of [
    [APP_DB, "app-db.json"],
    [METRICS_FILE, "scan-metrics.json"],
  ]) {
    if (await fileExists(src)) {
      await copyFile(src, path.join(BACKUP_DIR, name));
    }
  }
}

export async function restoreState() {
  for (const name of ["app-db.json", "scan-metrics.json"]) {
    const bak = path.join(BACKUP_DIR, name);
    const dest = path.join(DATA_DIR, name);
    if (await fileExists(bak)) {
      await mkdir(DATA_DIR, { recursive: true });
      await copyFile(bak, dest);
    }
  }
}

async function readJsonDb() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    return JSON.parse(await readFile(APP_DB, "utf8"));
  } catch {
    return { users: [], reports: [], revisions: [], magicTokens: [], teams: [], teamInvites: [] };
  }
}

async function writeJsonDb(db) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(APP_DB, JSON.stringify(db, null, 2), "utf8");
}

async function readMetrics() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const p = JSON.parse(await readFile(METRICS_FILE, "utf8"));
    return {
      globalScanCount: p.globalScanCount ?? 331,
      payPerUseCredits: p.payPerUseCredits ?? [],
      scanQuota: p.scanQuota ?? [],
    };
  } catch {
    return { globalScanCount: 331, payPerUseCredits: [], scanQuota: [] };
  }
}

async function writeMetrics(m) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(METRICS_FILE, JSON.stringify(m, null, 2), "utf8");
}

export async function seedExceededQuota(authSecret) {
  const ipHash = computeIpHash(authSecret);
  const key = `ip:${ipHash}`;
  const monthKey = todayMonthKey();
  const expiredTrial = new Date(Date.now() - 5 * 86400000).toISOString();

  if (usePostgres()) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    await sql`
      INSERT INTO scan_quota (id, trial_start, month_key, scan_count, updated_at)
      VALUES (${key}, ${expiredTrial}, ${monthKey}, 3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        trial_start = EXCLUDED.trial_start,
        month_key = EXCLUDED.month_key,
        scan_count = EXCLUDED.scan_count,
        updated_at = NOW()`;
    await sql.end();
    return key;
  }

  const m = await readMetrics();
  m.scanQuota = m.scanQuota.filter((q) => q.id !== key);
  m.scanQuota.push({
    id: key,
    trialStart: expiredTrial,
    monthKey,
    scanCount: 3,
  });
  await writeMetrics(m);
  return key;
}

export async function clearQuotaForIp(authSecret) {
  const ipHash = computeIpHash(authSecret);
  const key = `ip:${ipHash}`;

  if (usePostgres()) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    await sql`DELETE FROM scan_quota WHERE id = ${key}`;
    await sql.end();
    return;
  }

  const m = await readMetrics();
  m.scanQuota = m.scanQuota.filter((q) => q.id !== key);
  await writeMetrics(m);
}

export async function seedPayPerUseSession() {
  const now = new Date().toISOString();
  const token =
    randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

  if (usePostgres()) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    await sql`
      INSERT INTO users (id, email, subscription_status, created_at, updated_at)
      VALUES (${TEST_USER_ID}, ${TEST_EMAIL}, 'none', NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()`;
    await sql`DELETE FROM pay_per_use_credits WHERE email = ${TEST_EMAIL}`;
    await sql`
      INSERT INTO pay_per_use_credits (id, email, stripe_session_id, created_at)
      VALUES (${randomUUID()}, ${TEST_EMAIL}, ${"cs_test_p0_" + randomUUID()}, NOW())`;
    await sql`DELETE FROM magic_tokens WHERE email = ${TEST_EMAIL}`;
    await sql`
      INSERT INTO magic_tokens (token, email, expires_at)
      VALUES (${token}, ${TEST_EMAIL}, ${expiresAt})`;
    await sql.end();
    return { token, email: TEST_EMAIL };
  }

  const db = await readJsonDb();
  let user = db.users.find((u) => u.email === TEST_EMAIL);
  if (!user) {
    user = {
      id: TEST_USER_ID,
      email: TEST_EMAIL,
      stripeCustomerId: null,
      subscriptionStatus: "none",
      proUntil: null,
      teamId: null,
      teamRole: null,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(user);
  }

  db.magicTokens = db.magicTokens.filter((t) => t.email !== TEST_EMAIL);
  db.magicTokens.push({ token, email: TEST_EMAIL, expiresAt });

  const m = await readMetrics();
  m.payPerUseCredits = m.payPerUseCredits.filter((c) => c.email !== TEST_EMAIL);
  m.payPerUseCredits.push({
    id: randomUUID(),
    email: TEST_EMAIL,
    stripeSessionId: "cs_test_p0_" + randomUUID(),
    consumedAt: null,
    createdAt: now,
  });

  await writeJsonDb(db);
  await writeMetrics(m);
  return { token, email: TEST_EMAIL };
}

export async function countPayPerUseCredits(email = TEST_EMAIL) {
  if (usePostgres()) {
    const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
    const rows = await sql`
      SELECT COUNT(*)::int AS n FROM pay_per_use_credits
      WHERE email = ${email} AND consumed_at IS NULL`;
    await sql.end();
    return rows[0]?.n ?? 0;
  }
  const m = await readMetrics();
  return m.payPerUseCredits.filter((c) => c.email === email && !c.consumedAt).length;
}

// CLI: node scripts/verify-helpers.mjs <command>
const cmd = process.argv[2];
if (cmd) {
  const secret = await loadAuthSecret();
  if (cmd === "backup") await backupState();
  else if (cmd === "restore") await restoreState();
  else if (cmd === "seed-quota") {
    const key = await seedExceededQuota(secret);
    console.log(key);
  } else if (cmd === "clear-quota") await clearQuotaForIp(secret);
  else if (cmd === "seed-ppu") {
    const r = await seedPayPerUseSession();
    console.log(JSON.stringify(r));
  } else if (cmd === "count-ppu") {
    console.log(await countPayPerUseCredits());
  } else if (cmd === "ip-hash") {
    console.log(computeIpHash(secret));
  } else {
    console.error("Unknown command:", cmd);
    process.exit(1);
  }
}
