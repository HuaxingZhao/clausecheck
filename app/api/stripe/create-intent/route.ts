import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  addOnTotalPrice,
  annualBilledTotal,
  checkoutPriceId,
  getPaymentMethodTypes,
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

const intentSchema = z.discriminatedUnion("purchaseType", [
  z.object({
    purchaseType: z.literal("subscription"),
    plan: z.enum(["pro", "team"]),
    billingCycle: z.enum(["monthly", "annual"]),
    currency: z.enum(["USD", "CNY"]),
  }),
  z.object({
    purchaseType: z.literal("addon"),
    currency: z.enum(["USD", "CNY"]),
    packs: z.number().int().min(1).max(100),
  }),
]);

async function createSubscriptionIntent(
  customerId: string,
  plan: PaidPlanId,
  cycle: BillingCycle,
  currency: Currency,
  stripeCurrency: "usd" | "cny",
  paymentMethodTypes: string[],
  priceKey: string,
  userId: string
) {
  const isMonthly = cycle === "monthly";
  const unitAmount = toStripeCents(
    isMonthly
      ? monthlyUnitPrice(plan, currency, "monthly")
      : annualBilledTotal(plan, currency),
    currency
  );
  const label = `${plan.charAt(0).toUpperCase() + plan.slice(1)} · ${isMonthly ? "Monthly" : "Annual"}`;

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price_data: {
          currency: stripeCurrency,
          product_data: { name: `ClauseCheck ${label}` },
          unit_amount: unitAmount,
          recurring: { interval: isMonthly ? "month" : "year" },
        } as unknown as Stripe.SubscriptionCreateParams.Item.PriceData,
      },
    ],
    payment_behavior: "default_incomplete",
    payment_settings: {
      payment_method_types: paymentMethodTypes as Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType[],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.payment_intent"],
    metadata: { priceKey, userId, plan, cycle },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice & {
    payment_intent?: Stripe.PaymentIntent | string | null;
  };
  const pi =
    typeof invoice.payment_intent === "object" && invoice.payment_intent
      ? invoice.payment_intent
      : null;

  if (!pi?.client_secret) {
    throw new Error("Missing payment intent client secret");
  }

  return {
    clientSecret: pi.client_secret,
    subscriptionId: subscription.id,
    amount: isMonthly
      ? monthlyUnitPrice(plan, currency, "monthly")
      : annualBilledTotal(plan, currency),
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const session = await getSessionFromRequest(req);
    if (!session?.sub) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = intentSchema.parse(await req.json());
    const currency = body.currency as Currency;
    const stripeCurrency = stripeCurrencyKey(currency);

    let customerId: string | undefined;
    if (session.email) {
      const existing = await stripe.customers.list({ email: session.email, limit: 1 });
      if (existing.data[0]) {
        customerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email: session.email,
          metadata: { userId: session.sub },
        });
        customerId = created.id;
      }
    }

    if (!customerId) {
      return NextResponse.json({ error: "Customer required" }, { status: 400 });
    }

    if (body.purchaseType === "addon") {
      const amount = addOnTotalPrice(body.packs, currency);
      const paymentMethodTypes = getPaymentMethodTypes(currency, "annual", "addon");

      const intent = await stripe.paymentIntents.create({
        amount: toStripeCents(amount, currency),
        currency: stripeCurrency,
        customer: customerId,
        payment_method_types: paymentMethodTypes,
        metadata: {
          purchaseType: "addon",
          packs: String(body.packs),
          userId: session.sub,
        },
      });

      return NextResponse.json({
        clientSecret: intent.client_secret,
        purchaseType: "addon",
        amount,
        currency,
        paymentMethodTypes,
      });
    }

    const plan = body.plan as PaidPlanId;
    const cycle = body.billingCycle as BillingCycle;
    const paymentMethodTypes = getPaymentMethodTypes(currency, cycle, "subscription");
    const priceKey = checkoutPriceId(plan, cycle);

    const sub = await createSubscriptionIntent(
      customerId,
      plan,
      cycle,
      currency,
      stripeCurrency,
      paymentMethodTypes,
      priceKey,
      session.sub
    );

    return NextResponse.json({
      clientSecret: sub.clientSecret,
      purchaseType: "subscription",
      subscriptionId: sub.subscriptionId,
      amount: sub.amount,
      currency,
      paymentMethodTypes,
      plan,
      billingCycle: cycle,
    });
  } catch (err: unknown) {
    console.error("Stripe create-intent error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to create payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
