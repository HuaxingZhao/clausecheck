import type { ContractChange } from "./types";
import { formatContractText } from "./contract-format";
import { locateAllChangesOrdered } from "./locate-changes-ordered";

export type RedlineSpan = {
  text: string;
  kind: "normal" | "deleted" | "inserted";
};

/**
 * Normalize a single char for fuzzy matching:
 * full-width punctuation -> half-width, smart quotes -> straight.
 * Whitespace is dropped entirely by the caller.
 */
const PUNCT_MAP: Record<string, string> = {
  "，": ",",
  "。": ".",
  "：": ":",
  "；": ";",
  "！": "!",
  "？": "?",
  "（": "(",
  "）": ")",
  "【": "[",
  "】": "]",
  "、": ",",
  "—": "-",
  "－": "-",
  "～": "~",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "「": '"',
  "」": '"',
  "％": "%",
};

function normChar(ch: string): string {
  const mapped = PUNCT_MAP[ch] ?? ch;
  return mapped.toLowerCase();
}

export interface NormIndex {
  /** normalized string (whitespace removed, punctuation folded) */
  norm: string;
  /** map[i] = index in the ORIGINAL text for normalized char i */
  map: number[];
}

export function buildNormIndex(text: string): NormIndex {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (/\s/.test(ch)) continue;
    norm += normChar(ch);
    map.push(i);
  }
  return { norm, map };
}

/** Map a [normStart, len) span back to original-text [start, end) indices. */
function mapRange(
  ni: NormIndex,
  normStart: number,
  len: number
): { start: number; end: number } | null {
  if (len <= 0) return null;
  const startO = ni.map[normStart];
  const endIdx = ni.map[normStart + len - 1];
  if (startO == null || endIdx == null) return null;
  return { start: startO, end: endIdx + 1 };
}

function normalizeNeedle(needle: string): string {
  let out = "";
  for (const ch of needle) {
    if (/\s/.test(ch)) continue;
    out += normChar(ch);
  }
  return out;
}

/**
 * Anchor on the prefix + suffix of the needle and accept the span between them.
 * Handles the common case where the AI rewrote the MIDDLE of an excerpt but the
 * start and end still match the source (insertions/deletions in the middle).
 */
function anchorMatch(
  ni: NormIndex,
  needleNorm: string
): { start: number; end: number } | null {
  const aLen = Math.min(12, Math.floor(needleNorm.length / 3));
  if (aLen < 4) return null;
  const prefix = needleNorm.slice(0, aLen);
  const suffix = needleNorm.slice(needleNorm.length - aLen);

  let best: { start: number; end: number } | null = null;
  let bestDelta = Infinity;
  let startAt = ni.norm.indexOf(prefix);

  // Try each prefix occurrence; pick the suffix that yields a span length
  // closest to the needle length.
  while (startAt >= 0) {
    const suffixAt = ni.norm.indexOf(suffix, startAt + aLen);
    if (suffixAt >= 0) {
      const spanLen = suffixAt + aLen - startAt;
      if (spanLen >= needleNorm.length * 0.5 && spanLen <= needleNorm.length * 2.2) {
        const delta = Math.abs(spanLen - needleNorm.length);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = mapRange(ni, startAt, spanLen);
        }
      }
    }
    startAt = ni.norm.indexOf(prefix, startAt + 1);
    if (best && bestDelta === 0) break;
  }
  return best;
}

/** Levenshtein-bounded similarity over a window (0..1). Early-exits cheaply. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return 0;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  const dist = prev[n]!;
  return 1 - dist / Math.max(m, n);
}

/**
 * Last-resort fuzzy scan: slide a needle-sized window across the (bounded)
 * normalized text and keep the best window above a similarity threshold.
 * Anchored to candidate starts (matching first char) to stay cheap.
 */
