import type { Node as PMNode } from "@tiptap/pm/model";
import { findSectionAnchor, sectionSearchWindow } from "./section-anchors";
import { buildNormIndex, findRangeWithFallbacks } from "./redline";
import type { ContractChange } from "./types";

export interface DocPlainIndex {
  plain: string;
  /** doc position for each character in plain (same length as plain) */
  posAt: number[];
}

/** Build plain text from a ProseMirror doc with stable char → absolute doc position mapping. */
export function buildDocPlainIndex(doc: PMNode): DocPlainIndex {
  const posAt: number[] = [];
  let plain = "";

  const append = (ch: string, docPos: number) => {
    plain += ch;
    posAt.push(docPos);
  };

  let blockPos = 1;

  for (let i = 0; i < doc.childCount; i++) {
    const block = doc.child(i);
    const contentStart = blockPos + 1;

    if (i > 0) {
      append("\n", contentStart);
      append("\n", contentStart);
    }

    block.nodesBetween(0, block.content.size, (node, relPos) => {
      if (node.isText && node.text) {
        const absStart = contentStart + relPos;
        for (let j = 0; j < node.text.length; j++) {
          append(node.text[j]!, absStart + j);
        }
      } else if (node.type.name === "hardBreak") {
        append("\n", contentStart + relPos);
      }
    });

    blockPos += block.nodeSize;
  }

  return { plain, posAt };
}

/** Map plain-text [start, end) to ProseMirror doc positions. */
export function plainRangeToDoc(
  index: DocPlainIndex,
  start: number,
  end: number
): { from: number; to: number } | null {
  if (start < 0 || end <= start || end > index.plain.length) return null;
  const from = index.posAt[start];
  const toPos = index.posAt[end - 1];
  if (from == null || toPos == null) return null;
  return { from, to: toPos + 1 };
}

export interface DocTextRange {
  from: number;
  to: number;
  plainStart: number;
  plainEnd: number;
}

function findInPlainWindow(
  plain: string,
  needle: string,
  winStart: number,
  winEnd: number,
  preferNear: number
): { start: number; end: number } | null {
  const slice = plain.slice(winStart, winEnd);
  if (!slice.trim()) return null;

  const ni = buildNormIndex(slice);
  const variants = [needle.trim(), needle];
  const t = needle.trim();
  if (t.length > 20) {
    variants.push(t.slice(0, Math.min(120, t.length)));
    variants.push(t.slice(0, Math.min(80, t.length)));
    variants.push(t.slice(0, Math.min(40, t.length)));
  }

  let best: { start: number; end: number; score: number } | null = null;

  for (const variant of [...new Set(variants.filter((v) => v.trim().length >= 4))]) {
    const found = findRangeWithFallbacks(ni, variant, false);
    if (!found) continue;
    const start = winStart + found.start;
    const end = winStart + found.end;
    const dist = Math.abs(start - preferNear);
    const score = variant.length * 10 - dist;
    if (!best || score > best.score) {
      best = { start, end, score };
    }
  }

  return best ? { start: best.start, end: best.end } : null;
}

/** Scroll to the section heading / sub-clause label in the editor. */
export function scrollToSectionInEditor(
  editor: { state: { doc: PMNode } },
  section?: string
): DocTextRange | null {
  if (!section?.trim()) return null;

  const index = buildDocPlainIndex(editor.state.doc);
  const win = sectionSearchWindow(index.plain, section);
  if (!win.found) return null;

  const anchorEnd = Math.min(index.plain.length, win.anchor + Math.max(4, section.length));
  const docRange = plainRangeToDoc(index, win.anchor, anchorEnd);
  if (!docRange) return null;

  return {
    ...docRange,
    plainStart: win.anchor,
    plainEnd: anchorEnd,
  };
}

/**
 * Find the original passage for apply/replace. Does NOT fall back to section headings.
 */
