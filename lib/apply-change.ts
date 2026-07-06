import type { ContractChange } from "@/lib/types";
import { locateAllChanges } from "@/lib/redline";

/** Replace one suggestion's original passage with the revised text in the contract body. */
export function applyChangeToText(text: string, change: ContractChange): string | null {
  const original = change.original?.trim();
  const revised = change.revised?.trim();
  if (!original || !revised) return null;

  const { located } = locateAllChanges(text, [change]);
  const loc = located[0];
  if (loc?.matched) {
    return text.slice(0, loc.start) + revised + text.slice(loc.end);
  }

  if (text.includes(original)) {
    return text.replace(original, revised);
  }

  return null;
}

/** Scroll/select a matched passage inside a textarea. Returns whether selection succeeded. */
export function selectPassageInTextarea(
  textarea: HTMLTextAreaElement,
  text: string,
  change: ContractChange
): boolean {
  const { located } = locateAllChanges(text, [change], { strict: true });
  const loc = located[0];
  let start = loc?.matched ? loc.start : -1;
  let end = loc?.matched ? loc.end : -1;

  if (start < 0) {
    const original = change.original?.trim();
    if (!original) return false;
    start = text.indexOf(original);
    if (start < 0) return false;
    end = start + original.length;
  }

  textarea.focus();
  textarea.setSelectionRange(start, end);
  const before = text.slice(0, start);
  const line = before.split("\n").length;
  const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10) || 24;
  textarea.scrollTop = Math.max(0, (line - 4) * lineHeight);
  return true;
}
