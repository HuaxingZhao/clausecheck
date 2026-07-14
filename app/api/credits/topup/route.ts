import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { sessionUserIdSchema } from "@/lib/credits/scan-form";
import { createPendingOrder } from "@/lib/credits/orders";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { isWechatPayConfigured } from "@/lib/credits/wechat-pay-config";

const topupRequestSchema = z.object({
  plan: z.enum(["pro", "boost"]),
  payment_method: z.literal("wechat"),
});

export async function POST(req: NextRequest) {
  try {
    if (!creditsSystemEnabled()) {
      return NextResponse.json({ error: "Credits system unavailable" }, { status: 503 });
    }

    if (!isWechatPayConfigured()) {
      return NextResponse.json(
        {
          error: "WECHAT_PAY_NOT_CONFIGURED",
          message:
            "WeChat top-up is not available yet. Use Stripe checkout on the pricing page, or set WECHAT_PAY_QR_BASE.",
        },
        { status: 503 }
      );
    }

    const session = await getSessionFromRequest(req);
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId: string;
    try {
      userId = sessionUserIdSchema.parse(session.sub);
    } catch {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = topupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { plan, payment_method } = parsed.data;
    const order = await createPendingOrder({
      userId,
      plan,
      paymentMethod: payment_method,
      requestOrigin: req.nextUrl.origin,
    });

    return NextResponse.json({
      order_id: order.id,
      plan: order.plan,
      amount_cents: order.amountCents,
      credits_amount: order.creditsAmount,
      payment_method: order.paymentMethod,
      status: order.status,
      payment_url: order.paymentUrl,
      qr_code_url: order.paymentUrl,
    });
  } catch (err: unknown) {
    console.error("credits topup error:", err);
    const message = err instanceof Error ? err.message : "Top-up failed";
    if (/WeChat pay is not configured/i.test(message)) {
      return NextResponse.json(
        {
          error: "WECHAT_PAY_NOT_CONFIGURED",
          message:
            "WeChat top-up is not available yet. Use Stripe checkout on the pricing page.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
