import { NextRequest, NextResponse } from "next/server";
import { createMagicToken, findUserByEmail } from "@/lib/db/store";
import { sendPasswordResetEmail } from "@/lib/auth/email";
import { localizedPath } from "@/i18n/routing";
import { getEmailFrom, isEmailFromUnreliable } from "@/lib/env";

function msg(locale: string, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

export async function POST(req: NextRequest) {
  let loc: "zh" | "en" = "zh";
  try {
    const { email, locale } = await req.json();
    loc = locale === "en" ? "en" : "zh";

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: msg(loc, "请输入有效邮箱", "Valid email required") },
        { status: 400 }
      );
    }

    if (isEmailFromUnreliable(getEmailFrom())) {
      return NextResponse.json(
        {
          error: msg(
            loc,
            "邮件服务未正确配置（EMAIL_FROM）。请改用 Google 登录，或联系管理员。",
            "Email delivery is not configured (EMAIL_FROM). Please use Google sign-in or contact support."
          ),
        },
        { status: 503 }
      );
    }

    const norm = email.trim().toLowerCase();
    // Anti-enumeration copy when account is absent
    const okBody = {
      ok: true,
      message: msg(
        loc,
        "若该邮箱已注册，重置链接已发送，请查收邮件（含垃圾箱）。",
        "If an account exists for this email, a reset link has been sent. Check spam too."
      ),
    };

    // Allow Google-only accounts to set a password via reset (no password_hash required)
    const user = await findUserByEmail(norm);
    if (!user) {
      return NextResponse.json(okBody);
    }

    const token = await createMagicToken(norm, 30, "password_reset");
    const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const path = localizedPath(`/reset-password?token=${token.token}`, loc);
    const link = `${base.replace(/\/$/, "")}${path}`;

    await sendPasswordResetEmail(norm, link, loc);
    return NextResponse.json(okBody);
  } catch (err: unknown) {
    console.error("forgot-password error:", err);
    return NextResponse.json(
      {
        error: msg(
          loc,
          "重置邮件发送失败。可改用 Google 登录，或联系 support@clausecheck.cc",
          "Could not send reset email. Try Google sign-in, or contact support@clausecheck.cc"
        ),
      },
      { status: 500 }
    );
  }
}
