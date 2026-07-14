/**
 * quota.ts — client UX helpers for document-review quota.
 *
 * Server (`document_quota` / Plan A) is authoritative when `/api/quota` works.
 * Local fallback mirrors Plan A trial: getQuotaForPlan("trial") per calendar month
 * as a coarse offline proxy (currently 1) — never “3-day unlimited”.
 */

import { getQuotaForPlan } from "@/lib/pricing.config";

const STORAGE_KEY = "clausecheck_quota";

export type UserTier = "free" | "pro" | "pay_per_use";

export interface QuotaState {
  tier: UserTier;
  /** ISO — first local scan timestamp (analytics / legacy only; not unlimited trial) */
  trialStart: string | null;
  /** "YYYY-MM" → local used count for offline fallback */
  monthlyUsage: Record<string, number>;
  /** Stripe webhook 写入的验证 token */
  proToken: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function todayMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function trialLimit(): number {
  return getQuotaForPlan("trial");
}

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

export function getQuotaState(): QuotaState {
  if (typeof window === "undefined") {
    return { tier: "free", trialStart: null, monthlyUsage: {}, proToken: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tier: "free", trialStart: null, monthlyUsage: {}, proToken: null };
    return JSON.parse(raw) as QuotaState;
  } catch {
    return { tier: "free", trialStart: null, monthlyUsage: {}, proToken: null };
  }
}

export function saveQuota(state: QuotaState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ------------------------------------------------------------------ */
/*  Quota check                                                        */
/* ------------------------------------------------------------------ */

export interface QuotaResult {
  allowed: boolean;
  reason?: string;
  tier: UserTier;
  remaining: number; // -1 = unlimited (Pro only)
}

/** Offline / API-failure fallback — Plan A trial limit, not legacy 3-day unlimited. */
export function checkQuota(_resetTrial: boolean = false): QuotaResult {
  void _resetTrial;
  const q = getQuotaState();

  if (q.tier === "pro") {
    return { allowed: true, tier: "pro", remaining: -1 };
  }

  if (q.tier === "pay_per_use") {
    return { allowed: true, tier: "pay_per_use", remaining: -1 };
  }

  const limit = trialLimit();
  const key = todayMonthKey();
  const used = q.monthlyUsage[key] || 0;
  const remaining = Math.max(0, limit - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      tier: "free",
      remaining: 0,
      reason: "quota_exhausted",
    };
  }

  return { allowed: true, tier: "free", remaining };
}

/** 扫描成功后调用 — 增加本地计数（服务端另有权威扣减） */
export function recordScan(): void {
  const q = getQuotaState();
  if (q.tier === "pro") return;
  if (q.tier === "pay_per_use") return;

  if (!q.trialStart) {
    q.trialStart = new Date().toISOString();
  }

  const key = todayMonthKey();
  q.monthlyUsage[key] = (q.monthlyUsage[key] || 0) + 1;
  saveQuota(q);
}

/** Stripe 付款成功后调用 */
export function setPro(token?: string): void {
  const q = getQuotaState();
  q.tier = "pro";
  if (token) q.proToken = token;
  saveQuota(q);
}

/** 从服务端 entitlements 同步 Pro 状态 */
export function syncProFromServer(serverPro: boolean): void {
  if (serverPro) setPro();
  else clearPro();
}

/** 清除本地 Pro 状态（订阅已过期或未登录验证） */
export function clearPro(): void {
  const q = getQuotaState();
  q.tier = "free";
  q.proToken = null;
  saveQuota(q);
}

export const PRO_EMAIL_KEY = "clausecheck_pro_email";

export function saveProEmail(email: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRO_EMAIL_KEY, email.trim().toLowerCase());
}

export function getProEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PRO_EMAIL_KEY);
}

/** 「按次使用」模式 — 单次不改变持久状态 */
export function usePayPerUse(): void {
  // 不做任何持久化 — 每次扫描由 Stripe checkout 控制
}

export function isPro(): boolean {
  return getQuotaState().tier === "pro";
}

export function getRemaining(): number {
  return checkQuota().remaining;
}

export interface ServerQuotaStatus {
  tier: UserTier;
  allowed: boolean;
  remaining: number;
  inTrialPeriod: boolean;
  payPerUseCredits: number;
  quotaLimit?: number;
  quotaUsed?: number;
  resetAt?: string | null;
  plan?: string;
}

/** Sync local UX state from GET /api/quota (server is authoritative). */
export function applyServerQuota(status: ServerQuotaStatus): QuotaResult {
  const q = getQuotaState();

  if (status.tier === "pro") {
    q.tier = "pro";
    saveQuota(q);
    return { allowed: true, tier: "pro", remaining: -1 };
  }

  if (status.tier === "pay_per_use") {
    q.tier = "free";
    saveQuota(q);
    return {
      allowed: status.allowed && status.payPerUseCredits > 0,
      tier: "pay_per_use",
      remaining: status.payPerUseCredits,
    };
  }

  q.tier = "free";
  saveQuota(q);

  const remaining =
    typeof status.remaining === "number" && status.remaining >= 0
      ? status.remaining
      : 0;

  if (!status.allowed || remaining <= 0) {
    return {
      allowed: false,
      tier: "free",
      remaining: 0,
      reason: "quota_exhausted",
    };
  }

  // Do NOT treat inTrialPeriod as unlimited — Plan A trial still has a finite count.
  return {
    allowed: true,
    tier: "free",
    remaining,
  };
}
