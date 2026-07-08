import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { sessionUserIdSchema } from "@/lib/credits/scan-form";
import { creditsSystemEnabled, getUserCreditBalance } from "@/lib/credits/user-credits";

export async function GET(req: NextRequest) {
  try {
    if (!creditsSystemEnabled()) {
      return NextResponse.json({ error: "Credits system unavailable" }, { status: 503 });
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

    const balance = await getUserCreditBalance(userId);
    return NextResponse.json({ balance });
  } catch (err: unknown) {
    console.error("user credits error:", err);
    return NextResponse.json({ error: "Failed to load credits" }, { status: 500 });
  }
}
