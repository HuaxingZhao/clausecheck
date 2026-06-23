import { findUserByEmail, findUserById, upsertUser } from "../db/store";
import type { SubscriptionStatus, User } from "../db/types";
import type { UserTier } from "../quota";

export function isProUser(user: User | null): boolean {
  if (!user) return false;
  if (user.subscriptionStatus === "active") {
    if (!user.proUntil) return true;
    return new Date(user.proUntil).getTime() > Date.now();
  }
  if (user.proUntil && new Date(user.proUntil).getTime() > Date.now()) {
    return true;
  }
  return false;
}

export function tierForUser(user: User | null): UserTier {
  return isProUser(user) ? "pro" : "free";
}

export async function getUserEntitlements(userId: string) {
  const user = await findUserById(userId);
  return {
    user,
    pro: isProUser(user),
    tier: tierForUser(user),
  };
}

export async function activateProSubscription(input: {
  email: string;
  stripeCustomerId?: string | null;
  proUntil?: string | null;
  status?: SubscriptionStatus;
}) {
  return upsertUser(input.email, {
    stripeCustomerId: input.stripeCustomerId ?? undefined,
    subscriptionStatus: input.status ?? "active",
    proUntil: input.proUntil ?? null,
  });
}

export async function deactivateProSubscription(email: string) {
  return upsertUser(email, {
    subscriptionStatus: "canceled",
    proUntil: null,
  });
}

export async function resolveTierForRequest(
  sessionUserId: string | null,
  headerTier: string | null
): Promise<UserTier> {
  if (sessionUserId) {
    const { tier } = await getUserEntitlements(sessionUserId);
    if (tier === "pro") return "pro";
  }
  if (headerTier === "pay_per_use") return "pay_per_use";
  if (headerTier === "pro") return "pro";
  return "free";
}

export async function findUserByEmailNormalized(email: string) {
  return findUserByEmail(email);
}
