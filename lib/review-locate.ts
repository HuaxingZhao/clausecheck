import { formatContractText } from "./contract-format";
import type { ReviewItem } from "./review-items";
import {
  buildNormIndex,
  findRangeWithFallbacks,
  type NormIndex,
} from "./redline";
import {
  buildSectionNeedles,
  findSectionAnchor,
  sectionSearchWindow,
  sectionWindowBounds,
  type SectionSearchWindow,
} from "./section-anchors";

export interface LocatedReviewItem {
  index: number;
  start: number;
  end: number;
  matched: boolean;
  navigable: boolean;
}

function needleVariantsLongestFirst(original: string, minLen = 8): string[] {
  const t = original.trim();
  if (!t) return [];
  const variants = [t, original];
  if (t.length > 24) {
    variants.push(t.slice(0, Math.min(160, t.length)));
    variants.push(t.slice(0, Math.min(120, t.length)));
    variants.push(t.slice(0, Math.min(80, t.length)));
  }
  return [...new Set(variants.filter((v) => v.trim().length >= minLen))].sort(
    (a, b) => b.length - a.length
  );
}

function charToNormStart(ni: NormIndex, charPos: number): number {
  for (let i = 0; i < ni.map.length; i++) {
    if (ni.map[i]! >= charPos) return i;
  }
  return ni.map.length;
}

function charToNormEnd(ni: NormIndex, charPos: number): number {
  for (let i = ni.map.length - 1; i >= 0; i--) {
    if (ni.map[i]! < charPos) return i + 1;
  }
  return 0;
}

function normalizeNeedleLocal(needle: string): string {
  let out = "";
  for (const ch of needle) {
    if (/\s/.test(ch)) continue;
    out += ch.toLowerCase();
  }
  return out;
}

function findPassageInWindow(
  ni: NormIndex,
  needle: string,
  winStart: number,
  winEnd: number,
  preferNear: number,
  requireAfterAnchor: boolean,
  minNeedleLen = 8
): { start: number; end: number } | null {
  const minNorm = charToNormStart(ni, winStart);
  const maxNorm = charToNormEnd(ni, winEnd);

  const sliceNi: NormIndex = {
    norm: ni.norm.slice(minNorm, maxNorm),
    map: ni.map.slice(minNorm, maxNorm),
  };

  let best: { start: number; end: number; score: number } | null = null;

  for (const variant of needleVariantsLongestFirst(needle, minNeedleLen)) {
    const needleNorm = normalizeNeedleLocal(variant);
    if (needleNorm.length < minNeedleLen) continue;

    let at = ni.norm.indexOf(needleNorm, minNorm);
    while (at >= 0 && at < maxNorm) {
      const startO = ni.map[at];
      const endIdx = ni.map[at + needleNorm.length - 1];
      if (startO != null && endIdx != null) {
        if (requireAfterAnchor && startO < preferNear - 24) {
          at = ni.norm.indexOf(needleNorm, at + 1);
          continue;
        }
        const mapped = { start: startO, end: endIdx + 1 };
        const dist = Math.abs(mapped.start - preferNear);
        const afterBonus = mapped.start >= preferNear - 24 ? 900 : -3000;
        const score = needleNorm.length * 10 - dist + afterBonus;
        if (!best || score > best.score) best = { ...mapped, score };
      }
      at = ni.norm.indexOf(needleNorm, at + 1);
    }

    const found = findRangeWithFallbacks(sliceNi, variant, false);
    if (found) {
      if (requireAfterAnchor && found.start < preferNear - 24) continue;
      const dist = Math.abs(found.start - preferNear);
      const afterBonus = found.start >= preferNear - 24 ? 900 : -3000;
      const score = variant.length * 10 - dist + afterBonus;
      if (!best || score > best.score) {
        best = { start: found.start, end: found.end, score };
      }
    }
  }

  return best ? { start: best.start, end: best.end } : null;
}

function sectionHeadingRange(
  source: string,
  anchor: number,
  winEnd: number,
  sectionHint: string
): { start: number; end: number } {
  const cap = Math.min(winEnd, anchor + 900);
  let end = anchor;

  const firstBreak = source.indexOf("\n", anchor);
  if (firstBreak > anchor && firstBreak < cap) {
    end = firstBreak + 1;
  }

  const paraBreak = source.indexOf("\n\n", end);
  if (paraBreak > end && paraBreak < cap) {
    end = paraBreak;
  } else {
    const nextSub = source.slice(end, cap).search(/\n\d{1,2}(?:\.\d+)+\s/);
    if (nextSub >= 0) end = end + nextSub;
    else end = Math.min(cap, end + Math.max(160, sectionHint.length + 64));
  }

  return { start: anchor, end: Math.max(end, anchor + Math.max(8, sectionHint.length)) };
}

