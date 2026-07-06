import type { ContractChange } from "./types";
import { buildNormIndex, findRangeWithFallbacks, type LocatedChange, type NormIndex } from "./redline";
import { formatContractText } from "./contract-format";
import { sectionSearchWindow } from "./section-anchors";

function rangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end;
}

function needleVariantsLongestFirst(original: string): string[] {
  const t = original.trim();
  if (!t) return [];
  const variants = [t, original];
  if (t.length > 24) {
    variants.push(t.slice(0, Math.min(160, t.length)));
    variants.push(t.slice(0, Math.min(120, t.length)));
    variants.push(t.slice(0, Math.min(80, t.length)));
  }
  return [...new Set(variants.filter((v) => v.trim().length >= 8))].sort(
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

function findInWindow(
  ni: NormIndex,
  original: string,
  winStart: number,
  winEnd: number,
  preferNear: number,
  strict: boolean,
  requireAfterAnchor: boolean
): { start: number; end: number; score: number } | null {
  const minNorm = charToNormStart(ni, winStart);
  const maxNorm = charToNormEnd(ni, winEnd);

  const sliceNi: NormIndex = {
    norm: ni.norm.slice(minNorm, maxNorm),
    map: ni.map.slice(minNorm, maxNorm),
  };

  const candidates: { start: number; end: number; score: number }[] = [];

  for (const variant of needleVariantsLongestFirst(original)) {
    const needleNorm = normalizeNeedleLocal(variant);
    if (needleNorm.length < 8) continue;

    let at = ni.norm.indexOf(needleNorm, minNorm);
    while (at >= 0 && at < maxNorm) {
      const startO = ni.map[at];
      const endIdx = ni.map[at + needleNorm.length - 1];
      if (startO != null && endIdx != null) {
        if (requireAfterAnchor && startO < preferNear - 20) {
          at = ni.norm.indexOf(needleNorm, at + 1);
          continue;
        }
        const mapped = { start: startO, end: endIdx + 1 };
        const dist = Math.abs(mapped.start - preferNear);
        const afterBonus = mapped.start >= preferNear - 20 ? 800 : -2000;
        candidates.push({
          ...mapped,
          score: needleNorm.length * 10 - dist + afterBonus,
        });
      }
      at = ni.norm.indexOf(needleNorm, at + 1);
    }

    const found = findRangeWithFallbacks(sliceNi, variant, strict);
    if (found) {
      if (requireAfterAnchor && found.start < preferNear - 20) {
        continue;
      }
      const dist = Math.abs(found.start - preferNear);
      const afterBonus = found.start >= preferNear - 20 ? 800 : -2000;
      candidates.push({
        start: found.start,
        end: found.end,
        score: variant.length * 10 - dist + afterBonus,
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]!;
}

/** Section-aware, non-overlapping placement — one range per suggestion index. */
export function locateAllChangesOrdered(
  originalText: string,
  changes: ContractChange[],
  opts?: { strict?: boolean; format?: boolean }
): { source: string; located: LocatedChange[] } {
  const strict = opts?.strict ?? false;
  const normalized = originalText.replace(/\r\n/g, "\n");
  const formatted =
    opts?.format === false ? normalized : formatContractText(normalized);
  const ni = buildNormIndex(formatted);

  const used: { start: number; end: number }[] = [];
  let minForward = 0;

  const located: LocatedChange[] = changes.map((change, index) => {
    const orig = change.original?.trim();
    if (!orig) {
      return { index, change, start: 0, end: 0, matched: false };
    }

    const window = sectionSearchWindow(formatted, change.section);
    const searchStart = window.found
      ? Math.max(window.start, minForward)
      : minForward;

    let found = findInWindow(
      ni,
      change.original!,
      searchStart,
      window.end,
      window.found ? window.anchor : searchStart,
      strict,
      window.found
    );

    if (!found && window.found) {
      found = findInWindow(
        ni,
        change.original!,
        window.start,
        window.end,
        window.anchor,
        false,
        true
      );
    }

    if (!found && !window.found) {
      found = findInWindow(
        ni,
        change.original!,
        minForward,
        formatted.length,
        minForward,
        strict,
        false
      );
    }

    if (!found && !window.found && !strict) {
      found = findInWindow(
        ni,
        change.original!,
        minForward,
        formatted.length,
        minForward,
        false,
        false
      );
    }

    if (!found || used.some((u) => rangesOverlap(found!, u))) {
      return { index, change, start: 0, end: 0, matched: false };
    }

    used.push({ start: found.start, end: found.end });
    minForward = Math.max(minForward, found.start + 1);

    return {
      index,
      change,
      start: found.start,
      end: found.end,
      matched: true,
    };
  });

  return { source: formatted, located };
}

export { sectionSearchWindow } from "./section-anchors";
