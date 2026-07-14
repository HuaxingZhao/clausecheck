import { NextRequest, NextResponse } from "next/server";
import { consumeMagicToken, setPasswordHash } from "@/lib/db/store";
import { hashPassword, validatePassword } from "@/lib/auth/password";

function msg(locale: string, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

export async function POST(req: NextRequest) {
  try {
    const { token, password, confirmPassword, locale } = await req.json();
    const loc = locale === "en" ? "en" : "zh";

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: msg(loc, "重置链接无效", "Invalid reset link") },
        { status: 400 }
      );
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      return NextResponse.json(
        { error: msg(loc, "密码至少 8 位", "Password must be at least 8 characters") },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: msg(loc, "两次输入的密码不一致", "Passwords do not match") },
        { status: 400 }
      );
    }

    const email = await consumeMagicToken(token, "password_reset");
    if (!email) {
      return NextResponse.json(
        {
          error: msg(
            loc,
            "重置链接已过期或无效，请重新申请",
            "Reset link expired or invalid — request a new one"
          ),
        },
        { status: 410 }
      );
    }

    await setPasswordHash(email, hashPassword(password));
    return NextResponse.json({
      ok: true,
      message: msg(loc, "密码已更新，请使用新密码登录", "Password updated — please sign in"),
    });
  } catch (err: unknown) {
    console.error("reset-password error:", err);
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
