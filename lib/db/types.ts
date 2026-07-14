import type { ScanResult, ContractChange } from "../types";

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
  /** Nullable for phone-only accounts. */
  email: string | null;
  phoneE164: string | null;
  phoneVerifiedAt: string | null;
  supabaseUserId: string | null;
  stripeCustomerId: string | null;
  subscriptionStatus: SubscriptionStatus;
  proUntil: string | null;
  teamId: string | null;
  teamRole: TeamRole | null;
  /** Bumped on password reset — JWT must carry matching sv. */
  sessionVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type MagicTokenPurpose = "login" | "password_reset";

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

export interface SavedRevision {
  id: string;
  userId: string;
  teamId: string | null;
  title: string;
  locale: "zh" | "en";
  originalText: string;
  revisedContract: string;
  changes: ContractChange[];
  /** base64 of the user's original upload — enables pixel-exact history downloads. */
  originalFile: string | null;
  originalFileType: "pdf" | "docx" | null;
  createdAt: string;
}

export interface MagicToken {
  token: string;
  email: string;
  purpose: MagicTokenPurpose;
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
  revisions: SavedRevision[];
  magicTokens: MagicToken[];
  teams: Team[];
  teamInvites: TeamInvite[];
}
