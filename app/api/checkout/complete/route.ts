import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/db/store";
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session";
import { getCheckoutSessionEmail } from "@/lib/billing/stripe-sync";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const result = await getCheckoutSessionEmail(sessionId);
    if (!result) {
      return NextResponse.json({ error: "Invalid checkout session" }, { status: 400 });
    }

    const user = await findUserByEmail(result.email);
    const res = NextResponse.json({
      ok: true,
      email: result.email,
      pro: result.pro,
      authenticated: !!user,
    });

    if (user && result.pro) {
      const token = await createSessionToken({ sub: user.id, email: user.email });
      res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    }

    return res;
  } catch (err: unknown) {
    console.error("checkout complete error:", err);
    const message = err instanceof Error ? err.message : "Failed to complete checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
