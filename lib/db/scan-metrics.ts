/**
 * Scan metrics — global counter, free-tier quota, pay-per-use credits.
 * Postgres in production; JSON file fallback for local dev without DATABASE_URL.
 *
 * Free-tier fallback (anonymous / no document_quota) follows Plan A:
 * getQuotaForPlan("trial") per calendar month — no 3-day unlimited window.
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { assertDatabaseConfigured, isProduction } from "../env";
import { getQuotaForPlan } from "../pricing.config";
import { ensureSchema, getSql, usePostgres } from "./pg";

const DATA_DIR = path.join(process.cwd(), "data");
const METRICS_FILE = path.join(DATA_DIR, "scan-metrics.json");

/** @deprecated Informational only — no longer grants unlimited scans. */
export const TRIAL_DAYS = 3;
/** Plan A trial docs per calendar-month proxy (fallback store). */
export const FREE_MONTHLY_LIMIT = getQuotaForPlan("trial");
const DEFAULT_SCAN_COUNT = 331;

type JsonMetrics = {
  globalScanCount: number;
  payPerUseCredits: Array<{
    id: string;
    email: string;
    stripeSessionId: string;
    consumedAt: string | null;
    createdAt: string;
  }>;
  scanQuota: Array<{
    id: string;
    trialStart: string | null;
    monthKey: string;
    scanCount: number;
  }>;
};

const EMPTY: JsonMetrics = {
  globalScanCount: DEFAULT_SCAN_COUNT,
  payPerUseCredits: [],
  scanQuota: [],
};

function todayMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function quotaKey(userId: string | null, ipHash: string): string {
  if (userId) return `user:${userId}`;
  return `ip:${ipHash}`;
}

function inTrial(trialStart: string | null): boolean {
  if (!trialStart) return true;
  const days = (Date.now() - new Date(trialStart).getTime()) / 86400000;
  return days < TRIAL_DAYS;
}

async function readJsonMetrics(): Promise<JsonMetrics> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(METRICS_FILE, "utf8");
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY };
  }
}

async function writeJsonMetrics(m: JsonMetrics): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(METRICS_FILE, JSON.stringify(m, null, 2), "utf8");
}

function ensureStore(): void {
  if (isProduction()) assertDatabaseConfigured();
}

/* ── Global scan counter (landing page social proof) ── */

export async function getGlobalScanCount(): Promise<number> {
  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const rows = await db<{ value: string }[]>`
      SELECT value FROM app_metrics WHERE key = 'global_scan_count' LIMIT 1`;
    if (rows[0]) return Number(rows[0].value) || DEFAULT_SCAN_COUNT;
    await db`INSERT INTO app_metrics (key, value) VALUES ('global_scan_count', ${DEFAULT_SCAN_COUNT})`;
    return DEFAULT_SCAN_COUNT;
  }
  const m = await readJsonMetrics();
  return m.globalScanCount;
}

export async function incrementGlobalScanCount(): Promise<number> {
  ensureStore();
  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const rows = await db<{ value: string }[]>`
      INSERT INTO app_metrics (key, value)
      VALUES ('global_scan_count', ${DEFAULT_SCAN_COUNT + 1})
      ON CONFLICT (key) DO UPDATE SET value = app_metrics.value + 1
      RETURNING value`;
    return Number(rows[0]?.value) || DEFAULT_SCAN_COUNT;
  }
  const m = await readJsonMetrics();
  m.globalScanCount += 1;
  await writeJsonMetrics(m);
  return m.globalScanCount;
}

/* ── Pay-per-use credits ── */

export async function grantPayPerUseCredit(
  email: string,
  stripeSessionId: string
): Promise<void> {
  ensureStore();
  const norm = email.trim().toLowerCase();
  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    await db`
      INSERT INTO pay_per_use_credits (id, email, stripe_session_id)
      VALUES (${randomUUID()}, ${norm}, ${stripeSessionId})
      ON CONFLICT (stripe_session_id) DO NOTHING`;
    return;
  }
  const m = await readJsonMetrics();
  if (m.payPerUseCredits.some((c) => c.stripeSessionId === stripeSessionId)) return;
  m.payPerUseCredits.push({
    id: randomUUID(),
    email: norm,
    stripeSessionId,
    consumedAt: null,
    createdAt: new Date().toISOString(),
  });
  await writeJsonMetrics(m);
}

