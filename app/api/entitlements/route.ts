import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getUserEntitlements } from "@/lib/billing/entitlements";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ pro: false, tier: "free", authenticated: false });
  }

  const { pro, tier, user, payPerUseCredits } = await getUserEntitlements(session.sub);
  return NextResponse.json({
    authenticated: true,
    email: user?.email,
    pro,
    tier,
    payPerUseCredits,
  });
}
