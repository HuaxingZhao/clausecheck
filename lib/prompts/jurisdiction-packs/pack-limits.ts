/**
 * Names that belong to the Base 12-category checklist.
 * Packs must NOT restate these as boilerplateRequirements —
 * only jurisdiction-specific mandatory clauses go there.
 * (COMMON_LAW_BOILERPLATE clause titles are explicitly allowed.)
 */
export const BASE_RESERVED_BOILERPLATE_NAMES: readonly string[] = [
  "Liability & indemnification",
  "Termination & exit",
  "Payment & financial",
  "Intellectual property",
  "Confidentiality & data",
  "Non-compete & non-solicit",
  "Warranties & representations",
  "Dispute resolution",
  "Assignment & subcontracting",
  "Amendments & entire agreement",
  "Missing clauses",
] as const;

/**
 * Approximate token estimate (no external tokenizer).
 * ~4 characters ≈ 1 token for mixed EN/ZH legal prose.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export const MAX_PACK_ADDON_TOKENS = 2000;
