import type { BillingCycle } from "@/lib/pricing.config";
import { findUserById, updateUserEntitlementsById } from "@/lib/db/store";
import { syncSubscriptionDocumentQuota } from "@/lib/db/document-quota";
import type { SubscriptionStatus, User } from "@/lib/db/types";

/** Prepaid Pro window: monthly = 30 days, annual = 365 days. */
export function prepaidDaysForCycle(cycle: BillingCycle): number {
  return cycle === "annual" ? 365 : 30;
}

/**
 * Extend Pro from the later of `now` and any existing unexpired `proUntil`.
 * Stacking: buying again while still Pro lengthens the window.
 */
export function computeProUntilFromCycle(
  cycle: BillingCycle,
  existingProUntil?: string | null,
  now: Date = new Date()
): string {
  const days = prepaidDaysForCycle(cycle);
  const existingMs = existingProUntil ? new Date(existingProUntil).getTime() : NaN;
  const base =
    Number.isFinite(existingMs) && existingMs > now.getTime()
      ? new Date(existingMs)
      : now;
  const end = new Date(base.getTime());
  end.setUTCDate(end.getUTCDate() + days);
  return end.toISOString();
}

export async function grantProPrepaid(input: {
  userId: string;
  cycle: BillingCycle;
  stripeCustomerId?: string | null;
  status?: SubscriptionStatus;
}): Promise<{ user: User; proUntil: string } | null> {
  const user = await findUserById(input.userId);
  if (!user) return null;

  const proUntil = computeProUntilFromCycle(input.cycle, user.proUntil);
  const updated = await updateUserEntitlementsById(input.userId, {
    stripeCustomerId: input.stripeCustomerId ?? undefined,
    subscriptionStatus: input.status ?? "active",
    proUntil,
  });
  if (!updated) return null;

  await syncSubscriptionDocumentQuota(updated.id, "pro", proUntil);
  return { user: updated, proUntil };
}
