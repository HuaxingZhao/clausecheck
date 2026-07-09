import type Stripe from "stripe";

interface RecurringPriceParams {
  lookupKey: string;
  productName: string;
  unitAmountCents: number;
  currency: "usd" | "cny";
  interval: "month" | "year";
}

/** Resolve a recurring Stripe Price id (create product + price when missing). */
export async function resolveRecurringPriceId(
  stripe: Stripe,
  params: RecurringPriceParams
): Promise<string> {
  const existing = await stripe.prices.list({
    lookup_keys: [params.lookupKey],
    active: true,
    limit: 1,
  });

  const hit = existing.data[0];
  if (
    hit &&
    hit.unit_amount === params.unitAmountCents &&
    hit.currency === params.currency &&
    hit.recurring?.interval === params.interval
  ) {
    return hit.id;
  }

  const product = await stripe.products.create({
    name: params.productName,
    metadata: { lookup_key: params.lookupKey },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: params.unitAmountCents,
    currency: params.currency,
    recurring: { interval: params.interval },
    lookup_key: params.lookupKey,
    transfer_lookup_key: true,
  });

  return price.id;
}

/** Stripe Basil+ invoices expose client_secret via confirmation_secret, not payment_intent. */
export async function extractInvoiceClientSecret(
  stripe: Stripe,
  subscription: Stripe.Subscription
): Promise<string> {
  const invoiceRef = subscription.latest_invoice;
  if (!invoiceRef) {
    throw new Error("Missing subscription invoice");
  }

  let invoice: Stripe.Invoice =
    typeof invoiceRef === "string"
      ? await stripe.invoices.retrieve(invoiceRef, { expand: ["confirmation_secret"] })
      : invoiceRef;

  if (!invoice.confirmation_secret?.client_secret && invoice.id) {
    invoice = await stripe.invoices.retrieve(invoice.id, {
      expand: ["confirmation_secret"],
    });
  }

  const secret = invoice.confirmation_secret?.client_secret;
  if (secret) return secret;

  throw new Error("Missing payment client secret");
}
