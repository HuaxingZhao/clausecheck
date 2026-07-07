/**
 * Server-side scan authorization — tier resolution + quota enforcement.
 * Never trusts client headers or form tier fields.
 */
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { getAuthSecret } from "./env";
import { getSessionFromRequest } from "./auth/session";
import { getUserEntitlements } from "./billing/entitlements";
import {
  checkFreeQuota,
  consumePayPerUseCredit,
  countPayPerUseCredits,
  hasPayPerUseCredit,
  incrementGlobalScanCount,
  recordFreeScan,
} from "./db/scan-metrics";
import type { UserTier } from "./quota";

function hashIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const salt = getAuthSecret();
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}

export interface ScanAccess {
  allowed: boolean;
  tier: UserTier;
  userId: string | null;
  email: string | null;
  code?: string;
  error?: string;
}

export async function resolveAuthorizedScanTier(req: NextRequest): Promise<Omit<ScanAccess, "allowed">> {
  const session = await getSessionFromRequest(req);

  if (session?.sub) {
    const { pro } = await getUserEntitlements(session.sub);
    if (pro) {
      return { tier: "pro", userId: session.sub, email: session.email };
    }
    if (await hasPayPerUseCredit(session.email)) {
      return { tier: "pay_per_use", userId: session.sub, email: session.email };
    }
  }

  return {
    tier: "free",
    userId: session?.sub ?? null,
    email: session?.email ?? null,
  };
}

export async function checkScanAccess(
  req: NextRequest,
  locale: "zh" | "en" = "zh"
): Promise<ScanAccess> {
  const base = await resolveAuthorizedScanTier(req);

  if (base.tier === "pro" || base.tier === "pay_per_use") {
    return { ...base, allowed: true };
  }

  const quota = await checkFreeQuota({
    userId: base.userId,
    ipHash: hashIp(req),
    email: base.email,
  });

  if (!quota.allowed) {
    return {
      ...base,
      allowed: false,
      code: "QUOTA_EXCEEDED",
      error:
        locale === "en"
          ? "Free monthly quota exhausted. Upgrade to Pro or pay per use."
          : "本月免费额度已用完，升级专业版或按次使用",
    };
  }

  return { ...base, allowed: true };
}

export async function recordScanUsage(req: NextRequest, access: ScanAccess): Promise<void> {
  await incrementGlobalScanCount();

  if (access.tier === "pro") return;

  if (access.tier === "pay_per_use") {
    if (access.email) await consumePayPerUseCredit(access.email);
    return;
  }

  await recordFreeScan({
    userId: access.userId,
    ipHash: hashIp(req),
    email: access.email,
  });
}

export interface QuotaStatus {
  tier: UserTier;
  allowed: boolean;
  remaining: number;
  inTrialPeriod: boolean;
  payPerUseCredits: number;
}

/** Server quota snapshot for client UI sync */
export async function getQuotaStatus(req: NextRequest): Promise<QuotaStatus> {
  const base = await resolveAuthorizedScanTier(req);

  if (base.tier === "pro") {
    return {
      tier: "pro",
      allowed: true,
      remaining: -1,
      inTrialPeriod: false,
      payPerUseCredits: 0,
    };
  }

  if (base.tier === "pay_per_use" && base.email) {
    const credits = await countPayPerUseCredits(base.email);
    return {
      tier: "pay_per_use",
      allowed: credits > 0,
      remaining: credits,
      inTrialPeriod: false,
      payPerUseCredits: credits,
    };
  }

  const quota = await checkFreeQuota({
    userId: base.userId,
    ipHash: hashIp(req),
    email: base.email,
  });

  return {
    tier: "free",
    allowed: quota.allowed,
    remaining: quota.remaining,
    inTrialPeriod: quota.inTrialPeriod,
    payPerUseCredits: 0,
  };
}