export async function hasPayPerUseCredit(email: string): Promise<boolean> {
  ensureStore();
  const norm = email.trim().toLowerCase();
  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const rows = await db<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM pay_per_use_credits
      WHERE email = ${norm} AND consumed_at IS NULL`;
    return (rows[0]?.n ?? 0) > 0;
  }
  const m = await readJsonMetrics();
  return m.payPerUseCredits.some((c) => c.email === norm && !c.consumedAt);
}

export async function countPayPerUseCredits(email: string): Promise<number> {
  ensureStore();
  const norm = email.trim().toLowerCase();
  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const rows = await db<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM pay_per_use_credits
      WHERE email = ${norm} AND consumed_at IS NULL`;
    return rows[0]?.n ?? 0;
  }
  const m = await readJsonMetrics();
  return m.payPerUseCredits.filter((c) => c.email === norm && !c.consumedAt).length;
}

export async function consumePayPerUseCredit(email: string): Promise<boolean> {
  ensureStore();
  const norm = email.trim().toLowerCase();
  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const rows = await db<{ id: string }[]>`
      UPDATE pay_per_use_credits
      SET consumed_at = NOW()
      WHERE id = (
        SELECT id FROM pay_per_use_credits
        WHERE email = ${norm} AND consumed_at IS NULL
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`;
    return rows.length > 0;
  }
  const m = await readJsonMetrics();
  const credit = m.payPerUseCredits.find((c) => c.email === norm && !c.consumedAt);
  if (!credit) return false;
  credit.consumedAt = new Date().toISOString();
  await writeJsonMetrics(m);
  return true;
}

/* ── Free-tier quota ── */

export interface QuotaCheckInput {
  userId: string | null;
  ipHash: string;
  email?: string | null;
}

export interface QuotaCheckResult {
  allowed: boolean;
  inTrialPeriod: boolean;
  remaining: number;
}

export async function checkFreeQuota(input: QuotaCheckInput): Promise<QuotaCheckResult> {
  ensureStore();
  const key = quotaKey(input.userId, input.ipHash);
  const monthKey = todayMonthKey();
  const limit = FREE_MONTHLY_LIMIT;

  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const rows = await db<
      { trial_start: Date | null; month_key: string; scan_count: number }[]
    >`
      SELECT trial_start, month_key, scan_count FROM scan_quota WHERE id = ${key} LIMIT 1`;

    if (!rows[0]) {
      return { allowed: true, inTrialPeriod: true, remaining: limit };
    }

    const row = rows[0];
    const trialStart = row.trial_start?.toISOString() ?? null;
    const used = row.month_key === monthKey ? row.scan_count : 0;
    const remaining = Math.max(0, limit - used);
    return {
      allowed: remaining > 0,
      inTrialPeriod: inTrial(trialStart),
      remaining,
    };
  }

  const m = await readJsonMetrics();
  const row = m.scanQuota.find((q) => q.id === key);
  if (!row) {
    return { allowed: true, inTrialPeriod: true, remaining: limit };
  }
  const used = row.monthKey === monthKey ? row.scanCount : 0;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: remaining > 0,
    inTrialPeriod: inTrial(row.trialStart),
    remaining,
  };
}

export async function recordFreeScan(input: QuotaCheckInput): Promise<void> {
  ensureStore();
  const key = quotaKey(input.userId, input.ipHash);
  const monthKey = todayMonthKey();
  const now = new Date().toISOString();

  if (usePostgres()) {
    await ensureSchema();
    const db = getSql();
    const rows = await db<
      { trial_start: Date | null; month_key: string; scan_count: number }[]
    >`SELECT trial_start, month_key, scan_count FROM scan_quota WHERE id = ${key} LIMIT 1`;

    if (!rows[0]) {
      await db`
        INSERT INTO scan_quota (id, trial_start, month_key, scan_count)
        VALUES (${key}, ${now}, ${monthKey}, 1)`;
      return;
    }

    const row = rows[0];
    const sameMonth = row.month_key === monthKey;
    await db`
      UPDATE scan_quota SET
        trial_start = COALESCE(trial_start, ${now}::timestamptz),
        month_key = ${monthKey},
        scan_count = ${sameMonth ? row.scan_count + 1 : 1},
        updated_at = NOW()
      WHERE id = ${key}`;
    return;
  }

  const m = await readJsonMetrics();
  let row = m.scanQuota.find((q) => q.id === key);
  if (!row) {
    row = { id: key, trialStart: now, monthKey, scanCount: 1 };
    m.scanQuota.push(row);
    await writeJsonMetrics(m);
    return;
  }
  if (!row.trialStart) row.trialStart = now;
  if (row.monthKey === monthKey) row.scanCount += 1;
  else {
    row.monthKey = monthKey;
    row.scanCount = 1;
  }
  await writeJsonMetrics(m);
}
