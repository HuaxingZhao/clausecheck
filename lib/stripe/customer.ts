import type Stripe from "stripe";

export type StripeBillingCurrency = "usd" | "cny";

async function getCustomerLockedCurrency(
  stripe: Stripe,
  customerId: string
): Promise<string | null> {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all",
  });
  if (subs.data[0]?.currency) return subs.data[0].currency;

  const items = await stripe.invoiceItems.list({ customer: customerId, limit: 1 });
  if (items.data[0]?.currency) return items.data[0].currency;

  const invoices = await stripe.invoices.list({ customer: customerId, limit: 1 });
  if (invoices.data[0]?.currency) return invoices.data[0].currency;

  return null;
}

/**
 * Stripe forbids mixing currencies on one Customer.
 * Resolve a customer per (userId, billing currency) — never reuse email-only SGD legacy records for USD/CNY.
 */
export async function resolveStripeCustomer(
  stripe: Stripe,
  params: { userId: string; email: string; currency: StripeBillingCurrency }
): Promise<string> {
  try {
    const search = await stripe.customers.search({
      query: `metadata['userId']:'${params.userId}' AND metadata['currency']:'${params.currency}'`,
      limit: 1,
    });
    if (search.data[0]) return search.data[0].id;
  } catch {
    /* Customer Search may be unavailable — fall back to list */
  }

  const byEmail = await stripe.customers.list({ email: params.email, limit: 20 });

  for (const customer of byEmail.data) {
    if (
      customer.metadata?.userId === params.userId &&
      customer.metadata?.currency === params.currency
    ) {
      return customer.id;
    }
  }

  for (const customer of byEmail.data) {
    const locked = await getCustomerLockedCurrency(stripe, customer.id);
    if (locked === null || locked === params.currency) {
      await stripe.customers.update(customer.id, {
        metadata: {
          ...customer.metadata,
          userId: params.userId,
          currency: params.currency,
        },
      });
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    email: params.email,
    metadata: {
      userId: params.userId,
      currency: params.currency,
    },
  });
  return created.id;
}
