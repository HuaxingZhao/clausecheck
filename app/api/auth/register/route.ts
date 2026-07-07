import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, getPasswordHash, setPasswordHash, upsertUser } from "@/lib/db/store";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { jsonWithSession } from "@/lib/auth/session-response";

function msg(locale: string, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, confirmPassword, locale } = await req.json();
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

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: msg(loc, "两次输入的密码不一致", "Passwords do not match") },
        { status: 400 }
      );
    }

    const norm = email.trim().toLowerCase();
    const existing = await findUserByEmail(norm);
    const existingHash = await getPasswordHash(norm);

    if (existing && existingHash) {
      return NextResponse.json(
        { error: msg(loc, "该邮箱已注册，请直接登录", "Email already registered — sign in instead") },
        { status: 409 }
      );
    }

    const user = existing ?? (await upsertUser(norm, {}));
    await setPasswordHash(norm, hashPassword(password));

    return jsonWithSession(user.id, user.email, { registered: !existing });
  } catch (err: unknown) {
    console.error("register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
