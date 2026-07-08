import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { sessionUserIdSchema } from "@/lib/credits/scan-form";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { getInviteStats, getOrCreateInviteCode } from "@/lib/invite/codes";
import { INVITE_CODE_MAX_USES } from "@/lib/invite/constants";

export async function GET(req: NextRequest) {
  try {
    if (!creditsSystemEnabled()) {
      return NextResponse.json({ error: "Invite system unavailable" }, { status: 503 });
    }

    const session = await getSessionFromRequest(req);
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: string;
    try {
      userId = sessionUserIdSchema.parse(session.sub);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const stats = await getInviteStats(userId);
    let code = stats.code;
    let useCount = 0;

    if (!code) {
      const row = await getOrCreateInviteCode(userId);
      code = row.code;
      useCount = row.useCount;
    } else {
      const row = await getOrCreateInviteCode(userId);
      useCount = row.useCount;
    }

    const localeParam = req.nextUrl.searchParams.get("locale");
    const locale = localeParam === "en" ? "en" : "zh";
    const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const inviteUrl = `${base.replace(/\/$/, "")}/${locale}?invite=${code}`;

    return NextResponse.json({
      code,
      invite_url: inviteUrl,
      invite_count: stats.inviteCount,
      credits_earned: stats.creditsEarned,
      use_count: useCount,
      max_uses: INVITE_CODE_MAX_USES,
    });
  } catch (err: unknown) {
    console.error("invite stats error:", err);
    return NextResponse.json({ error: "Failed to load invite stats" }, { status: 500 });
  }
}
