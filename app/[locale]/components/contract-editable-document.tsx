"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import {
  CONTRACT_EDITOR_SURFACE_CLASS,
  contractEditorExtensions,
} from "@/lib/contract-editor-extensions";
import type { ContractChange } from "@/lib/types";
import {
  applyAllChangesInEditor,
  applyChangeInEditor,
  buildEditorHighlightRanges,
  refineChangesForEditor,
  selectChangeInEditor,
  updateSuggestionHighlightDecorations,
} from "@/lib/editor-apply-change";
import { applyLayoutEngineToEditor, formatLayoutStatsSummary } from "@/lib/layout-engine";
import { locateAllChangesInEditorDoc } from "@/lib/editor-plain-index";
import {
  applyContractParagraphStyle,
  applyDocumentFormatPreset,
  detectActiveParagraphStyle,
  type ContractParagraphStyleId,
  type DocumentFormatId,
} from "@/lib/contract-paragraph-styles";
import ContractDocumentCanvas from "./contract-document-canvas";
import ContractRichTextToolbar from "./contract-rich-text-toolbar";

export {
  prepareEditableContractHtml,
  prepareEditableContractText,
  plainTextToHtml,
} from "@/lib/rich-text";

export interface ContractEditorHandle {
  applyChange: (change: ContractChange, index?: number) => boolean;
  applyAllChanges: (changes: ContractChange[]) => Set<number>;
  selectChange: (change: ContractChange, index?: number) => boolean;
  getHtml: () => string;
  getLocatedFlags: () => boolean[];
}

interface ContractEditableDocumentProps {
  value: string;
  onChange: (html: string) => void;
  changes: ContractChange[];
  focusedIndex: number | null;
  appliedIndices?: Set<number>;
  onLocatedChange?: (located: boolean[]) => void;
  onNavigableChange?: (navigable: boolean[]) => void;
  onChangesRefined?: (changes: ContractChange[]) => void;
  locale?: string;
}

const ContractEditableDocument = forwardRef<
  ContractEditorHandle,
  ContractEditableDocumentProps
