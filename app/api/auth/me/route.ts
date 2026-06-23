import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getUserEntitlements, isProUser } from "@/lib/billing/entitlements";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ authenticated: false, pro: false, tier: "free" });
  }

  const { user, pro, tier } = await getUserEntitlements(session.sub);
  if (!user) {
    return NextResponse.json({ authenticated: false, pro: false, tier: "free" });
  }

  return NextResponse.json({
    authenticated: true,
    email: user.email,
    pro,
    tier,
    subscriptionStatus: user.subscriptionStatus,
    proUntil: user.proUntil,
  });
}
