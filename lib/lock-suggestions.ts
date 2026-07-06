import {
  buildContractIndex,
  findClauseById,
  resolveClauseIdFromHints,
  type ContractClause,
  type ContractIndex,
} from "./contract-index";
import { extractSectionHint, passageFromFlag } from "./review-items";
import { buildNormIndex, findRangeWithFallbacks } from "./redline";
import { findSectionAnchor, sectionSearchWindow } from "./section-anchors";
import { isAbsenceDescription } from "./suggestion-diff";
import type {
  ContractReviewData,
  LockedReviewItem,
  NegotiationPoint,
  RiskFlag,
  ScanResult,
} from "./types";

function findQuoteInRange(
  source: string,
  rangeStart: number,
  rangeEnd: number,
  quote?: string
): { start: number; end: number; text: string; matched: boolean } | null {
  if (!quote?.trim()) return null;
  const body = source.slice(rangeStart, rangeEnd);
  const q = quote.trim();

  const localIdx = body.indexOf(q);
  if (localIdx >= 0) {
    const start = rangeStart + localIdx;
    return { start, end: start + q.length, text: q, matched: true };
  }

  const ni = buildNormIndex(body);
  const found = findRangeWithFallbacks(ni, q, false);
  if (found) {
    const start = rangeStart + found.start;
    const end = rangeStart + found.end;
    return { start, end, text: source.slice(start, end).trim(), matched: true };
  }
  return null;
}

/** Collect quote needles from AI fields, longest first, deduped. */
function collectLockNeedles(...parts: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const raw of parts) {
    const t = raw?.trim();
    if (!t || t.length < 4) continue;
    if (!out.includes(t)) out.push(t);
    if (t.length > 24) {
      for (const len of [160, 120, 80, 48]) {
        const slice = t.slice(0, Math.min(len, t.length)).trim();
        if (slice.length >= 8 && !out.includes(slice)) out.push(slice);
      }
    }
  }
  return out.sort((a, b) => b.length - a.length);
}

function lockWithNeedles(
  source: string,
  needles: string[],
  sectionHint?: string
): { start: number; end: number; text: string; matched: boolean } | null {
  let bestUnmatched: {
    start: number;
    end: number;
    text: string;
    matched: boolean;
  } | null = null;

  for (const needle of needles) {
    const hit = lockGlobally(source, needle, sectionHint);
    if (!hit) continue;
    if (hit.matched) return hit;
    if (!bestUnmatched) bestUnmatched = hit;
  }

  return bestUnmatched;
}

function lockGlobally(
  source: string,
  quote: string,
  sectionHint?: string
): { start: number; end: number; text: string; matched: boolean } | null {
  if (!quote?.trim()) return null;

  if (sectionHint?.trim()) {
    const win = sectionSearchWindow(source, sectionHint);
    if (win.found) {
      const inWin = findQuoteInRange(source, win.start, win.end, quote);
      if (inWin) return inWin;
      const anchor = win.anchor;
      const cap = Math.min(win.end, anchor + 520);
      return {
        start: anchor,
        end: cap,
        text: source.slice(anchor, cap).trim(),
        matched: false,
      };
    }

    const anchor = findSectionAnchor(source, sectionHint);
    if (anchor >= 0) {
      const end = Math.min(source.length, anchor + 520);
      const inAnchor = findQuoteInRange(source, anchor, end, quote);
      if (inAnchor) return inAnchor;
      return {
        start: anchor,
        end,
        text: source.slice(anchor, end).trim(),
        matched: false,
      };
    }
  }

  const ni = buildNormIndex(source);
  const found = findRangeWithFallbacks(ni, quote, false);
  if (found) {
    return {
      start: found.start,
      end: found.end,
      text: source.slice(found.start, found.end).trim(),
      matched: true,
    };
  }
  return null;
}

function findQuoteInClause(
  source: string,
  clause: ContractClause,
  quote?: string
): { start: number; end: number; text: string; matched: boolean } {
  const inClause = findQuoteInRange(source, clause.start, clause.end, quote);
  if (inClause) return inClause;

  const cap = Math.min(clause.end, clause.start + 520);
  const text = source.slice(clause.start, cap).trim();
  return {
    start: clause.start,
    end: cap,
    text,
    matched: false,
  };
}

