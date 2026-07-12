/**
 * Review feedback — types for Beta golden-set collection.
 * Contract body is never stored; only SHA-256 hash.
 */

export type FeedbackTargetType = "flag" | "missingClause" | "summary";

export type FeedbackType = "accurate" | "missed_issue" | "false_positive";

export interface RagFeedbackMetadata {
  packId: string;
  retrievedChunkIds: string[];
  degraded: boolean;
}

/** Attached to ScanResult so the report UI can POST feedback without re-running RAG. */
export interface ReviewFeedbackMeta {
  promptVersion: string;
  jurisdiction: string;
  ragMetadata: RagFeedbackMetadata;
}

export interface FeedbackRecord {
  id: string;
  contractHash: string;
  jurisdiction: string;
  promptVersion: string;
  ragMetadata: RagFeedbackMetadata;
  targetType: FeedbackTargetType;
  targetId: string;
  feedbackType: FeedbackType;
  comment: string | null;
  userId: string | null;
  createdAt: string;
}

export interface CreateFeedbackInput {
  contractHash: string;
  jurisdiction: string;
  promptVersion: string;
  ragMetadata: RagFeedbackMetadata;
  targetType: FeedbackTargetType;
  targetId: string;
  feedbackType: FeedbackType;
  comment?: string | null;
  userId?: string | null;
}
