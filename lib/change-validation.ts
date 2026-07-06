import type { ContractChange } from "./types";
import { locateAllChanges } from "./redline";
import { formatContractText } from "./contract-format";
import { buildSectionNeedles, sectionWindowBounds } from "./section-anchors";
import { isMetaCommentary, stripMetaSuffix } from "./suggestion-diff";
import type { AcceptedRevision } from "./revise";

export interface SkippedChange {
  change: ContractChange;
  reason: "not_located" | "meta_commentary" | "empty_revised";
}

export interface ValidatedChanges {
  valid: ContractChange[];
  skipped: SkippedChange[];
}

/** Find a verbatim anchor near a section label for missing-clause inserts. */
export function findSectionInsertionAnchor(
  contractText: string,
  sectionHint?: string
): { original: string; start: number; end: number } | null {
  if (!sectionHint?.trim()) return null;

  const raw = contractText.replace(/\r\n/g, "\n");
  const formatted = formatContractText(raw);
  const sources = [formatted, raw];

  let needles = buildSectionNeedles(sectionHint);
  if (!needles.length) needles = [sectionHint.trim()];

  for (const source of sources) {
    for (const needle of needles) {
      let idx = source.indexOf(needle);
      if (idx < 0) idx = source.toLowerCase().indexOf(needle.toLowerCase());
      if (idx < 0) continue;

      const { end: windowEnd } = sectionWindowBounds(source, idx);
      let end = source.indexOf("\n\n", idx);
      if (end < 0 || end > windowEnd) end = windowEnd;
      else end = Math.min(end + 2, windowEnd);

      const para = source.slice(idx, end);
      const sentences = para.split(/(?<=[。；;！？!?\.])\s*/);
      for (let i = sentences.length - 1; i >= 0; i--) {
        const s = sentences[i]!.trim();
        if (s.length >= 8) {
          const pos = source.indexOf(s, idx);
          if (pos >= 0) {
            return { original: s, start: pos, end: pos + s.length };
          }
        }
      }

      const tail = para.trim().slice(-Math.min(80, para.trim().length));
      if (tail.length >= 8) {
        const pos = source.indexOf(tail, idx);
        if (pos >= 0) return { original: tail, start: pos, end: pos + tail.length };
      }
    }
  }

  return null;
}

function findMatchingAccepted(
  change: ContractChange,
  accepted: AcceptedRevision[]
): AcceptedRevision | undefined {
  const sec = change.section?.trim();
  return accepted.find(
    (a) =>
      (sec && (a.label.includes(sec) || sec.includes(a.label.slice(0, 6)))) ||
      (change.original &&
        a.original &&
        a.original.length > 10 &&
        change.original.includes(a.original.slice(0, 20)))
  );
}

/** Repair meta-commentary or missing-clause edits using selected suggestion text. */
export function repairChangesFromAccepted(
  contractText: string,
  changes: ContractChange[],
  accepted: AcceptedRevision[],
  locale: "zh" | "en"
): ContractChange[] {
  return changes.map((change) => {
    let original = change.original?.trim() ?? "";
    let revised = change.revised?.trim() ?? "";
    const item = findMatchingAccepted(change, accepted);

    if (isMetaCommentary(revised, locale)) {
      revised = stripMetaSuffix(revised, original, locale);
    }

    if (
      item?.suggestion &&
      (isMetaCommentary(revised, locale) || !revised || revised === original)
    ) {
      const clause = item.suggestion.trim();
      if (!original) {
        const anchor = findSectionInsertionAnchor(contractText, change.section ?? item.label);
        if (anchor) {
          original = anchor.original;
          revised = `${original}${locale === "en" ? " " : ""}${clause}`;
        } else {
          revised = clause;
        }
      } else {
        revised = `${original}${locale === "en" ? " " : ""}${clause}`;
      }
    }

    if (!original && item?.type === "missing_clause") {
      const anchor = findSectionInsertionAnchor(contractText, change.section ?? item.label);
      if (anchor && item.suggestion) {
        original = anchor.original;
        revised = `${original}${locale === "en" ? " " : ""}${item.suggestion.trim()}`;
      }
    }

    return { ...change, original, revised };
  });
}

/** Keep only changes locatable in the contract with real revised text. */
export function validateLocatableChanges(
  contractText: string,
  changes: ContractChange[],
  locale: "zh" | "en"
): ValidatedChanges {
  const { located } = locateAllChanges(contractText, changes, { strict: false });
  const valid: ContractChange[] = [];
  const skipped: SkippedChange[] = [];

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]!;
    const loc = located[i];
    const revised = change.revised?.trim() ?? "";

    if (!revised) {
      skipped.push({ change, reason: "empty_revised" });
      continue;
    }

    if (isMetaCommentary(revised, locale)) {
      skipped.push({ change, reason: "meta_commentary" });
      continue;
    }

    if (!loc?.matched) {
      skipped.push({ change, reason: "not_located" });
      continue;
    }

    valid.push(change);
  }

  return { valid, skipped };
}