function resolveSectionWindow(source: string, sectionLabel: string): SectionSearchWindow {
  const primary = sectionSearchWindow(source, sectionLabel);
  if (primary.found) return primary;

  for (const needle of buildSectionNeedles(sectionLabel)) {
    const anchor = findSectionAnchor(source, needle);
    if (anchor >= 0) {
      const { start, end } = sectionWindowBounds(source, anchor);
      return { start, end, anchor, found: true };
    }
  }

  return primary;
}

function locateOneItem(
  source: string,
  ni: NormIndex,
  item: ReviewItem
): { start: number; end: number; matched: boolean; navigable: boolean } {
  if (item.kind === "missing" || !item.locateText?.trim()) {
    return { start: 0, end: 0, matched: false, navigable: false };
  }

  const sectionLabel = item.sectionHint || item.title;
  const window = resolveSectionWindow(source, sectionLabel);
  const preferNear = window.found ? window.anchor : 0;
  const scopedMinLen = window.found ? 4 : 8;

  const needles = [
    item.locateText,
    item.originalText,
    item.sectionHint,
    item.title,
  ].filter((n, i, arr) => n?.trim() && arr.indexOf(n) === i) as string[];

  let range: { start: number; end: number } | null = null;

  for (const needle of needles) {
    if (window.found) {
      range = findPassageInWindow(
        ni,
        needle,
        window.start,
        window.end,
        preferNear,
        true,
        scopedMinLen
      );
      if (range) break;

      range = findPassageInWindow(
        ni,
        needle,
        window.start,
        window.end,
        window.anchor,
        false,
        scopedMinLen
      );
      if (range) break;
    }

    if (!window.found) {
      range = findPassageInWindow(
        ni,
        needle,
        0,
        source.length,
        0,
        false,
        8
      );
      if (range) break;

      const found = findRangeWithFallbacks(ni, needle, false);
      if (found) {
        range = found;
        break;
      }
    }
  }

  if (range) {
    return { ...range, matched: true, navigable: true };
  }

  if (window.found) {
    range = sectionHeadingRange(
      source,
      window.anchor,
      window.end,
      sectionLabel
    );
    return { ...range, matched: false, navigable: true };
  }

  return { start: 0, end: 0, matched: false, navigable: false };
}

function sortByDocumentOrder(
  items: ReviewItem[],
  located: LocatedReviewItem[]
): { items: ReviewItem[]; located: LocatedReviewItem[] } {
  const pairs = items.map((item) => ({
    item,
    loc: located.find((l) => l.index === item.index)!,
  }));

  pairs.sort((a, b) => {
    if (a.loc.navigable !== b.loc.navigable) return a.loc.navigable ? -1 : 1;
    if (a.loc.navigable && b.loc.navigable && a.loc.start !== b.loc.start) {
      return a.loc.start - b.loc.start;
    }
    return a.item.index - b.item.index;
  });

  return {
    items: pairs.map((p, i) => ({ ...p.item, index: i })),
    located: pairs.map((p, i) => ({ ...p.loc, index: i })),
  };
}

export interface LocateReviewResult {
  source: string;
  located: LocatedReviewItem[];
  items: ReviewItem[];
}

/** Locate each suggestion independently, then sort by document order for navigation. */
export function locateReviewItems(
  contractText: string,
  items: ReviewItem[]
): LocateReviewResult {
  const source = formatContractText(contractText.replace(/\r\n/g, "\n"));
  const ni = buildNormIndex(source);

  const rawLocated: LocatedReviewItem[] = items.map((item) => {
    const hit = locateOneItem(source, ni, item);
    return {
      index: item.index,
      start: hit.start,
      end: hit.end,
      matched: hit.matched,
      navigable: hit.navigable,
    };
  });

  const refinedItems = items.map((item) => {
    const loc = rawLocated.find((l) => l.index === item.index);
    if (loc?.navigable && loc.end > loc.start) {
      const snapped = source.slice(loc.start, loc.end).trim();
      if (snapped) return { ...item, originalText: snapped };
    }
    return { ...item };
  });

  const sorted = sortByDocumentOrder(refinedItems, rawLocated);
  return { source, ...sorted };
}
