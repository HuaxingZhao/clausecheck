import type Stripe from "stripe";

export type StripeBillingCurrency = "usd" | "cny";

/**
 * Stripe forbids mixing currencies on one Customer.
 * Resolve a customer per (userId, billing currency) — never reuse email-only SGD legacy records for USD/CNY.
 *
 * Fast path: Customer Search by metadata. If missing, create immediately.
 * Avoids per-customer subscriptions/invoices list probes (was multi-second).
 */
export async function resolveStripeCustomer(
  stripe: Stripe,
  params: {
    userId: string;
    email?: string | null;
    phone?: string | null;
    currency: StripeBillingCurrency;
  }
): Promise<string> {
  try {
    const search = await stripe.customers.search({
      query: `metadata['userId']:'${params.userId}' AND metadata['currency']:'${params.currency}'`,
      limit: 1,
    });
    if (search.data[0]) return search.data[0].id;
  } catch {
    /* Customer Search may be unavailable — fall back below */
  }

  if (params.email) {
    try {
      const byEmail = await stripe.customers.list({ email: params.email, limit: 10 });
      for (const customer of byEmail.data) {
        if (
          customer.metadata?.userId === params.userId &&
          customer.metadata?.currency === params.currency
        ) {
          return customer.id;
        }
      }
    } catch {
      /* ignore list errors; create below */
    }
  }

  const created = await stripe.customers.create({
    ...(params.email ? { email: params.email } : {}),
    ...(params.phone ? { phone: params.phone } : {}),
    metadata: {
      userId: params.userId,
      currency: params.currency,
    },
  });
  return created.id;
}
