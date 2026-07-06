import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface EditorHighlightRange {
  index: number;
  from: number;
  to: number;
  matched: boolean;
}

const suggestionHighlightKey = new PluginKey("suggestionHighlights");

export const SuggestionHighlights = Extension.create({
  name: "suggestionHighlights",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: suggestionHighlightKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, set) {
            const meta = tr.getMeta(suggestionHighlightKey);
            if (meta?.decorations) return meta.decorations as DecorationSet;
            return set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return suggestionHighlightKey.getState(state) as DecorationSet | undefined;
          },
        },
      }),
    ];
  },
});

export function updateSuggestionHighlightDecorations(
  editor: Editor,
  ranges: EditorHighlightRange[],
  focusedIndex: number | null
) {
  const { state, view } = editor;
  const decorations: Decoration[] = [];

  for (const range of ranges) {
    if (!range.matched || range.from >= range.to) continue;
    const focused = focusedIndex === range.index;
    decorations.push(
      Decoration.inline(range.from, range.to, {
        class: focused
          ? "editor-suggestion-mark editor-suggestion-mark--focused"
          : "editor-suggestion-mark",
        "data-suggestion-index": String(range.index),
      })
    );
  }

  const set = DecorationSet.create(state.doc, decorations);
  view.dispatch(state.tr.setMeta(suggestionHighlightKey, { decorations: set }));
}

export function scrollEditorToPosition(editor: Editor, pos: number) {
  const scrollEl = editor.view.dom.closest(".doc-editor-scroll") as HTMLElement | null;

  editor.commands.scrollIntoView();

  if (!scrollEl) return;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      try {
        const coords = editor.view.coordsAtPos(pos);
        const containerRect = scrollEl.getBoundingClientRect();
        const targetTop =
          coords.top - containerRect.top + scrollEl.scrollTop - containerRect.height * 0.38;
        scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
      } catch {
        /* position out of range */
      }
    });
  });
}
