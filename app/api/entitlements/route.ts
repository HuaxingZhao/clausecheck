import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { documentQuotaEnabled, getDocumentQuotaStatus } from "@/lib/db/document-quota";
import { tierToPlan } from "@/lib/pricing.config";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ pro: false, tier: "free", authenticated: false });
  }

  const { pro, tier, user, payPerUseCredits } = await getUserEntitlements(session.sub);
  const plan = tierToPlan(tier, pro);

  let quota: Awaited<ReturnType<typeof getDocumentQuotaStatus>> | null = null;
  if (documentQuotaEnabled()) {
    quota = await getDocumentQuotaStatus(session.sub, plan, user?.proUntil ?? null);
  }

  return NextResponse.json({
    authenticated: true,
    email: user?.email,
    pro,
    tier,
    plan,
    payPerUseCredits,
    quotaLimit: quota?.limit,
    quotaUsed: quota?.used,
    quotaRemaining: quota?.remaining,
    resetAt: quota?.resetAt ?? user?.proUntil ?? null,
    inTrialPeriod: quota?.inLegacyTrial ?? false,
  });
}