function quoteExistsInSource(source: string, quote: string): boolean {
  if (!quote?.trim()) return false;
  const q = quote.trim();
  if (source.includes(q)) return true;
  const ni = buildNormIndex(source);
  return !!findRangeWithFallbacks(ni, q, false);
}

function lockAtSection(
  source: string,
  sectionHint: string
): { start: number; end: number; text: string; matched: boolean } | null {
  if (!sectionHint?.trim()) return null;
  const win = sectionSearchWindow(source, sectionHint);
  if (win.found) {
    const cap = Math.min(win.end, win.anchor + 520);
    return {
      start: win.anchor,
      end: cap,
      text: source.slice(win.anchor, cap).trim(),
      matched: false,
    };
  }
  const anchor = findSectionAnchor(source, sectionHint);
  if (anchor >= 0) {
    const end = Math.min(source.length, anchor + 520);
    return {
      start: anchor,
      end,
      text: source.slice(anchor, end).trim(),
      matched: false,
    };
  }
  return null;
}

function toMissingItem(
  item: LockedReviewItem
): LockedReviewItem {
  const fallbackSuggestion =
    item.suggestionText?.trim() || item.originalText?.trim() || "";
  return {
    ...item,
    kind: "missing",
    originalText: "",
    suggestionText: fallbackSuggestion,
    start: 0,
    end: 0,
    matched: false,
    navigable: false,
  };
}

/** Move absence/meta commentary into missing items. */
export function normalizeReviewItems(items: LockedReviewItem[]): LockedReviewItem[] {
  return items.map((item) => {
    if (item.kind === "missing") return item;

    const orig = item.originalText?.trim() ?? "";
    const reason = item.reason?.trim() ?? "";
    if (
      (orig && isAbsenceDescription(orig)) ||
      (reason && isAbsenceDescription(reason) && !orig)
    ) {
      return toMissingItem(item);
    }

    if (!item.navigable && !orig && item.suggestionText?.trim()) {
      return toMissingItem(item);
    }

    return item;
  });
}

function computeReviewStats(items: LockedReviewItem[]) {
  const editable = items.filter((i) => i.kind !== "missing");
  const missing = items.filter((i) => i.kind === "missing");
  return {
    matched: editable.filter((i) => i.matched).length,
    navigable: editable.filter((i) => i.navigable).length,
    total: items.length,
    editable: editable.length,
    missing: missing.length,
    unlocated: editable.filter((i) => !i.navigable).length,
  };
}

function flagToItem(
  index: ContractIndex,
  flag: RiskFlag,
  seq: number
): LockedReviewItem {
  const clause =
    findClauseById(index, flag.clauseId) ||
    resolveClauseIdFromHints(
      index,
      flag.clauseId,
      extractSectionHint(flag.text, flag.category, flag.quote),
      flag.text,
      flag.category
    );

  const quote = flag.quote?.trim() || passageFromFlag(flag);
  const suggestionText = flag.suggestion?.trim() || "";
  const sectionHint = extractSectionHint(flag.text, flag.category, flag.quote, flag.clauseId);
  const conf = flag.confidence;

  if (isAbsenceDescription(quote) || isAbsenceDescription(flag.text ?? "")) {
    return toMissingItem({
      id: `flag-${seq}`,
      index: seq,
      kind: "flag",
      title: flag.category || flag.text.slice(0, 48) || `Risk ${seq + 1}`,
      level: flag.level,
      originalText: quote,
      suggestionText,
      reason: flag.impact || flag.legalBasis || flag.text,
      start: 0,
      end: 0,
      matched: false,
      navigable: false,
      confidence: conf,
    });
  }

  if (!clause) {
    const needles = collectLockNeedles(quote, flag.text, flag.category);
    const global = lockWithNeedles(index.source, needles, sectionHint);
    if (global) {
      return {
        id: `flag-${seq}`,
        index: seq,
        kind: "flag",
        title: flag.category || flag.text.slice(0, 48) || `Risk ${seq + 1}`,
        level: flag.level,
        originalText: global.text,
        suggestionText,
        reason: flag.impact || flag.legalBasis,
        start: global.start,
        end: global.end,
        matched: global.matched,
        navigable: true,
        confidence: conf,
      };
    }
    const sectionLock = lockAtSection(index.source, sectionHint);
    if (sectionLock) {
      return {
        id: `flag-${seq}`,
        index: seq,
        kind: "flag",
        title: flag.category || flag.text.slice(0, 48) || `Risk ${seq + 1}`,
        level: flag.level,
        originalText: sectionLock.text,
        suggestionText,
        reason: flag.impact || flag.legalBasis,
        start: sectionLock.start,
        end: sectionLock.end,
        matched: sectionLock.matched,
        navigable: true,
        confidence: conf,
      };
    }
    if (
      isAbsenceDescription(quote) ||
      (quote && !quoteExistsInSource(index.source, quote) && quote.length < 120)
    ) {
      return toMissingItem({
        id: `flag-${seq}`,
        index: seq,
        kind: "flag",
        title: flag.category || flag.text.slice(0, 48) || `Risk ${seq + 1}`,
        level: flag.level,
        originalText: quote,
        suggestionText,
        reason: flag.impact || flag.legalBasis || flag.text,
        start: 0,
        end: 0,
        matched: false,
        navigable: false,
        confidence: conf,
      });
    }
    return {
      id: `flag-${seq}`,
      index: seq,
      kind: "flag",
      title: flag.category || flag.text.slice(0, 48) || `Risk ${seq + 1}`,
      level: flag.level,
      originalText: quote,
      suggestionText,
      reason: flag.impact || flag.legalBasis,
      start: 0,
      end: 0,
      matched: false,
      navigable: false,
      confidence: conf,
    };
  }

  const locked = findQuoteInClause(index.source, clause, quote);
  return {
    id: `flag-${seq}`,
    index: seq,
    kind: "flag",
    title: flag.category || clause.label || flag.text.slice(0, 48),
    level: flag.level,
    clauseId: clause.id,
    clauseLabel: clause.label,
    originalText: locked.text,
    suggestionText,
    reason: flag.impact || flag.legalBasis,
    start: locked.start,
    end: locked.end,
    matched: locked.matched,
    navigable: true,
    confidence: conf,
  };
}

