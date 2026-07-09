import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnon, supabasePhoneAuthEnabled } from "@/lib/auth/supabase-admin";
import { maskPhone, toE164 } from "@/lib/auth/phone";
import { jsonWithSession } from "@/lib/auth/session-response";
import { writeAuditLog } from "@/lib/db/audit-log";
import { upsertPhoneUser } from "@/lib/db/store";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { bootstrapNewUserCredits } from "@/lib/invite/codes";
import { getClientIp } from "@/lib/invite/request-meta";
import type { CountryCode } from "libphonenumber-js";

function msg(locale: string, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

export async function POST(req: NextRequest) {
  try {
    if (!supabasePhoneAuthEnabled()) {
      return NextResponse.json(
        { error: "Phone auth is not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const locale = body.locale === "en" ? "en" : "zh";
    const country = (typeof body.country === "string" ? body.country : "US") as CountryCode;
    const rawPhone = typeof body.phone === "string" ? body.phone : "";
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const e164 = toE164(rawPhone, country);

    if (!e164) {
      return NextResponse.json(
        {
          error: msg(locale, "请输入有效的国际手机号", "Enter a valid international phone number"),
        },
        { status: 400 }
      );
    }

    if (!/^\d{4,8}$/.test(token)) {
      return NextResponse.json(
        {
          error: msg(locale, "请输入短信验证码", "Enter the SMS verification code"),
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAnon();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: e164,
      token,
      type: "sms",
    });

    if (error || !data.user) {
      console.error("supabase phone verify error:", error?.message);
      return NextResponse.json(
        {
          error: msg(locale, "验证码无效或已过期", "Invalid or expired verification code"),
        },
        { status: 401 }
      );
    }

    const { user, created } = await upsertPhoneUser({
      phoneE164: e164,
      supabaseUserId: data.user.id,
    });

    if (created && creditsSystemEnabled()) {
      await bootstrapNewUserCredits(user.id);
    }

    await writeAuditLog({
      userId: user.id,
      action: created ? "auth.register" : "auth.phone_verify",
      meta: { method: "phone", phone: maskPhone(e164), created },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    // Sign out Supabase session — ClauseCheck uses cc_session only.
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }

    return jsonWithSession(user.id, user.email, { created, method: "phone" }, user.phoneE164);
  } catch (err) {
    console.error("phone verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
