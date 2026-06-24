import type { ScanResult } from "../types";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "none";
export type TeamRole = "owner" | "member";

export interface Team {
  id: string;
  name: string;
  ownerId: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  proUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  proUntil: string | null;
  teamId: string | null;
  teamRole: TeamRole | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReport {
  id: string;
  userId: string;
  teamId: string | null;
  title: string;
  fileName: string | null;
  locale: "zh" | "en";
  scoreNum: number;
  scoreText: string;
  result: ScanResult;
  createdAt: string;
}

export interface MagicToken {
  token: string;
  email: string;
  expiresAt: string;
}

export interface TeamInvite {
  id: string;
  teamId: string;
  email: string;
  expiresAt: string;
}

export interface DbSnapshot {
  users: User[];
  reports: SavedReport[];
  magicTokens: MagicToken[];
  teams: Team[];
  teamInvites: TeamInvite[];
}
