/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook — persists Pro subscription state server-side.
 * Configure in Stripe Dashboard: https://your-domain/api/webhooks/stripe
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  syncCheckoutSession,
  syncInvoicePaymentSucceeded,
  syncPaymentIntentSucceeded,
  syncPaymentMethodAttached,
  syncSubscription,
} from "@/lib/billing/stripe-sync";
import { getStripeWebhookSecret } from "@/lib/env";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia" as any,
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    const webhookSecret = getStripeWebhookSecret();
    if (!webhookSecret) {
      event = JSON.parse(body) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await syncCheckoutSession(session);
      console.log(`✅ checkout.session.completed — ${session.id}`);
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      console.log(`✅ ${event.type} — ${subscription.id}`);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      console.log(`⚠️ subscription deleted — ${subscription.id}`);
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      await syncInvoicePaymentSucceeded(invoice);
      console.log(`✅ invoice.payment_succeeded — ${invoice.id}`);
    }

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await syncPaymentIntentSucceeded(intent);
      console.log(`✅ payment_intent.succeeded — ${intent.id}`);
    }

    if (event.type === "payment_method.attached") {
      const paymentMethod = event.data.object as Stripe.PaymentMethod;
      await syncPaymentMethodAttached(paymentMethod);
      console.log(`✅ payment_method.attached — ${paymentMethod.id}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
