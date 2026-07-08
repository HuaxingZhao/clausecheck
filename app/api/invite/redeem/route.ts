import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { sessionUserIdSchema } from "@/lib/credits/scan-form";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { InviteRedeemError, redeemInviteCode } from "@/lib/invite/codes";
import { getClientIp, hashGuardKey, normalizeInviteCode } from "@/lib/invite/request-meta";
import { trackBusinessEvent, reportApi5xx } from "@/lib/monitoring";

const redeemSchema = z.object({
  code: z.string().min(1),
  device_fingerprint: z.string().min(8).max(128),
});

function msg(locale: string, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

function redeemErrorMessage(code: InviteRedeemError["code"], locale: string): string {
  switch (code) {
    case "INVALID_CODE":
      return msg(locale, "邀请码无效", "Invalid invite code");
    case "CODE_EXHAUSTED":
      return msg(locale, "邀请码已失效（已达使用上限）", "Invite code has expired");
    case "SELF_INVITE":
      return msg(locale, "不能使用自己的邀请码", "You cannot use your own invite code");
    case "ALREADY_REDEEMED":
      return msg(locale, "该账户已兑换过邀请码", "This account already redeemed an invite");
    case "DEVICE_RATE_LIMIT":
      return msg(locale, "该设备 24 小时内已兑换过邀请码", "This device already redeemed an invite in the last 24 hours");
    case "IP_RATE_LIMIT":
      return msg(locale, "该网络 24 小时内已兑换过邀请码", "This network already redeemed an invite in the last 24 hours");
    default:
      return msg(locale, "邀请系统暂不可用", "Invite system unavailable");
  }
}

export async function POST(req: NextRequest) {
  const locale =
    req.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";
  let monitorUserId: string | null = null;

  try {
    if (!creditsSystemEnabled()) {
      return NextResponse.json(
        { error: redeemErrorMessage("SYSTEM_UNAVAILABLE", locale), code: "SYSTEM_UNAVAILABLE" },
        { status: 503 }
      );
    }

    const session = await getSessionFromRequest(req);
    if (!session?.sub) {
      return NextResponse.json({ error: msg(locale, "请先登录", "Sign in required") }, { status: 401 });
    }

    let userId: string;
    try {
      userId = sessionUserIdSchema.parse(session.sub);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    monitorUserId = userId;

    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const code = normalizeInviteCode(parsed.data.code);
    if (!code) {
      return NextResponse.json(
        { error: redeemErrorMessage("INVALID_CODE", locale), code: "INVALID_CODE" },
        { status: 400 }
      );
    }

    const deviceKey = hashGuardKey(parsed.data.device_fingerprint);
    const ipKey = hashGuardKey(getClientIp(req));

    const result = await redeemInviteCode({
      code,
      redeemerUserId: userId,
      deviceKey,
      ipKey,
    });

    void trackBusinessEvent({
      event: "invite_redeemed",
      route: "/api/invite/redeem",
      user_id: userId,
      duration_ms: 0,
    });

    return NextResponse.json({
      redeemed: true,
      credits_granted: result.creditsGranted,
      inviter_user_id: result.inviterUserId,
    });
  } catch (err: unknown) {
    if (err instanceof InviteRedeemError) {
      return NextResponse.json(
        {
          error: redeemErrorMessage(err.code, locale),
          code: err.code,
        },
        { status: err.code === "INVALID_CODE" || err.code === "SELF_INVITE" ? 400 : 409 }
      );
    }
    console.error("invite redeem error:", err);
    reportApi5xx("/api/invite/redeem", err, { user_id: monitorUserId, route: "/api/invite/redeem" });
    return NextResponse.json({ error: "Redeem failed" }, { status: 500 });
  }
}
