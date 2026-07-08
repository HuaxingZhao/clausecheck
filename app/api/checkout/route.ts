/**
 * POST /api/checkout
 *
 * Stripe Checkout Session redirect (legacy fallback).
 * Prices derived from lib/pricing.config.ts — do not hardcode here.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  addOnTotalPrice,
  annualBilledTotal,
  checkoutPriceId,
  monthlyUnitPrice,
  stripeCurrencyKey,
  toStripeCents,
  type BillingCycle,
  type Currency,
  type PaidPlanId,
} from "@/lib/pricing.config";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});

type CheckoutPriceId =
  | ReturnType<typeof checkoutPriceId>
  | "pay_per_use";

interface ResolvedPrice {
  amountCents: number;
  name: string;
  mode: "subscription" | "payment";
  interval?: "month" | "year";
}

function resolvePrice(
  priceId: CheckoutPriceId,
  currency: Currency,
  packs = 1
): ResolvedPrice | null {
  if (priceId === "pay_per_use") {
    const amount = addOnTotalPrice(packs, currency);
    return {
      amountCents: toStripeCents(amount, currency),
      name: currency === "CNY" ? "ClauseCheck 加油包" : "ClauseCheck Add-on",
      mode: "payment",
    };
  }

  const match = priceId.match(/^(pro|team)_(monthly|annual)$/);
  if (!match) return null;

  const plan = match[1] as PaidPlanId;
  const cycle = match[2] as BillingCycle;
  const isZh = currency === "CNY";
  const planLabel = plan === "pro" ? (isZh ? "专业版" : "Pro") : isZh ? "团队版" : "Team";
  const cycleLabel =
    cycle === "annual" ? (isZh ? "年付" : "Annual") : isZh ? "月付" : "Monthly";

  if (cycle === "annual") {
    const amount = annualBilledTotal(plan, currency);
    return {
      amountCents: toStripeCents(amount, currency),
      name: `ClauseCheck ${planLabel} · ${cycleLabel}`,
      mode: "subscription",
      interval: "year",
    };
  }

  const amount = monthlyUnitPrice(plan, currency, "monthly");
  return {
    amountCents: toStripeCents(amount, currency),
    name: `ClauseCheck ${planLabel} · ${cycleLabel}`,
    mode: "subscription",
    interval: "month",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { priceId, currency: rawCurrency, successUrl, cancelUrl, packs } =
      await req.json();

    const currencyKey = (rawCurrency || "usd") as string;
    const currency: Currency = currencyKey === "cny" ? "CNY" : "USD";
    const compositeKey = priceId as CheckoutPriceId;
    const price = resolvePrice(compositeKey, currency, packs ?? 1);

    if (!price) {
      return NextResponse.json(
        { error: `Invalid price: ${compositeKey}:${currencyKey}` },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

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
            currency: stripeCurrencyKey(currency),
            product_data: { name: price.name },
            unit_amount: price.amountCents,
            ...(price.mode === "subscription"
              ? { recurring: { interval: price.interval ?? "month" } }
              : {}),
          },
          quantity: 1,
        },
      ],
      success_url: successWithSession,
      cancel_url: cancelUrl || `${base}?checkout=cancelled`,
      metadata: { priceId: `${compositeKey}:${currencyKey}` },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
