import type { ScanResult } from "../types";

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "none";

export interface User {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  /** ISO — subscription current period end */
  proUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReport {
  id: string;
  userId: string;
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

export interface DbSnapshot {
  users: User[];
  reports: SavedReport[];
  magicTokens: MagicToken[];
}
