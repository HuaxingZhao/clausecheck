import type { ContractChange } from "./types";
import { formatContractText } from "./contract-format";

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

interface NormIndex {
  /** normalized string (whitespace removed, punctuation folded) */
  norm: string;
  /** map[i] = index in the ORIGINAL text for normalized char i */
  map: number[];
}

function buildNormIndex(text: string): NormIndex {
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

/**
 * Locate an excerpt in the original text using normalized matching.
 * Returns original-text [start, end) indices, or null if not found.
 */
function findRange(
  ni: NormIndex,
  needle: string
): { start: number; end: number } | null {
  if (!needle || !needle.trim()) return null;

  let needleNorm = "";
  for (const ch of needle) {
    if (/\s/.test(ch)) continue;
    needleNorm += normChar(ch);
  }
  if (needleNorm.length < 4) return null;

  let at = ni.norm.indexOf(needleNorm);

  // Fallback: trim a few trailing chars (AI sometimes adds/omits final punctuation)
  if (at < 0 && needleNorm.length > 12) {
    const trimmed = needleNorm.slice(0, needleNorm.length - 3);
    at = ni.norm.indexOf(trimmed);
    if (at >= 0) {
      const startO = ni.map[at]!;
      const endO = ni.map[at + trimmed.length - 1]! + 1;
      return { start: startO, end: endO };
    }
  }

  if (at < 0) return null;

  const startO = ni.map[at]!;
  const endO = ni.map[at + needleNorm.length - 1]! + 1;
  return { start: startO, end: endO };
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
    const found = findRange(ni, change.original!);
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
    if (change.original?.trim() && findRange(ni, change.original)) n++;
  }
  return n;
}

export function buildRedlinedDocument(originalText: string, changes: ContractChange[]) {
  // Restore clause/paragraph structure (whitespace-only changes) so the
  // output mirrors a real contract layout. Matching ignores whitespace, so
  // edits still align to the same wording.
  const formatted = formatContractText(originalText);
  const spans = buildRedlinedSpans(formatted, changes);
  const paragraphs = spansToParagraphs(spans);
  return {
    spans,
    paragraphs,
    plainRevised: spansToPlainRevised(spans),
    matched: countMatchedChanges(formatted, changes),
  };
}
