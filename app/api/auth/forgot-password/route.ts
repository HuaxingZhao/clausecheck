import { NextRequest, NextResponse } from "next/server";
import { createMagicToken, findUserByEmail, getPasswordHash } from "@/lib/db/store";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { localizedPath } from "@/i18n/routing";

function msg(locale: string, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

export async function POST(req: NextRequest) {
  try {
    const { email, locale } = await req.json();
    const loc = locale === "en" ? "en" : "zh";

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: msg(loc, "请输入有效邮箱", "Valid email required") },
        { status: 400 }
      );
    }

    const norm = email.trim().toLowerCase();
    // Always return ok to avoid email enumeration
    const okBody = {
      ok: true,
      message: msg(
        loc,
        "若该邮箱已注册，重置链接已发送，请查收邮件。",
        "If an account exists for this email, a reset link has been sent."
      ),
    };

    const user = await findUserByEmail(norm);
    const hash = await getPasswordHash(norm);
    if (!user || !hash) {
      return NextResponse.json(okBody);
    }

    const token = await createMagicToken(norm);
    const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const path = localizedPath(`/reset-password?token=${token.token}`, loc);
    const link = `${base.replace(/\/$/, "")}${path}`;

    await sendPasswordResetEmail(norm, link, loc);
    return NextResponse.json(okBody);
  } catch (err: unknown) {
    console.error("forgot-password error:", err);
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
