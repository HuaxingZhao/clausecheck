import Stripe from "stripe";
import { activateProSubscription, deactivateProSubscription } from "./entitlements";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

function isProPriceId(priceId: string | undefined | null): boolean {
  return !!priceId && priceId.startsWith("pro_monthly:");
}

export async function syncCheckoutSession(session: Stripe.Checkout.Session) {
  const priceId = session.metadata?.priceId;
  const email =
    session.customer_details?.email ||
    session.customer_email ||
    (typeof session.customer === "object" && session.customer && "email" in session.customer
      ? (session.customer as Stripe.Customer).email
      : null);

  if (!email) {
    console.warn("Checkout session missing email", session.id);
    return null;
  }

  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  if (session.mode === "subscription" && isProPriceId(priceId)) {
    let proUntil: string | null = null;
    if (session.subscription) {
      const stripe = getStripe();
      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const sub = (await stripe.subscriptions.retrieve(subId)) as unknown as {
        current_period_end: number;
      };
      proUntil = new Date(sub.current_period_end * 1000).toISOString();
    }

    return activateProSubscription({
      email,
      stripeCustomerId,
      proUntil,
      status: "active",
    });
  }

  // pay_per_use — no persistent pro; handled per scan
  return null;
}

export async function syncSubscription(subscription: Stripe.Subscription) {
  const stripe = getStripe();
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  const email = customer.email;
  if (!email) return null;

  const proUntil = new Date(
    (subscription as unknown as { current_period_end: number }).current_period_end * 1000
  ).toISOString();

  if (subscription.status === "active" || subscription.status === "trialing") {
    return activateProSubscription({
      email,
      stripeCustomerId: customerId,
      proUntil,
      status: "active",
    });
  }

  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    return deactivateProSubscription(email);
  }

  return upsertPastDue(email, customerId, proUntil, subscription.status);
}

async function upsertPastDue(
  email: string,
  stripeCustomerId: string,
  proUntil: string,
  status: Stripe.Subscription.Status
) {
  return activateProSubscription({
    email,
    stripeCustomerId,
    proUntil,
    status: status === "past_due" ? "past_due" : "canceled",
  });
}

export async function getCheckoutSessionEmail(
  sessionId: string
): Promise<{ email: string; pro: boolean } | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });

  await syncCheckoutSession(session);

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    (typeof session.customer === "object" &&
    session.customer &&
    !("deleted" in session.customer && session.customer.deleted)
      ? session.customer.email
      : null);

  if (!email) return null;

  const priceId = session.metadata?.priceId;
  const pro = session.mode === "subscription" && isProPriceId(priceId);

  return { email, pro };
}
