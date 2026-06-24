import {
  findUserByEmail,
  findUserById,
  findTeamById,
  upsertUser,
} from "../db/store";
import type { SubscriptionStatus, Team, User } from "../db/types";
import type { UserTier } from "../quota";

function subscriptionActive(status: SubscriptionStatus, proUntil: string | null): boolean {
  if (status === "active") {
    if (!proUntil) return true;
    return new Date(proUntil).getTime() > Date.now();
  }
  if (proUntil && new Date(proUntil).getTime() > Date.now()) return true;
  return false;
}

export async function getTeamForUser(user: User | null): Promise<Team | null> {
  if (!user?.teamId) return null;
  return findTeamById(user.teamId);
}

export async function isProUser(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (subscriptionActive(user.subscriptionStatus, user.proUntil)) return true;
  const team = await getTeamForUser(user);
  if (team && subscriptionActive(team.subscriptionStatus, team.proUntil)) return true;
  return false;
}

export function tierForPro(isPro: boolean): UserTier {
  return isPro ? "pro" : "free";
}

export async function getUserEntitlements(userId: string) {
  const user = await findUserById(userId);
  const pro = await isProUser(user);
  const team = await getTeamForUser(user);
  return {
    user,
    team,
    pro,
    tier: tierForPro(pro),
    isTeamMember: !!user?.teamId,
    isTeamOwner: user?.teamRole === "owner",
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
    const { pro } = await getUserEntitlements(sessionUserId);
    if (pro) return "pro";
  }
  if (headerTier === "pay_per_use") return "pay_per_use";
  if (headerTier === "pro") return "pro";
  return "free";
}

export async function findUserByEmailNormalized(email: string) {
  return findUserByEmail(email);
}
