import {
  prepaidDaysForBillingCycle,
  type BillingCycle,
} from "@/lib/pricing.config";
import { findUserById, updateUserEntitlementsById } from "@/lib/db/store";
import { syncSubscriptionDocumentQuota } from "@/lib/db/document-quota";
import type { SubscriptionStatus, User } from "@/lib/db/types";

/** Prepaid Pro window in calendar days (30 / 90 / 182 / 365). */
export function prepaidDaysForCycle(cycle: BillingCycle): number {
  return prepaidDaysForBillingCycle(cycle);
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

export function parseBillingCycle(raw: string | undefined | null): BillingCycle {
  if (raw === "quarterly" || raw === "semi_annual" || raw === "annual" || raw === "monthly") {
    return raw;
  }
  return "monthly";
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
