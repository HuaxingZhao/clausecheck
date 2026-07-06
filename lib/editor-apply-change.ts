import type { Editor } from "@tiptap/react";
import type { ContractChange } from "@/lib/types";
import {
  buildDocPlainIndex,
  findChangeInEditorDoc,
  findChangePassageInEditorDoc,
  locateAllChangesInEditorDoc,
} from "@/lib/editor-plain-index";
import {
  scrollEditorToPosition,
  updateSuggestionHighlightDecorations,
  type EditorHighlightRange,
} from "@/lib/tiptap-suggestion-highlights";

export type EditorLocatedChange = {
  index: number;
  change: ContractChange;
  start: number;
  end: number;
  matched: boolean;
  navigable: boolean;
  from?: number;
  to?: number;
};

/** Single source of truth for suggestion ↔ editor text matching. */
export function locateChangesInEditor(
  editor: Editor,
  changes: ContractChange[]
): { located: EditorLocatedChange[]; index: ReturnType<typeof buildDocPlainIndex> } {
  const index = buildDocPlainIndex(editor.state.doc);
  const items = locateAllChangesInEditorDoc(editor.state.doc, changes);

  const located: EditorLocatedChange[] = items.map((item, i) => ({
    index: item.index,
    change: changes[i]!,
    start: item.range?.plainStart ?? 0,
    end: item.range?.plainEnd ?? 0,
    matched: item.matched,
    navigable: item.navigable,
    from: item.range?.from,
    to: item.range?.to,
  }));

  return { located, index };
}

function navRangeForChange(
  editor: Editor,
  change: ContractChange,
  changeIndex?: number,
  allChanges?: ContractChange[]
): { from: number; to: number } | null {
  if (changeIndex != null && allChanges?.length) {
    const items = locateAllChangesInEditorDoc(editor.state.doc, allChanges);
    const item = items[changeIndex];
    if (item?.range && item.navigable) {
      return { from: item.range.from, to: item.range.to };
    }
  }

  const hit = findChangeInEditorDoc(editor.state.doc, change);
  if (!hit) return null;
  return { from: hit.from, to: hit.to };
}

function applyRangeForChange(
  editor: Editor,
  change: ContractChange,
  changeIndex?: number,
  allChanges?: ContractChange[]
): { from: number; to: number } | null {
  if (changeIndex != null && allChanges?.length) {
    const items = locateAllChangesInEditorDoc(editor.state.doc, allChanges);
    const item = items[changeIndex];
    if (item?.matched && item.range) {
      return { from: item.range.from, to: item.range.to };
    }
  }

  const hit = findChangePassageInEditorDoc(editor.state.doc, change);
  if (!hit) return null;
  return { from: hit.from, to: hit.to };
}

function insertPlainTextAtRange(
  editor: Editor,
  range: { from: number; to: number },
  text: string
): void {
  editor
    .chain()
    .focus()
    .setTextSelection(range)
    .insertContent({ type: "text", text })
    .run();
}

/** Select the matched passage in the TipTap editor and scroll it into view. */
export function selectChangeInEditor(
  editor: Editor,
  change: ContractChange,
  changeIndex?: number,
  allChanges?: ContractChange[]
): boolean {
  const range = navRangeForChange(editor, change, changeIndex, allChanges);
  if (!range || range.from >= range.to) return false;

  editor.chain().focus().setTextSelection(range).run();
  scrollEditorToPosition(editor, range.from);
  return true;
}

/** Replace the matched passage in-place (preserves surrounding formatting). */
export function applyChangeInEditor(
  editor: Editor,
  change: ContractChange,
  changeIndex?: number,
  allChanges?: ContractChange[]
): boolean {
  const revised = change.revised?.trim();
  if (!revised) return false;

  const range = applyRangeForChange(editor, change, changeIndex, allChanges);
  if (!range || range.from >= range.to) return false;

  insertPlainTextAtRange(editor, range, revised);
  scrollEditorToPosition(editor, range.from);
  return true;
}

/** Apply multiple changes bottom-to-top so positions stay valid. */
export function applyAllChangesInEditor(
  editor: Editor,
  changes: ContractChange[]
): Set<number> {
  const items = locateAllChangesInEditorDoc(editor.state.doc, changes);

  const sorted = items
    .filter((item) => item.matched && item.range)
    .map((item) => ({
      index: item.index,
      change: changes[item.index]!,
      ...item.range!,
    }))
    .sort((a, b) => b.plainStart - a.plainStart);

  const applied = new Set<number>();
  for (const item of sorted) {
    const revised = item.change.revised?.trim();
    if (!revised) continue;
    insertPlainTextAtRange(
      editor,
      { from: item.from, to: item.to },
      revised
    );
    applied.add(item.index);
  }

  return applied;
}

/** Map located plain-text ranges to ProseMirror positions for inline highlights. */
export function buildEditorHighlightRanges(
  editor: Editor,
  changes: ContractChange[],
  appliedIndices?: Set<number>
): EditorHighlightRange[] {
  const items = locateAllChangesInEditorDoc(editor.state.doc, changes);

  return items.map((item) => {
    const applied = appliedIndices?.has(item.index) ?? false;
    const highlight = item.matched || applied;
    return {
      index: item.index,
      from: item.range?.from ?? 0,
      to: item.range?.to ?? 0,
      matched: highlight && !!item.range && item.range.from < item.range.to,
    };
  });
}

/** Snap suggestion originals to text found in the live editor document. */
export function refineChangesForEditor(
  editor: Editor,
  changes: ContractChange[]
): ContractChange[] {
  const index = buildDocPlainIndex(editor.state.doc);
  const items = locateAllChangesInEditorDoc(editor.state.doc, changes);

  return changes.map((change, i) => {
    const item = items[i];
    if (item?.matched && item.range) {
      const original = index.plain.slice(item.range.plainStart, item.range.plainEnd);
      if (original.trim()) {
        return { ...change, original };
      }
    }
    return change;
  });
}

export { updateSuggestionHighlightDecorations };