function fuzzyMatch(
  ni: NormIndex,
  needleNorm: string
): { start: number; end: number } | null {
  const L = needleNorm.length;
  if (L < 8 || ni.norm.length > 60000) return null;
  const first = needleNorm.charCodeAt(0);
  const threshold = needleNorm.length >= 30 ? 0.72 : 0.8;
  let best: { start: number; end: number } | null = null;
  let bestScore = threshold;

  for (let i = 0; i + Math.floor(L * 0.6) <= ni.norm.length; i++) {
    if (ni.norm.charCodeAt(i) !== first) continue;
    // Compare a couple of window sizes to tolerate insert/delete drift.
    for (const w of [L, Math.round(L * 0.9), Math.round(L * 1.1)]) {
      if (i + w > ni.norm.length) continue;
      const score = similarity(needleNorm, ni.norm.slice(i, i + w));
      if (score > bestScore) {
        bestScore = score;
        best = mapRange(ni, i, w);
        if (score === 1) return best;
      }
    }
  }
  return best;
}

/**
 * Locate an excerpt in the original text using progressively looser matching.
 * Returns original-text [start, end) indices, or null if not found.
 */
export function findRange(
  ni: NormIndex,
  needle: string,
  strict = false
): { start: number; end: number } | null {
  if (!needle || !needle.trim()) return null;
  const needleNorm = normalizeNeedle(needle);
  if (needleNorm.length < 4) return null;

  // 1) Exact normalized substring.
  let at = ni.norm.indexOf(needleNorm);
  if (at >= 0) return mapRange(ni, at, needleNorm.length);

  // 2) Trim a few trailing chars (AI often drifts on final punctuation).
  if (needleNorm.length > 12) {
    const trimmed = needleNorm.slice(0, needleNorm.length - 3);
    at = ni.norm.indexOf(trimmed);
    if (at >= 0) return mapRange(ni, at, trimmed.length);
  }

  // 3) Trim a few leading chars.
  if (needleNorm.length > 12) {
    const trimmed = needleNorm.slice(3);
    at = ni.norm.indexOf(trimmed);
    if (at >= 0) return mapRange(ni, at, trimmed.length);
  }

  // 4) Prefix + suffix anchoring (middle rewritten).
  const anchored = anchorMatch(ni, needleNorm);
  if (anchored) return anchored;

  // 5) Fuzzy sliding-window best match (bounded) — skip in strict mode for highlights.
  if (strict) return null;
  return fuzzyMatch(ni, needleNorm);
}

function needleVariants(original: string): string[] {
  const t = original.trim();
  if (!t) return [];
  const variants = [original, t];
  if (t.length > 20) {
    variants.push(t.slice(0, Math.min(120, t.length)));
    variants.push(t.slice(0, Math.min(72, t.length)));
    variants.push(t.slice(0, Math.min(48, t.length)));
  }
  return [...new Set(variants.filter((v) => normalizeNeedle(v).length >= 4))];
}

export function findRangeWithFallbacks(
  ni: NormIndex,
  original: string,
  strict = false
): { start: number; end: number } | null {
  for (const variant of needleVariants(original)) {
    const found = findRange(ni, variant, strict);
    if (found) return found;
  }
  return null;
}

export interface LocatedChange {
  index: number;
  change: ContractChange;
  start: number;
  end: number;
  matched: boolean;
}

/** Locate every suggestion in the contract text — same indices as the changes array. */
export function locateAllChanges(
  originalText: string,
  changes: ContractChange[],
  opts?: { strict?: boolean }
): { source: string; located: LocatedChange[] } {
  return locateAllChangesOrdered(originalText, changes, opts);
}

/** Snap AI-provided originals to verbatim substrings found in the source text. */
export function snapChangesToSource(
  originalText: string,
  changes: ContractChange[],
  opts?: { format?: boolean }
): ContractChange[] {
  const format = opts?.format !== false;
  const normalized = originalText.replace(/\r\n/g, "\n");
  const prepared = format ? formatContractText(normalized) : normalized;
  const sources = [prepared, normalized];

  const { located: orderedLocated } = locateAllChangesOrdered(prepared, changes, {
    strict: false,
    format: false,
  });

  return changes.map((change, i) => {
    const loc = orderedLocated[i];
    if (loc?.matched) {
      return { ...change, original: prepared.slice(loc.start, loc.end) };
    }

    const orig = change.original?.trim();
    if (!orig) return change;

    for (const source of sources) {
      const ni = buildNormIndex(source);
      const found = findRangeWithFallbacks(ni, change.original!);
      if (found) {
        return { ...change, original: source.slice(found.start, found.end) };
      }
    }
    return change;
  });
}

