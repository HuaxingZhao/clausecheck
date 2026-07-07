import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, getPasswordHash } from "@/lib/db/store";
import { validatePassword, verifyPassword } from "@/lib/auth/password";
import { jsonWithSession } from "@/lib/auth/session-response";

function msg(locale: string, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, locale } = await req.json();
    const loc = locale === "en" ? "en" : "zh";

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: msg(loc, "请输入有效邮箱", "Valid email required") },
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

    const norm = email.trim().toLowerCase();
    const user = await findUserByEmail(norm);
    if (!user) {
      return NextResponse.json(
        { error: msg(loc, "邮箱或密码不正确", "Incorrect email or password") },
        { status: 401 }
      );
    }

    const hash = await getPasswordHash(norm);
    if (!hash || !verifyPassword(password, hash)) {
      return NextResponse.json(
        { error: msg(loc, "邮箱或密码不正确", "Incorrect email or password") },
        { status: 401 }
      );
    }

    return jsonWithSession(user.id, user.email);
  } catch (err: unknown) {
    console.error("login error:", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
