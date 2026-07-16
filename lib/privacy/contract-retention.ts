/**
 * Contract data retention — hard delete only (no soft-delete columns).
 * Aligns server persistence with privacy promise: 扫完即删 / not used for training.
 */

import type { ScanResult } from "@/lib/types";

/** Maximum age of rows that still contain contract bodies (revisions). */
export const CONTRACT_BODY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Quote snippets kept in Pro report history (not full clauses). */
const MAX_PERSISTED_QUOTE_CHARS = 120;

export function contractBodyCutoffDate(
  now: Date = new Date(),
  maxAgeMs: number = CONTRACT_BODY_MAX_AGE_MS
): Date {
  return new Date(now.getTime() - maxAgeMs);
}

function truncateQuote(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const t = value.trim();
  if (t.length <= MAX_PERSISTED_QUOTE_CHARS) return t;
  return `${t.slice(0, MAX_PERSISTED_QUOTE_CHARS)}…`;
}

/**
 * Strip full contract source from a ScanResult before any durable INSERT.
 * Keeps risk metadata / short quotes for Pro history UI — never the full body.
 */
export function sanitizeScanResultForPersistence(result: ScanResult): ScanResult {
  const clone = structuredClone(result) as ScanResult & { contractText?: string };
  delete clone.contractText;

  if (clone.contractReview) {
    clone.contractReview = {
      ...clone.contractReview,
      source: "",
      items: (clone.contractReview.items ?? []).map((item) => ({
        ...item,
        originalText: truncateQuote(item.originalText) ?? "",
        suggestionText: truncateQuote(item.suggestionText) ?? item.suggestionText,
      })),
    };
  }

  if (Array.isArray(clone.flags)) {
    clone.flags = clone.flags.map((f) => ({
      ...f,
      quote: truncateQuote(f.quote) ?? "",
      suggestion: truncateQuote(f.suggestion) ?? f.suggestion,
    }));
  }

  if (Array.isArray(clone.negotiations)) {
    clone.negotiations = clone.negotiations.map((n) => ({
      ...n,
      quote: truncateQuote(n.quote),
      suggested: truncateQuote(n.suggested) ?? n.suggested,
    }));
  }

  return clone;
}

export type PurgeContractDataResult = {
  revisionsDeleted: number;
  reportsScrubbed: number;
  cutoffIso: string;
};
