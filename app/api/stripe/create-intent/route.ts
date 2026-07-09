import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  addOnTotalPrice,
  annualBilledTotal,
  checkoutPriceId,
  getAddOnPaymentMethodTypes,
  getSubscriptionPaymentMethodTypes,
  isCheckoutEnabled,
  monthlyUnitPrice,
  stripeCurrencyKey,
  toStripeCents,
  type BillingCycle,
  type CheckoutPlanId,
  type Currency,
} from "@/lib/pricing.config";
import {
  extractInvoiceClientSecret,
  resolveRecurringPriceId,
} from "@/lib/stripe/recurring-price";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});

const intentSchema = z.discriminatedUnion("purchaseType", [
  z.object({
    purchaseType: z.literal("subscription"),
    plan: z.literal("pro"),
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
  plan: CheckoutPlanId,
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
  const label = `ClauseCheck ${plan.charAt(0).toUpperCase() + plan.slice(1)} · ${isMonthly ? "Monthly" : "Annual"}`;
  const lookupKey = `${priceKey}_${stripeCurrency}`;

  const stripePriceId = await resolveRecurringPriceId(stripe, {
    lookupKey,
    productName: label,
    unitAmountCents: unitAmount,
    currency: stripeCurrency,
    interval: isMonthly ? "month" : "year",
  });

  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: stripePriceId }],
    payment_behavior: "default_incomplete",
    payment_settings: {
      payment_method_types: paymentMethodTypes as Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType[],
      save_default_payment_method: "on_subscription",
    },
    expand: ["latest_invoice.confirmation_secret"],
    metadata: { priceKey, userId, plan, cycle },
  });

  const clientSecret = await extractInvoiceClientSecret(stripe, subscription);

  return {
    clientSecret,
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
      const paymentMethodTypes = getAddOnPaymentMethodTypes(currency);

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

    const plan = body.plan as CheckoutPlanId;
    if (!isCheckoutEnabled(plan)) {
      return NextResponse.json(
        { error: "Checkout is not available for this plan" },
        { status: 403 }
      );
    }
    const cycle = body.billingCycle as BillingCycle;
    const paymentMethodTypes = getSubscriptionPaymentMethodTypes(currency, cycle);
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
