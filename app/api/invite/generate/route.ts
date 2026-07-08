import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { sessionUserIdSchema } from "@/lib/credits/scan-form";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { getOrCreateInviteCode } from "@/lib/invite/codes";

export async function POST(req: NextRequest) {
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

    const row = await getOrCreateInviteCode(userId);
    const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;

    return NextResponse.json({
      code: row.code,
      created_at: row.createdAt,
      use_count: row.useCount,
      invite_url: `${base.replace(/\/$/, "")}/?invite=${row.code}`,
    });
  } catch (err: unknown) {
    console.error("invite generate error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate invite code";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
