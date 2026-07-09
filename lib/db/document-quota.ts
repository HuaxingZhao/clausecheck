/**
 * Unified document review quota — replaces scan_quota + pay_per_use_credits for logged-in users.
 */
import { getQuotaForPlan, type PlanId } from "@/lib/pricing.config";
import { ensureSchema, getSql, usePostgres } from "./pg";

export const LEGACY_TRIAL_DAYS = 3;
export const LEGACY_MONTHLY_LIMIT = 3;
/** Register grant used for proportional credit → quota conversion. */
export const REGISTER_CREDIT_GRANT = 3;

export type QuotaPoolId = "main" | "legacy_ppu" | "addon";

export interface DocumentQuotaRow {
  user_id: string;
  pool_id: QuotaPoolId;
  used: number;
  quota_limit: number;
  unit: "document";
  reset_at: string | null;
  trial_start: string | null;
  legacy_month_key: string | null;
  legacy_month_used: number;
}

export interface DocumentQuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string | null;
  inLegacyTrial: boolean;
  inLegacyMonthly: boolean;
  plan: PlanId;
}

function todayMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function inLegacyTrial(trialStart: string | null): boolean {
  if (!trialStart) return true;
  const days = (Date.now() - new Date(trialStart).getTime()) / 86400000;
  return days < LEGACY_TRIAL_DAYS;
}

/** Legacy credit balances must not inflate Trial beyond Plan A (1 doc). */
function proportionalLimitFromCredits(balance: number, _proQuota: number): number {
  void _proQuota;
  void balance;
  return getQuotaForPlan("trial");
}

/** Cap non-Pro rows that were over-migrated from old credits (e.g. 10 instead of 1). */
async function normalizeTrialQuotaRow(
  userId: string,
  plan: PlanId,
  row: DocumentQuotaRow
): Promise<DocumentQuotaRow> {
  if (plan !== "trial") return row;
  const trialLimit = getQuotaForPlan("trial");
  if (row.quota_limit <= trialLimit) return row;

  await ensureSchema();
  const db = getSql();
  await db`
    UPDATE public.document_quota
       SET quota_limit = ${trialLimit},
           used = LEAST(used, ${trialLimit}),
           updated_at = now()
     WHERE user_id = ${userId} AND pool_id = 'main'`;
  return (await getMainRow(userId)) ?? { ...row, quota_limit: trialLimit, used: Math.min(row.used, trialLimit) };
}

export function documentQuotaEnabled(): boolean {
  return usePostgres();
}

async function getMainRow(userId: string): Promise<DocumentQuotaRow | null> {
  await ensureSchema();
  const db = getSql();
  const rows = await db<DocumentQuotaRow[]>`
    SELECT user_id, pool_id, used, quota_limit, unit, reset_at, trial_start,
           legacy_month_key, legacy_month_used
      FROM public.document_quota
     WHERE user_id = ${userId} AND pool_id = 'main'
     LIMIT 1`;
  return rows[0] ?? null;
}