interface AppliedRange {
  start: number;
  end: number;
  change: ContractChange;
}

/**
 * Build inline redline spans from the **original** contract text,
 * preserving structure exactly and marking deletions (strikethrough)
 * + insertions (green) only at the matched edit locations.
 */
export function buildRedlinedSpans(
  originalText: string,
  changes: ContractChange[]
): RedlineSpan[] {
  if (!originalText.trim()) return [];

  const ni = buildNormIndex(originalText);
  const ranges: AppliedRange[] = [];

  for (const change of changes) {
    const orig = change.original?.trim();
    if (!orig) continue;
    const found = findRangeWithFallbacks(ni, change.original!);
    if (!found) continue;
    ranges.push({ start: found.start, end: found.end, change });
  }

  ranges.sort((a, b) => a.start - b.start);

  // Drop overlapping ranges (keep the earlier one)
  const merged: AppliedRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) continue;
    merged.push(r);
  }

  if (merged.length === 0) {
    return [{ text: originalText, kind: "normal" }];
  }

  const spans: RedlineSpan[] = [];
  let cursor = 0;

  for (const r of merged) {
    if (r.start > cursor) {
      spans.push({ text: originalText.slice(cursor, r.start), kind: "normal" });
    }
    // Keep the EXACT original slice as the deleted text (preserves format)
    spans.push({ text: originalText.slice(r.start, r.end), kind: "deleted" });
    if (r.change.revised?.trim()) {
      spans.push({ text: r.change.revised.trim(), kind: "inserted" });
    }
    cursor = r.end;
  }

  if (cursor < originalText.length) {
    spans.push({ text: originalText.slice(cursor), kind: "normal" });
  }

  return coalesceSpans(spans);
}

function coalesceSpans(spans: RedlineSpan[]): RedlineSpan[] {
  const out: RedlineSpan[] = [];
  for (const s of spans) {
    if (!s.text) continue;
    const prev = out[out.length - 1];
    if (prev && prev.kind === s.kind) {
      prev.text += s.text;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

/** Split spans into paragraphs preserving original line breaks. */
export function spansToParagraphs(spans: RedlineSpan[]): RedlineSpan[][] {
  const paragraphs: RedlineSpan[][] = [[]];

  for (const span of spans) {
    const parts = span.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) paragraphs.push([]);
      const part = parts[i]!;
      if (part) {
        paragraphs[paragraphs.length - 1]!.push({ text: part, kind: span.kind });
      }
    }
  }

  return paragraphs.filter((p) => p.length > 0);
}

/** Final clean text with edits applied (deletions removed, insertions kept). */
export function spansToPlainRevised(spans: RedlineSpan[]): string {
  return spans
    .filter((s) => s.kind !== "deleted")
    .map((s) => s.text)
    .join("");
}

/** How many of the provided changes were actually located in the text. */
export function countMatchedChanges(
  originalText: string,
  changes: ContractChange[]
): number {
  if (!originalText.trim()) return 0;
  const ni = buildNormIndex(originalText);
  let n = 0;
  for (const change of changes) {
    if (change.original?.trim() && findRangeWithFallbacks(ni, change.original)) n++;
  }
  return n;
}

export function buildRedlinedDocument(
  originalText: string,
  changes: ContractChange[],
  opts?: { preserveLayout?: boolean }
) {
  const source = opts?.preserveLayout
    ? originalText.replace(/\r\n/g, "\n")
    : formatContractText(originalText);
  const spans = buildRedlinedSpans(source, changes);
  const paragraphs = spansToParagraphs(spans);
  return {
    spans,
    paragraphs,
    plainRevised: spansToPlainRevised(spans),
    matched: countMatchedChanges(source, changes),
  };
}
