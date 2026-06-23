import { NextRequest, NextResponse } from "next/server";
import { createMagicToken, findUserByEmail } from "@/lib/db/store";
import { sendMagicLinkEmail } from "@/lib/auth/email";

export async function POST(req: NextRequest) {
  try {
    const { email, locale } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal whether account exists
      return NextResponse.json({ ok: true });
    }

    const token = await createMagicToken(email);
    const loc = locale === "en" ? "en" : "zh";
    const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const link = `${base}/api/auth/verify?token=${token.token}&locale=${loc}`;

    await sendMagicLinkEmail(email, link);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("magic-link error:", err);
    const message = err instanceof Error ? err.message : "Failed to send link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
