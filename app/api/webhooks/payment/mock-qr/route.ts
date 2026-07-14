import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fulfillCreditOrder, getOrderById } from "@/lib/credits/orders";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { getTopupPlan } from "@/lib/credits/plans";
import { isMockWechatPayAllowed } from "@/lib/credits/mock-pay";

function mockDisabledResponse() {
  return NextResponse.json(
    {
      error: "Mock WeChat pay disabled",
      message:
        "Production mock cashier is off. Use a real WECHAT_PAY_QR_BASE or set ALLOW_MOCK_WECHAT_PAY=1 only for demos.",
    },
    { status: 404 }
  );
}

const querySchema = z.object({
  order_id: z.string().uuid(),
  amount_cents: z.coerce.number().int().positive(),
});

function mockPageHtml(input: {
  title: string;
  body: string;
  orderId: string;
  amountCents: number;
  showConfirm: boolean;
}): string {
  const amountYuan = (input.amountCents / 100).toFixed(2);
  const confirmForm = input.showConfirm
    ? `<form method="POST" action="/api/webhooks/payment/mock-qr" style="margin-top:24px">
        <input type="hidden" name="order_id" value="${input.orderId}" />
        <input type="hidden" name="amount_cents" value="${input.amountCents}" />
        <button type="submit" style="width:100%;padding:14px 20px;font-size:16px;border:none;border-radius:10px;background:#1a2744;color:#fff;font-weight:600">
          确认支付 ¥${amountYuan}（演示）
        </button>
      </form>
      <p style="margin-top:12px;font-size:12px;color:#888;line-height:1.5">正式环境接入微信商户后，此页将替换为真实收银台。当前为演示/mock 流程。</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${input.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f0e8; margin: 0; padding: 24px; color: #1a2744; }
    .card { max-width: 400px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 28px 24px; box-shadow: 0 8px 32px rgba(26,39,68,.08); }
    h1 { font-size: 20px; margin: 0 0 12px; }
    p { margin: 0; line-height: 1.6; color: #4a5568; font-size: 15px; }
    .amt { font-size: 32px; font-weight: 300; margin: 16px 0 8px; }
    .meta { font-size: 12px; color: #888; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${input.title}</h1>
    <p>${input.body}</p>
    <div class="amt">¥${amountYuan}</div>
    <p class="meta">订单 ${input.orderId}</p>
    ${confirmForm}
  </div>
</body>
</html>`;
}

async function loadOrderFromQuery(req: NextRequest) {
  const parsed = querySchema.safeParse({
    order_id: req.nextUrl.searchParams.get("order_id"),
    amount_cents: req.nextUrl.searchParams.get("amount_cents"),
  });
  if (!parsed.success) return { error: "invalid_query" as const };

  if (!creditsSystemEnabled()) {
    return { error: "credits_unavailable" as const };
  }

  const { order_id, amount_cents } = parsed.data;
  const order = await getOrderById(order_id);
  if (!order) return { error: "not_found" as const };
  if (order.amountCents !== amount_cents) return { error: "amount_mismatch" as const };

  return { order };
}

/** 手机扫码打开的 mock 收银台（演示微信支付，非真实商户） */
export async function GET(req: NextRequest) {
  if (!isMockWechatPayAllowed()) return mockDisabledResponse();

  const loaded = await loadOrderFromQuery(req);
  if ("error" in loaded) {
    const status =
      loaded.error === "not_found" ? 404 : loaded.error === "amount_mismatch" ? 400 : 400;
    return new NextResponse(
      mockPageHtml({
        title: "订单无效",
        body: "无法找到该支付订单，请返回电脑端重新发起支付。",
        orderId: req.nextUrl.searchParams.get("order_id") ?? "—",
        amountCents: Number(req.nextUrl.searchParams.get("amount_cents")) || 0,
        showConfirm: false,
      }),
      { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const { order } = loaded;
  const planLabel = getTopupPlan(order.plan).label;

  if (order.status === "paid") {
    return new NextResponse(
      mockPageHtml({
        title: "已支付",
        body: `「${planLabel}」订单已完成，请返回电脑端查看额度。`,
        orderId: order.id,
        amountCents: order.amountCents,
        showConfirm: false,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
    );
  }

  if (order.status !== "pending") {
    return new NextResponse(
      mockPageHtml({
        title: "订单不可支付",
        body: `当前状态：${order.status}`,
        orderId: order.id,
        amountCents: order.amountCents,
        showConfirm: false,
      }),
      { status: 409, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  return new NextResponse(
    mockPageHtml({
      title: "ClauseCheck · 微信支付",
      body: `确认支付「${planLabel}」`,
      orderId: order.id,
      amountCents: order.amountCents,
      showConfirm: true,
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}

/** 演示：用户点击确认后入账额度 */
export async function POST(req: NextRequest) {
  if (!isMockWechatPayAllowed()) return mockDisabledResponse();

  let orderId: string | null = null;
  let amountCents: number | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json()) as { order_id?: string; amount_cents?: number };
    orderId = body.order_id ?? null;
    amountCents = body.amount_cents ?? null;
  } else {
    const form = await req.formData();
    orderId = form.get("order_id")?.toString() ?? null;
    amountCents = Number(form.get("amount_cents"));
  }

  const parsed = querySchema.safeParse({ order_id: orderId, amount_cents: amountCents });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!creditsSystemEnabled()) {
    return NextResponse.json({ error: "Credits system unavailable" }, { status: 503 });
  }

  const { order_id, amount_cents } = parsed.data;
  const order = await getOrderById(order_id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.amountCents !== amount_cents) {
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }

  const tradeNo = `mock_wx_${Date.now()}`;
  const result = await fulfillCreditOrder(order_id, tradeNo);

  if (result === "not_found") {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (result === "invalid_state") {
    return NextResponse.json({ error: "Order not payable" }, { status: 409 });
  }

  const planLabel = getTopupPlan(order.plan).label;
  return new NextResponse(
    mockPageHtml({
      title: "支付成功",
      body: `「${planLabel}」已到账，请返回电脑端继续操作。`,
      orderId: order.id,
      amountCents: order.amountCents,
      showConfirm: false,
    }),
    { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }
  );
}
