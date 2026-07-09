import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAnon, supabasePhoneAuthEnabled } from "@/lib/auth/supabase-admin";
import { maskPhone, toE164 } from "@/lib/auth/phone";
import { writeAuditLog } from "@/lib/db/audit-log";
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
    const e164 = toE164(rawPhone, country);

    if (!e164) {
      return NextResponse.json(
        {
          error: msg(locale, "请输入有效的国际手机号", "Enter a valid international phone number"),
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAnon();
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });

    if (error) {
      console.error("supabase phone send error:", error.message);
      return NextResponse.json(
        {
          error: msg(
            locale,
            "验证码发送失败，请稍后重试",
            "Failed to send verification code. Please try again."
          ),
        },
        { status: 502 }
      );
    }

    await writeAuditLog({
      action: "auth.phone_send",
      meta: { phone: maskPhone(e164) },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({
      ok: true,
      phone: e164,
      masked: maskPhone(e164),
      message: msg(
        locale,
        "验证码已发送，5 分钟内有效",
        "Verification code sent. Valid for 5 minutes."
      ),
    });
  } catch (err) {
    console.error("phone send error:", err);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
}
