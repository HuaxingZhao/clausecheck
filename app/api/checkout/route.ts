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
  amount: number;
  name: string;
  mode: "subscription" | "payment";
  interval?: "month" | "year";
}

const PRICES: Record<string, PriceConfig & { interval?: "month" | "year" }> = {
  "pro_monthly:usd": { amount: 2900, name: "ClauseCheck Pro · Monthly", mode: "subscription", interval: "month" },
  "pro_annual:usd": { amount: 29580, name: "ClauseCheck Pro · Annual", mode: "subscription", interval: "year" },
  "team_monthly:usd": { amount: 7900, name: "ClauseCheck Team · Monthly", mode: "subscription", interval: "month" },
  "team_annual:usd": { amount: 80580, name: "ClauseCheck Team · Annual", mode: "subscription", interval: "year" },
  "pro_monthly:cny": { amount: 19900, name: "ClauseCheck 专业版 · 月付", mode: "subscription", interval: "month" },
  "pro_annual:cny": { amount: 202980, name: "ClauseCheck 专业版 · 年付", mode: "subscription", interval: "year" },
  "team_monthly:cny": { amount: 49900, name: "ClauseCheck 团队版 · 月付", mode: "subscription", interval: "month" },
  "team_annual:cny": { amount: 508980, name: "ClauseCheck 团队版 · 年付", mode: "subscription", interval: "year" },
  "pay_per_use:usd": { amount: 500, name: "ClauseCheck Add-on (+1 review)", mode: "payment" },
  "pay_per_use:cny": { amount: 3900, name: "ClauseCheck 加油包 (+1 份)", mode: "payment" },
  "pay_per_use:sgd": { amount: 700, name: "ClauseCheck Add-on", mode: "payment" },
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
              ? {
                  recurring: {
                    interval: (price.interval ?? "month") as "month" | "year",
                  },
                }
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
