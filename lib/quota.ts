/**
 * quota.ts — 用量控制（纯客户端方案，无数据库依赖）
 *
 * 三层定价：
 *   free       — 3 天试用期内无限，之后 3 次/月
 *   pro        — 无限
 *   pay_per_use — 单次，不追踪限额
 */

const TRIAL_DAYS = 3;
const FREE_MONTHLY_LIMIT = 3;
const STORAGE_KEY = "clausecheck_quota";

export type UserTier = "free" | "pro" | "pay_per_use";

export interface QuotaState {
  tier: UserTier;
  /** ISO 字符串 — 首次使用时间，用于计算 3 天试用期 */
  trialStart: string | null;
  /** "YYYY-MM" → 已用次数 */
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

function daysSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / 86400000;
}

function inTrial(quota: QuotaState): boolean {
  if (quota.tier !== "free") return false;
  if (!quota.trialStart) {
    // 首次使用 — 没有记录时自动开始试用
    quota.trialStart = new Date().toISOString();
    saveQuota(quota);
    return true;
  }
  return daysSince(quota.trialStart) < TRIAL_DAYS;
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
  remaining: number; // -1 = 无限
}

export function checkQuota(resetTrial: boolean = false): QuotaResult {
  const q = getQuotaState();

  // Pro — 无限
  if (q.tier === "pro") {
    return { allowed: true, tier: "pro", remaining: -1 };
  }

  // Pay-per-use — 不限次（每次都有 Stripe checkout）
  if (q.tier === "pay_per_use") {
    return { allowed: true, tier: "pay_per_use", remaining: -1 };
  }

  // Free — 试用期内无限
  if (inTrial(q)) {
    const remainingDays = Math.ceil(TRIAL_DAYS - daysSince(q.trialStart!));
    return {
      allowed: true,
      tier: "free",
      remaining: -1,
      reason: `试用期还剩 ${remainingDays} 天`,
    };
  }

  // Free — 试用期后 3 次/月
  const key = todayMonthKey();
  const used = q.monthlyUsage[key] || 0;
  const remaining = FREE_MONTHLY_LIMIT - used;

  if (remaining <= 0) {
    return {
      allowed: false,
      tier: "free",
      remaining: 0,
      reason: "本月免费额度已用完，升级专业版或按次使用",
    };
  }

  return { allowed: true, tier: "free", remaining };
}

/** 扫描成功后调用 — 增加计数 */
export function recordScan(): void {
  const q = getQuotaState();
  if (q.tier === "pro") return; // Pro 不计数
  if (q.tier === "pay_per_use") return; // 按次不追踪

  // Free — 试用期内不计数
  if (inTrial(q)) return;

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

  if (!status.allowed) {
    return {
      allowed: false,
      tier: "free",
      remaining: 0,
      reason:
        status.inTrialPeriod === false && status.remaining <= 0
          ? "本月免费额度已用完，升级专业版或按次使用"
          : undefined,
    };
  }

  if (status.inTrialPeriod) {
    return { allowed: true, tier: "free", remaining: -1, reason: "试用期内" };
  }

  return {
    allowed: true,
    tier: "free",
    remaining: status.remaining >= 0 ? status.remaining : 0,
  };
}