function negoToItem(
  index: ContractIndex,
  nego: NegotiationPoint,
  seq: number
): LockedReviewItem {
  const quote = nego.quote?.trim() || nego.current?.trim() || "";
  const sectionHint = extractSectionHint(nego.clause, nego.quote, nego.clauseId);
  const conf = nego.confidence;
  const suggestionText = nego.suggested?.trim() || "";

  if (isAbsenceDescription(quote) || isAbsenceDescription(nego.clause ?? "")) {
    return toMissingItem({
      id: `nego-${seq}`,
      index: seq,
      kind: "negotiation",
      title: nego.clause?.trim() || `Priority ${nego.priority}`,
      level: nego.priority <= 2 ? "high" : nego.priority <= 4 ? "medium" : "low",
      originalText: quote,
      suggestionText,
      reason: nego.reason?.trim(),
      start: 0,
      end: 0,
      matched: false,
      navigable: false,
      confidence: conf,
    });
  }

  const clause =
    findClauseById(index, nego.clauseId) ||
    resolveClauseIdFromHints(
      index,
      nego.clauseId,
      sectionHint,
      nego.clause
    );

  if (!clause) {
    const needles = collectLockNeedles(quote, nego.clause, nego.current);
    const global = lockWithNeedles(
      index.source,
      needles,
      sectionHint || nego.clause
    );
    if (global) {
      return {
        id: `nego-${seq}`,
        index: seq,
        kind: "negotiation",
        title: nego.clause?.trim() || `Priority ${nego.priority}`,
        level: nego.priority <= 2 ? "high" : nego.priority <= 4 ? "medium" : "low",
        originalText: global.text,
        suggestionText: nego.suggested?.trim() || "",
        reason: nego.reason?.trim(),
        start: global.start,
        end: global.end,
        matched: global.matched,
        navigable: true,
        confidence: conf,
      };
    }
    const sectionLock = lockAtSection(index.source, sectionHint || nego.clause || "");
    if (sectionLock) {
      return {
        id: `nego-${seq}`,
        index: seq,
        kind: "negotiation",
        title: nego.clause?.trim() || `Priority ${nego.priority}`,
        level: nego.priority <= 2 ? "high" : nego.priority <= 4 ? "medium" : "low",
        originalText: sectionLock.text,
        suggestionText,
        reason: nego.reason?.trim(),
        start: sectionLock.start,
        end: sectionLock.end,
        matched: sectionLock.matched,
        navigable: true,
        confidence: conf,
      };
    }
    if (
      isAbsenceDescription(quote) ||
      (quote && !quoteExistsInSource(index.source, quote) && quote.length < 120)
    ) {
      return toMissingItem({
        id: `nego-${seq}`,
        index: seq,
        kind: "negotiation",
        title: nego.clause?.trim() || `Priority ${nego.priority}`,
        level: nego.priority <= 2 ? "high" : nego.priority <= 4 ? "medium" : "low",
        originalText: quote,
        suggestionText,
        reason: nego.reason?.trim(),
        start: 0,
        end: 0,
        matched: false,
        navigable: false,
        confidence: conf,
      });
    }
    return {
      id: `nego-${seq}`,
      index: seq,
      kind: "negotiation",
      title: nego.clause?.trim() || `Priority ${nego.priority}`,
      level: nego.priority <= 2 ? "high" : nego.priority <= 4 ? "medium" : "low",
      originalText: quote || "",
      suggestionText,
      reason: nego.reason?.trim(),
      start: 0,
      end: 0,
      matched: false,
      navigable: false,
      confidence: conf,
    };
  }

  const locked = findQuoteInClause(index.source, clause, quote);
  return {
    id: `nego-${seq}`,
    index: seq,
    kind: "negotiation",
    title: nego.clause?.trim() || clause.label,
    level: nego.priority <= 2 ? "high" : nego.priority <= 4 ? "medium" : "low",
    clauseId: clause.id,
    clauseLabel: clause.label,
    originalText: locked.text,
    suggestionText: nego.suggested?.trim() || "",
    reason: nego.reason?.trim(),
    start: locked.start,
    end: locked.end,
    matched: locked.matched,
    navigable: true,
    confidence: conf,
  };
}

