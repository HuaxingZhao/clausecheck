import { NextRequest, NextResponse } from "next/server";
import { fulfillCreditOrder, getOrderById } from "@/lib/credits/orders";
import {
  getPaymentWebhookSecret,
  isPaymentWebhookConfigured,
  paymentWebhookPayloadSchema,
  verifyPaymentWebhookSignature,
} from "@/lib/credits/payment-webhook";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { reportApi5xx, trackBusinessEvent } from "@/lib/monitoring";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-payment-signature");
  const secret = getPaymentWebhookSecret();

  if (isPaymentWebhookConfigured()) {
    if (!verifyPaymentWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error(
      "PAYMENT_WEBHOOK_SECRET missing in production — set on Vercel and redeploy; npm run verify:env"
    );
    return NextResponse.json(
      {
        error: "Webhook not configured",
        message: "PAYMENT_WEBHOOK_SECRET is required in production",
      },
      { status: 500 }
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = paymentWebhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { order_id, provider_trade_no, amount_cents } = parsed.data;

  if (!creditsSystemEnabled()) {
    return NextResponse.json({ error: "Credits system unavailable" }, { status: 503 });
  }

  try {
    const order = await getOrderById(order_id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.amountCents !== amount_cents) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    const result = await fulfillCreditOrder(order_id, provider_trade_no);

    if (result === "not_found") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (result === "invalid_state") {
      return NextResponse.json({ error: "Order not payable" }, { status: 409 });
    }

    if (result === "fulfilled") {
      void trackBusinessEvent({
        event: "payment_success",
        route: "/api/webhooks/payment",
        user_id: order.userId,
        plan_type: order.plan,
        duration_ms: Date.now() - Date.parse(order.createdAt),
      });
    }

    return NextResponse.json({
      ok: true,
      order_id,
      status: result === "already_paid" ? "already_paid" : "paid",
      idempotent: result === "already_paid",
    });
  } catch (err: unknown) {
    console.error("payment webhook error:", err);
    reportApi5xx("/api/webhooks/payment", err, { route: "/api/webhooks/payment" });
    const message = err instanceof Error ? err.message : "Handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
