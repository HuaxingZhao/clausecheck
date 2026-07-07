import { NextRequest, NextResponse } from "next/server";
import { createMagicToken, upsertUser } from "@/lib/db/store";
import { sendMagicLinkEmail } from "@/lib/auth/email";

export async function POST(req: NextRequest) {
  try {
    const { email, locale } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const loc = locale === "en" ? "en" : "zh";
    const norm = email.trim().toLowerCase();

    // Ensure user row exists so verify can issue a session (Pro still from entitlements).
    await upsertUser(norm, {});

    const token = await createMagicToken(norm);
    const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const link = `${base}/api/auth/verify?token=${token.token}&locale=${loc}`;

    await sendMagicLinkEmail(norm, link, loc);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("magic-link error:", err);
    const message = err instanceof Error ? err.message : "Failed to send link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
