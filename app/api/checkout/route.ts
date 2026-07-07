/**
 * POST /api/checkout
 *
 * 创建 Stripe Checkout Session，返回重定向 URL。
 * 支持多币种：CNY (¥), USD ($), SGD (S$)
 *
 * 价格：
 *   - pro_monthly: ¥49 | $6.9 | S$8.9
 *   - pay_per_use:  ¥17 | $1.9 | S$2.9
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionFromRequest } from "@/lib/auth/session";

/* ---------- Stripe 实例 ---------- */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});

/* ---------- 货币元数据 ---------- */
type CurrencyCode = "cny" | "usd" | "sgd";

interface CurrencyMeta {
  symbol: string;
  locale: string;
  stripeCurrency: CurrencyCode;
}

const CURRENCIES: Record<string, CurrencyMeta> = {
  cny: { symbol: "¥", locale: "zh-CN", stripeCurrency: "cny" },
  usd: { symbol: "$", locale: "en-US", stripeCurrency: "usd" },
  sgd: { symbol: "S$", locale: "en-SG", stripeCurrency: "sgd" },
};

/* ---------- 价格表（product × currency） ---------- */
interface PriceConfig {
  amount: number; // 最小货币单位（分）
  name: string;
  mode: "subscription" | "payment";
}

const PRICES: Record<string, PriceConfig> = {
  "pro_monthly:cny": { amount: 4900, name: "ClauseCheck 专业版 · 月付", mode: "subscription" },
  "pro_monthly:usd": { amount: 690, name: "ClauseCheck Pro · Monthly", mode: "subscription" },
  "pro_monthly:sgd": { amount: 890, name: "ClauseCheck Pro · Monthly", mode: "subscription" },
  "team_monthly:cny": { amount: 19900, name: "ClauseCheck 团队版 · 月付 (5人)", mode: "subscription" },
  "team_monthly:usd": { amount: 2900, name: "ClauseCheck Team · Monthly (5 seats)", mode: "subscription" },
  "team_monthly:sgd": { amount: 3900, name: "ClauseCheck Team · Monthly (5 seats)", mode: "subscription" },
  "pay_per_use:cny": { amount: 1700, name: "ClauseCheck 按次使用", mode: "payment" },
  "pay_per_use:usd": { amount: 190, name: "ClauseCheck Pay-per-use", mode: "payment" },
  "pay_per_use:sgd": { amount: 290, name: "ClauseCheck Pay-per-use", mode: "payment" },
};

export async function POST(req: NextRequest) {
  try {
    const { priceId, currency, successUrl, cancelUrl } = await req.json();

    const currencyKey = (currency || "cny") as string;
    const compositeKey = `${priceId}:${currencyKey}`;
    const price = PRICES[compositeKey];

    if (!price) {
      return NextResponse.json(
        { error: `无效的价格类型: ${compositeKey}` },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe 未配置。请在 .env 中设置 STRIPE_SECRET_KEY" },
        { status: 500 }
      );
    }

    const cur = CURRENCIES[currencyKey];
    const base = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const session = await getSessionFromRequest(req);
    const successPath = successUrl || `${base}?checkout=success`;
    const successWithSession = successPath.includes("?")
      ? `${successPath}&session_id={CHECKOUT_SESSION_ID}`
      : `${successPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`;

    const stripeSession = await stripe.checkout.sessions.create({
      mode: price.mode,
      ...(session?.email ? { customer_email: session.email } : {}),
      ...(session?.sub ? { client_reference_id: session.sub } : {}),
      line_items: [
        {
          price_data: {
            currency: cur.stripeCurrency,
            product_data: { name: price.name },
            unit_amount: price.amount,
            ...(price.mode === "subscription"
              ? { recurring: { interval: "month" as const } }
              : {}),
          },
          quantity: 1,
        },
      ],
      success_url: successWithSession,
      cancel_url: cancelUrl || `${base}?checkout=cancelled`,
      metadata: { priceId: compositeKey },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message || "创建支付会话失败" },
      { status: 500 }
    );
  }
}
