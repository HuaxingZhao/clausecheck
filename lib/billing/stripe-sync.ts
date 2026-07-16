import Stripe from "stripe";
import { activateProSubscription, deactivateProSubscription } from "./entitlements";
import { grantPayPerUseCredit } from "../db/scan-metrics";
import {
  downgradeToTrialQuota,
  grantAddonDocumentQuota,
  syncSubscriptionDocumentQuota,
} from "../db/document-quota";
import { writeAuditLog } from "../db/audit-log";
import {
  createTeam,
  findUserByEmail,
  upsertTeamSubscription,
  upsertUser,
} from "../db/store";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

function isSubscriptionPriceId(priceId: string | undefined | null): boolean {
  return (
    !!priceId &&
    (priceId.startsWith("pro_monthly:") ||
      priceId.startsWith("pro_annual:") ||
      priceId.startsWith("team_monthly:"))
  );
}

function isTeamPriceId(priceId: string | undefined | null): boolean {
  return !!priceId && priceId.startsWith("team_monthly:");
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

  if (session.mode === "subscription" && isSubscriptionPriceId(priceId)) {
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

    if (isTeamPriceId(priceId)) {
      let user = await findUserByEmail(email);
      if (!user) {
        user = await upsertUser(email, { stripeCustomerId });
      }
      let teamId = user.teamId;
      if (!teamId) {
        const team = await createTeam(`${email.split("@")[0]}'s Team`, user.id);
        teamId = team.id;
      }
      await upsertTeamSubscription(teamId, {
        stripeCustomerId,
        proUntil,
        subscriptionStatus: "active",
      });
      return user;
    }

    return activateProSubscription({
      email,
      stripeCustomerId,
      proUntil,
      status: "active",
    }).then(async (user) => {
      if (user?.id) {
        await syncSubscriptionDocumentQuota(user.id, "pro", proUntil);
      }
      return user;
    });
  }

  // pay_per_use — grant one scan credit (deprecated; also mirrors to document quota)
  if (session.mode === "payment" && priceId?.startsWith("pay_per_use:")) {
    await grantPayPerUseCredit(email, session.id);
    const user = await upsertUser(email, { stripeCustomerId });
    if (user?.id) {
      await grantAddonDocumentQuota(user.id, 1);
    }
    return user;
  }

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
    const user = await activateProSubscription({
      email,
      stripeCustomerId: customerId,
      proUntil,
      status: "active",
    });
    if (user?.id) {
      const plan =
        subscription.metadata?.plan === "team" ? "team" : "pro";
      await syncSubscriptionDocumentQuota(user.id, plan, proUntil);
    }
    return user;
  }

  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    const user = await deactivateProSubscription(email);
    if (user?.id) {
      await downgradeToTrialQuota(user.id);
    }
    return user;
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

export async function syncInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionRef = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription;
  if (!subscriptionRef) return null;

  const stripe = getStripe();
  const subId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;
  const subscription = await stripe.subscriptions.retrieve(subId);
  const result = await syncSubscription(subscription);
  await writeAuditLog({
    userId: subscription.metadata?.userId ?? null,
    action: "payment.invoice_succeeded",
    meta: { invoiceId: invoice.id, subscriptionId: subId },
  });
  return result;
}

export async function syncPaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const purchaseType = intent.metadata?.purchaseType;
  const userId = intent.metadata?.userId;
  if (!userId) return null;

  if (purchaseType === "pro_prepaid") {
    const cycleRaw = intent.metadata?.cycle;
    const cycle = cycleRaw === "annual" ? "annual" : "monthly";
    const customerId =
      typeof intent.customer === "string"
        ? intent.customer
        : intent.customer?.id ?? null;

    if (await alreadyGrantedProPrepaid(intent.id)) {
      return { userId, cycle, duplicate: true };
    }

    const { grantProPrepaid } = await import("./pro-prepaid");
    const granted = await grantProPrepaid({
      userId,
      cycle,
      stripeCustomerId: customerId,
    });
    if (!granted) return null;

    await writeAuditLog({
      userId,
      action: "payment.pro_prepaid",
      meta: {
        intentId: intent.id,
        cycle,
        proUntil: granted.proUntil,
        amount: intent.amount,
        currency: intent.currency,
      },
    });
    return { userId, cycle, proUntil: granted.proUntil };
  }

  if (purchaseType !== "addon") return null;

  const packs = Number(intent.metadata?.packs ?? "1");
  if (!Number.isFinite(packs) || packs < 1) return null;

  await grantAddonDocumentQuota(userId, packs);
  await writeAuditLog({
    userId,
    action: "payment.addon_succeeded",
    meta: { intentId: intent.id, packs },
  });
  return { userId, packs };
}

async function alreadyGrantedProPrepaid(intentId: string): Promise<boolean> {
  const { usePostgres, getSql, ensureSchema } = await import("../db/pg");
  if (!usePostgres()) return false;
  try {
    await ensureSchema();
    const rows = await getSql()`
      SELECT 1 FROM public.audit_log
      WHERE action = 'payment.pro_prepaid'
        AND meta->>'intentId' = ${intentId}
      LIMIT 1`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function syncPaymentMethodAttached(
  paymentMethod: Stripe.PaymentMethod
): Promise<void> {
  const customerId =
    typeof paymentMethod.customer === "string"
      ? paymentMethod.customer
      : paymentMethod.customer?.id;
  if (!customerId) return;

  const stripe = getStripe();
  try {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    });
  } catch (err) {
    console.warn("payment_method.attached: could not set default PM", err);
  }
}

export async function getCheckoutSessionEmail(
  sessionId: string
): Promise<{ email: string; pro: boolean; payPerUse: boolean } | null> {
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
  const pro = session.mode === "subscription" && isSubscriptionPriceId(priceId);
  const payPerUse = session.mode === "payment" && !!priceId?.startsWith("pay_per_use:");

  return { email, pro, payPerUse };
}