export async function ensureMainQuotaRow(
  userId: string,
  opts?: { trialStart?: string | null; limit?: number; resetAt?: string | null }
): Promise<DocumentQuotaRow> {
  await ensureSchema();
  const db = getSql();
  const existing = await getMainRow(userId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const limit = opts?.limit ?? getQuotaForPlan("trial");
  await db`
    INSERT INTO public.document_quota (
      user_id, pool_id, used, quota_limit, unit, reset_at, trial_start, legacy_month_key, legacy_month_used
    ) VALUES (
      ${userId}, 'main', 0, ${limit}, 'document',
      ${opts?.resetAt ?? null}, ${opts?.trialStart ?? now}, ${todayMonthKey()}, 0
    )
    ON CONFLICT (user_id, pool_id) DO NOTHING`;

  return (await getMainRow(userId))!;
}

function effectiveMainLimits(row: DocumentQuotaRow): {
  used: number;
  limit: number;
  inLegacyTrial: boolean;
  inLegacyMonthly: boolean;
} {
  // Plan A: document_quota.used / quota_limit is always the source of truth.
  // Legacy trial flag is informational only — never grants unlimited scans.
  return {
    used: row.used,
    limit: row.quota_limit,
    inLegacyTrial: inLegacyTrial(row.trial_start),
    inLegacyMonthly: false,
  };
}

async function sumPoolRemaining(userId: string, excludeMain = false): Promise<number> {
  await ensureSchema();
  const db = getSql();
  const rows = excludeMain
    ? await db<{ pool_id: string; used: number; quota_limit: number }[]>`
        SELECT pool_id, used, quota_limit
          FROM public.document_quota
         WHERE user_id = ${userId} AND pool_id <> 'main'`
    : await db<{ pool_id: string; used: number; quota_limit: number }[]>`
        SELECT pool_id, used, quota_limit
          FROM public.document_quota
         WHERE user_id = ${userId}`;

  return rows.reduce((sum, r) => sum + Math.max(0, r.quota_limit - r.used), 0);
}

export async function getDocumentQuotaStatus(
  userId: string,
  plan: PlanId,
  resetAt?: string | null
): Promise<DocumentQuotaStatus> {
  if (!documentQuotaEnabled()) {
    return {
      used: 0,
      limit: getQuotaForPlan(plan),
      remaining: getQuotaForPlan(plan),
      resetAt: resetAt ?? null,
      inLegacyTrial: false,
      inLegacyMonthly: false,
      plan,
    };
  }

  let row = await ensureMainQuotaRow(userId, {
    limit: getQuotaForPlan(plan),
    resetAt: resetAt ?? undefined,
  });
  row = await normalizeTrialQuotaRow(userId, plan, row);

  const main = effectiveMainLimits(row);
  const extraRemaining = await sumPoolRemaining(userId, true);
  const mainRemaining = Math.max(0, main.limit - main.used);
  const used = main.used;
  const limit = main.limit + extraRemaining;

  return {
    used,
    limit,
    remaining: mainRemaining + extraRemaining,
    resetAt: row.reset_at,
    inLegacyTrial: main.inLegacyTrial,
    inLegacyMonthly: false,
    plan,
  };
}

/** Remaining document reviews across all pools (for UI badge). */
export async function getDocumentQuotaRemaining(userId: string, plan: PlanId): Promise<number> {
  const status = await getDocumentQuotaStatus(userId, plan);
  return status.remaining;
}

export async function consumeDocumentQuota(userId: string): Promise<boolean> {
  if (!documentQuotaEnabled()) return false;
  await ensureSchema();
  const db = getSql();
  const rows = await db<{ ok: boolean }[]>`
    SELECT public.consume_document_quota(${userId}) AS ok`;
  return rows[0]?.ok === true;
}

export async function recordMainQuotaScan(userId: string): Promise<void> {
  if (!documentQuotaEnabled()) return;
  await ensureSchema();
  const db = getSql();
  await ensureMainQuotaRow(userId);
  await db`
    UPDATE public.document_quota
       SET used = used + 1, updated_at = now()
     WHERE user_id = ${userId} AND pool_id = 'main'
       AND used < quota_limit`;
}

export async function syncSubscriptionDocumentQuota(
  userId: string,
  plan: PlanId,
  resetAt: string | null
): Promise<void> {
  if (!documentQuotaEnabled()) return;
  await ensureSchema();
  const db = getSql();
  const limit = getQuotaForPlan(plan);
  await db`
    INSERT INTO public.document_quota (
      user_id, pool_id, used, quota_limit, unit, reset_at, trial_start, legacy_month_key, legacy_month_used
    ) VALUES (
      ${userId}, 'main', 0, ${limit}, 'document', ${resetAt}, NULL, NULL, 0
    )
    ON CONFLICT (user_id, pool_id) DO UPDATE SET
      quota_limit = EXCLUDED.quota_limit,
      reset_at = EXCLUDED.reset_at,
      used = 0,
      trial_start = NULL,
      legacy_month_key = NULL,
      legacy_month_used = 0,
      updated_at = now()`;
}

export async function grantAddonDocumentQuota(userId: string, packs: number): Promise<void> {
  if (!documentQuotaEnabled() || packs < 1) return;
  await ensureSchema();
  const db = getSql();
  await db`
    INSERT INTO public.document_quota (
      user_id, pool_id, used, quota_limit, unit
    ) VALUES (
      ${userId}, 'main', 0, 0, 'document'
    )
    ON CONFLICT (user_id, pool_id) DO NOTHING`;

  await db`
    UPDATE public.document_quota
       SET quota_limit = quota_limit + ${packs},
           updated_at = now()
     WHERE user_id = ${userId} AND pool_id = 'main'`;
}

export async function downgradeToTrialQuota(userId: string): Promise<void> {
  if (!documentQuotaEnabled()) return;
  await ensureSchema();
  const db = getSql();
  const limit = getQuotaForPlan("trial");
  await db`
    UPDATE public.document_quota
       SET quota_limit = ${limit},
           reset_at = NULL,
           updated_at = now()
     WHERE user_id = ${userId} AND pool_id = 'main'`;
}

export async function getLegacyPpuRemaining(userId: string): Promise<number> {
  if (!documentQuotaEnabled()) return 0;
  await ensureSchema();
  const db = getSql();
  const rows = await db<{ used: number; quota_limit: number }[]>`
    SELECT used, quota_limit
      FROM public.document_quota
     WHERE user_id = ${userId} AND pool_id = 'legacy_ppu'
     LIMIT 1`;
  const row = rows[0];
  if (!row) return 0;
  return Math.max(0, row.quota_limit - row.used);
}

/** Bootstrap main row from legacy user_credits balance when migrating at runtime. */
export async function bootstrapQuotaFromCredits(userId: string, balance: number): Promise<void> {
  if (!documentQuotaEnabled()) return;
  const existing = await getMainRow(userId);
  if (existing) return;
  const limit = proportionalLimitFromCredits(balance, getQuotaForPlan("pro"));
  await ensureMainQuotaRow(userId, { limit, trialStart: new Date().toISOString() });
}

export async function tryConsumeDocumentQuota(
  userId: string,
  plan: PlanId
): Promise<boolean> {
  if (!documentQuotaEnabled()) return false;

  const status = await getDocumentQuotaStatus(userId, plan);
  if (status.remaining <= 0) return false;

  // Prefer atomic RPC; fall back to direct increment if RPC missing.
  const ok = await consumeDocumentQuota(userId);
  if (ok) return true;

  const row = await ensureMainQuotaRow(userId);
  if (row.used >= row.quota_limit) return false;
  await recordMainQuotaScan(userId);
  const after = await getMainRow(userId);
  return !!after && after.used > row.used;
}
