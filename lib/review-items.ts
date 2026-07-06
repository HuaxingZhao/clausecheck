import type { MissingClause, NegotiationPoint, RiskFlag, ScanResult } from "./types";

export type ReviewItemKind = "flag" | "negotiation" | "missing";

export interface ReviewItem {
  id: string;
  index: number;
  kind: ReviewItemKind;
  title: string;
  level?: "high" | "medium" | "low";
  category?: string;
  /** Section label for scoped search, e.g. 第四条 4.4 */
  sectionHint: string;
  /** Passage to locate in the contract (left highlight). */
  locateText: string;
  originalText: string;
  suggestionText: string;
  reason?: string;
}

const CN_NUM = "一二三四五六七八九十百千";

/** Pull 第X条 / 4.4 / Section 2.5 from AI labels. */
export function extractSectionHint(...parts: (string | undefined)[]): string {
  for (const raw of parts) {
    if (!raw?.trim()) continue;
    const s = raw.trim();

    const cnFull = s.match(
      new RegExp(`第\\s*[${CN_NUM}\\d]+\\s*条(?:\\s*\\d+(?:\\.\\d+)*)?`)
    )?.[0];
    if (cnFull) return cnFull.replace(/\s+/g, " ").trim();

    const cnArt = s.match(new RegExp(`第\\s*[${CN_NUM}\\d]+\\s*条`))?.[0];
    const dec = s.match(/\b(\d+(?:\.\d+)+)\b/)?.[1];
    if (cnArt && dec) return `${cnArt.replace(/\s/g, "")} ${dec}`;
    if (dec && dec.includes(".")) return dec;

    const enSec = s.match(/\b(Section|SECTION)\s+\d+(?:\.\d+)*/i)?.[0];
    if (enSec) return enSec;
    const enClause = s.match(/\b(Clause|CLAUSE)\s+\d+(?:\.\d+)*/i)?.[0];
    if (enClause) return enClause;
    const enArt = s.match(/\b(Article|ARTICLE)\s+[IVXLC\d]+/i)?.[0];
    if (enArt) return enArt;
  }
  return "";
}

export function passageFromFlag(flag: RiskFlag): string {
  const quote = flag.quote?.trim();
  if (quote && quote.length >= 8) return quote;

  const text = flag.text?.trim() ?? "";
  const parts = text.split(/[：:]/);
  if (parts.length > 1) {
    const body = parts.slice(1).join(":").trim();
    if (body.length >= 8) return body;
  }
  if (text.length >= 8) return text;
  return quote || text;
}

/** Build unified review list from scan result for the suggestions panel. */
export function buildReviewItems(result: ScanResult): ReviewItem[] {
  const items: ReviewItem[] = [];
  let index = 0;

  for (const flag of result.flags) {
    if (!flag.suggestion?.trim() && !flag.text?.trim()) continue;
    const sectionHint = extractSectionHint(flag.text, flag.category, flag.quote);
    items.push({
      id: `flag-${index}`,
      index,
      kind: "flag",
      title: flag.category || flag.text.slice(0, 48) || `Risk ${index + 1}`,
      level: flag.level,
      category: flag.category,
      sectionHint,
      locateText: passageFromFlag(flag),
      originalText: flag.quote?.trim() || flag.text?.trim() || "",
      suggestionText: flag.suggestion?.trim() || "",
      reason: flag.impact || flag.legalBasis,
    });
    index += 1;
  }

  for (const nego of result.negotiations ?? []) {
    const clause = nego.clause?.trim() || "";
    const quote = (nego as NegotiationPoint & { quote?: string }).quote?.trim();
    const sectionHint = extractSectionHint(clause, quote, nego.current);
    const passage = quote || nego.current?.trim() || clause;
    items.push({
      id: `nego-${index}`,
      index,
      kind: "negotiation",
      title: clause || `Priority ${nego.priority}`,
      level: nego.priority <= 2 ? "high" : nego.priority <= 4 ? "medium" : "low",
      sectionHint,
      locateText: passage,
      originalText: quote || nego.current?.trim() || "",
      suggestionText: nego.suggested?.trim() || "",
      reason: nego.reason?.trim(),
    });
    index += 1;
  }

  for (const missing of result.missingClauses ?? []) {
    items.push({
      id: `missing-${index}`,
      index,
      kind: "missing",
      title: missing.name?.trim() || `Missing ${index + 1}`,
      level: "medium",
      sectionHint: "",
      locateText: "",
      originalText: "",
      suggestionText: missing.suggestion?.trim() || "",
      reason: missing.importance?.trim(),
    });
    index += 1;
  }

  return items;
}

export function reviewItemsCount(result: ScanResult): number {
  return buildReviewItems(result).length;
}