export function findChangePassageInEditorDoc(
  doc: PMNode,
  change: ContractChange,
  opts?: {
    used?: { start: number; end: number }[];
    minPlain?: number;
  }
): DocTextRange | null {
  const index = buildDocPlainIndex(doc);
  const plain = index.plain;
  const original = change.original?.trim() ?? "";
  if (!original) return null;

  const win = sectionSearchWindow(plain, change.section);
  const searchStart = win.found ? Math.max(win.start, opts?.minPlain ?? 0) : (opts?.minPlain ?? 0);
  const searchEnd = win.found ? win.end : plain.length;
  const preferNear = win.found ? win.anchor : searchStart;

  const hit = findInPlainWindow(plain, original, searchStart, searchEnd, preferNear);
  if (hit && !opts?.used?.some((u) => u.start < hit.end && hit.start < u.end)) {
    const docRange = plainRangeToDoc(index, hit.start, hit.end);
    if (docRange) return { ...docRange, plainStart: hit.start, plainEnd: hit.end };
  }

  if (win.found) {
    const hitWide = findInPlainWindow(plain, original, win.start, win.end, win.anchor);
    if (hitWide && !opts?.used?.some((u) => u.start < hitWide.end && hitWide.start < u.end)) {
      const docRange = plainRangeToDoc(index, hitWide.start, hitWide.end);
      if (docRange) return { ...docRange, plainStart: hitWide.start, plainEnd: hitWide.end };
    }
  }

  if (!win.found) {
    const hitAll = findInPlainWindow(
      plain,
      original,
      opts?.minPlain ?? 0,
      plain.length,
      opts?.minPlain ?? 0
    );
    if (hitAll && !opts?.used?.some((u) => u.start < hitAll.end && hitAll.start < u.end)) {
      const docRange = plainRangeToDoc(index, hitAll.start, hitAll.end);
      if (docRange) return { ...docRange, plainStart: hitAll.start, plainEnd: hitAll.end };
    }
  }

  return null;
}

/**
 * Find a navigation target — original passage if possible, otherwise section heading.
 */
export function findChangeInEditorDoc(
  doc: PMNode,
  change: ContractChange,
  opts?: {
    used?: { start: number; end: number }[];
    minPlain?: number;
  }
): DocTextRange | null {
  const passage = findChangePassageInEditorDoc(doc, change, opts);
  if (passage) return passage;

  const index = buildDocPlainIndex(doc);
  const plain = index.plain;
  const win = sectionSearchWindow(plain, change.section);

  if (win.found) {
    const anchorEnd = Math.min(plain.length, win.anchor + Math.max(12, (change.section?.length ?? 4)));
    const docRange = plainRangeToDoc(index, win.anchor, anchorEnd);
    if (docRange) {
      return { ...docRange, plainStart: win.anchor, plainEnd: anchorEnd };
    }
  }

  if (change.section?.trim()) {
    const anchor = findSectionAnchor(plain, change.section);
    if (anchor >= 0) {
      const anchorEnd = Math.min(plain.length, anchor + 24);
      const docRange = plainRangeToDoc(index, anchor, anchorEnd);
      if (docRange) {
        return { ...docRange, plainStart: anchor, plainEnd: anchorEnd };
      }
    }
  }

  return null;
}

/** Locate all changes in document order with non-overlapping plain ranges. */
export function locateAllChangesInEditorDoc(
  doc: PMNode,
  changes: ContractChange[]
): Array<{ index: number; matched: boolean; navigable: boolean; range: DocTextRange | null }> {
  const used: { start: number; end: number }[] = [];
  let minPlain = 0;

  return changes.map((change, index) => {
    const passage = findChangePassageInEditorDoc(doc, change, { used, minPlain });
    if (passage && passage.plainEnd > passage.plainStart) {
      used.push({ start: passage.plainStart, end: passage.plainEnd });
      minPlain = Math.max(minPlain, passage.plainStart + 1);
      return { index, matched: true, navigable: true, range: passage };
    }

    const nav = findChangeInEditorDoc(doc, change, { used, minPlain });
    if (nav && nav.plainEnd > nav.plainStart) {
      return { index, matched: false, navigable: true, range: nav };
    }

    return { index, matched: false, navigable: false, range: null };
  });
}