function sortAndReindex(items: LockedReviewItem[]): LockedReviewItem[] {
  const sorted = [...items].sort((a, b) => {
    if (a.navigable !== b.navigable) return a.navigable ? -1 : 1;
    if (a.navigable && b.navigable && a.start !== b.start) return a.start - b.start;
    return 0;
  });
  return sorted.map((item, i) => ({ ...item, index: i }));
}

/** Step 3 — Lock each AI suggestion to indexed clause coordinates. */
export function buildContractReview(
  index: ContractIndex,
  result: ScanResult
): ContractReviewData {
  const raw: LockedReviewItem[] = [];
  let seq = 0;

  for (const flag of result.flags) {
    if (!flag.suggestion?.trim() && !flag.text?.trim()) continue;
    raw.push(flagToItem(index, flag, seq));
    seq += 1;
  }

  for (const nego of result.negotiations ?? []) {
    raw.push(negoToItem(index, nego, seq));
    seq += 1;
  }

  for (const missing of result.missingClauses ?? []) {
    raw.push({
      id: `missing-${seq}`,
      index: seq,
      kind: "missing",
      title: missing.name?.trim() || `Missing ${seq + 1}`,
      level: "medium",
      originalText: "",
      suggestionText: missing.suggestion?.trim() || "",
      reason: missing.importance?.trim(),
      start: 0,
      end: 0,
      matched: false,
      navigable: false,
    });
    seq += 1;
  }

  const sorted = sortAndReindex(raw);
  const items = normalizeReviewItems(sorted);
  const stats = computeReviewStats(items);

  return {
    source: index.source,
    items,
    clauseCount: index.clauses.length,
    pipeline: { extracted: true, analyzed: true, locked: true, ready: true },
    stats,
  };
}

/** Full review pipeline (extract → analyze input already done → lock → ready). */
export function runReviewPipeline(
  contractText: string,
  result: ScanResult
): ContractReviewData {
  const index = buildContractIndex(contractText);
  return buildContractReview(index, result);
}

/** Prefer server-locked review; fall back to client lock for demo/legacy responses. */
export function resolveContractReview(
  result: ScanResult,
  contractText?: string | null
): ContractReviewData | null {
  const embedded = result.contractReview;
  if (embedded?.source?.trim() && embedded.items.length > 0) {
    const items = normalizeReviewItems(embedded.items);
    return {
      ...embedded,
      items,
      stats: computeReviewStats(items),
    };
  }
  if (!contractText?.trim()) return null;
  return runReviewPipeline(contractText, result);
}

export function lockedItemsToLocated(
  items: LockedReviewItem[]
): { index: number; start: number; end: number; matched: boolean; navigable: boolean }[] {
  return items.map((item) => ({
    index: item.index,
    start: item.start,
    end: item.end,
    matched: item.matched,
    navigable: item.navigable,
  }));
}