>(function ContractEditableDocument(
  {
    value,
    onChange,
    changes,
    focusedIndex,
    appliedIndices,
    onLocatedChange,
    onNavigableChange,
    onChangesRefined,
    locale = "zh",
  },
  ref
) {
  const t = useTranslations("revise");
  const skipNextUpdate = useRef(false);
  const lastExternalValue = useRef(value);
  const editorRef = useRef<Editor | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [layoutStatsLine, setLayoutStatsLine] = useState<string | null>(null);
  const locatedFlagsRef = useRef<boolean[]>([]);
  const refinedOnceRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: contractEditorExtensions(),
    content: value || "<p></p>",
    editorProps: {
      attributes: {
        class: CONTRACT_EDITOR_SURFACE_CLASS,
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (skipNextUpdate.current) {
        skipNextUpdate.current = false;
        return;
      }
      const html = ed.getHTML();
      lastExternalValue.current = html;
      onChange(html);
    },
  });

  editorRef.current = editor;

  function refreshHighlights(ed: Editor) {
    const items = locateAllChangesInEditorDoc(ed.state.doc, changes);
    const passageFlags = items.map((i) => i.matched);
    const navigableFlags = items.map((i) => i.navigable || i.matched);
    locatedFlagsRef.current = passageFlags;
    setMatchedCount(passageFlags.filter(Boolean).length);
    onLocatedChange?.(passageFlags);
    onNavigableChange?.(navigableFlags);
    const ranges = buildEditorHighlightRanges(ed, changes, appliedIndices);
    updateSuggestionHighlightDecorations(ed, ranges, focusedIndex);
  }

  useImperativeHandle(
    ref,
    () => ({
      applyChange(change: ContractChange, index?: number) {
        const ed = editorRef.current;
        if (!ed) return false;
        const ok = applyChangeInEditor(ed, change, index, changes);
        if (ok) {
          const html = ed.getHTML();
          lastExternalValue.current = html;
          onChange(html);
          refreshHighlights(ed);
        }
        return ok;
      },
      applyAllChanges(changeList: ContractChange[]) {
        const ed = editorRef.current;
        if (!ed) return new Set<number>();
        const applied = applyAllChangesInEditor(ed, changeList);
        const html = ed.getHTML();
        lastExternalValue.current = html;
        onChange(html);
        refreshHighlights(ed);
        return applied;
      },
      selectChange(change: ContractChange, index?: number) {
        const ed = editorRef.current;
        if (!ed) return false;
        const idx = index ?? changes.findIndex((c) => c === change);
        return selectChangeInEditor(ed, change, idx >= 0 ? idx : undefined, changes);
      },
      getHtml() {
        return editorRef.current?.getHTML() ?? value;
      },
      getLocatedFlags() {
        return locatedFlagsRef.current;
      },
    }),
    [onChange, value, changes, appliedIndices, onLocatedChange, onNavigableChange, onChangesRefined]
  );

  useEffect(() => {
    if (!editor) return;
    if (value === lastExternalValue.current) return;
    if (value === editor.getHTML()) return;
    skipNextUpdate.current = true;
    lastExternalValue.current = value;
    editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    refreshHighlights(editor);
  }, [editor, changes, focusedIndex, value, appliedIndices]);

  useEffect(() => {
    if (!editor || !changes.length || !onChangesRefined) return;
    if (refinedOnceRef.current && value === lastExternalValue.current) return;
    const refined = refineChangesForEditor(editor, changes);
    refinedOnceRef.current = true;
    onChangesRefined(refined);
    refreshHighlights(editor);
    if (focusedIndex != null) {
      const change = refined[focusedIndex];
      if (change) {
        window.setTimeout(() => {
          selectChangeInEditor(editor, change, focusedIndex, refined);
        }, 120);
      }
    }
  }, [editor, changes, onChangesRefined, value, focusedIndex]);

  useEffect(() => {
    refinedOnceRef.current = false;
  }, [value]);

  useEffect(() => {
    if (focusedIndex == null || !editor) return;
    const change = changes[focusedIndex];
    if (!change) return;

    const timer = window.setTimeout(() => {
      selectChangeInEditor(editor, change, focusedIndex, changes);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [focusedIndex, changes, editor]);

  function handleAutoFormat(presetId?: DocumentFormatId) {
    if (!editor) return;
    const templateId = presetId ?? (locale === "en" ? "en-standard" : "zh-standard");
    const loc = locale === "en" ? "en" : "zh";
    const result = applyLayoutEngineToEditor(editor, templateId, loc);
    skipNextUpdate.current = true;
    lastExternalValue.current = result.html;
    onChange(result.html);
    refreshHighlights(editor);
    const summary = formatLayoutStatsSummary(result, loc);
    setLayoutStatsLine(summary || null);
    window.setTimeout(() => setLayoutStatsLine(null), 6000);
  }

  function handleParagraphStyle(styleId: ContractParagraphStyleId) {
    if (!editor) return;
    applyContractParagraphStyle(editor, styleId, locale === "en" ? "en" : "zh");
    const html = editor.getHTML();
    lastExternalValue.current = html;
    onChange(html);
  }

  const activeStyle = editor ? detectActiveParagraphStyle(editor) : "normal";
  const unmatched = changes.length - matchedCount;

  return (
    <div className="contract-editable-root flex-1 min-h-0 flex flex-col">
      <div className="contract-editor-toolbar-shell shrink-0">
        <ContractRichTextToolbar
          editor={editor}
          locale={locale}
          activeParagraphStyle={activeStyle}
          onParagraphStyle={handleParagraphStyle}
          onAutoFormat={handleAutoFormat}
        />
      </div>

      <div className="contract-editor-status-bar flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 shrink-0">
        <span className="text-xs text-ink-muted font-sans">{t("editorEditableHint")}</span>
        {changes.length > 0 && (
          <span className="text-xs font-sans">
            <span className="text-ink-muted">
              {t("highlightMappedCount", { matched: matchedCount, total: changes.length })}
            </span>
            {unmatched > 0 && (
              <span className="ml-2 text-amber-700">{t("previewPartialMatch", { matched: matchedCount, total: changes.length })}</span>
            )}
            {focusedIndex != null && (
              <span className="ml-2 text-accent font-medium">
                {t("editorJumpedToSuggestion", { n: focusedIndex + 1 })}
              </span>
            )}
            {layoutStatsLine && (
              <span className="ml-2 text-green-700">
                {t("layoutEngineApplied", { summary: layoutStatsLine })}
              </span>
            )}
          </span>
        )}
      </div>

      <ContractDocumentCanvas locale={locale}>
        <EditorContent
          editor={editor}
          className="contract-rich-text-editor"
          aria-label={t("editorContractBodyLabel")}
        />
      </ContractDocumentCanvas>
    </div>
  );
});

export default ContractEditableDocument;
