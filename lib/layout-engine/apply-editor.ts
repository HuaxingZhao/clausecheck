import type { Editor } from "@tiptap/react";
import { runLayoutEngine, documentFormatIdToTemplateId } from "./engine";
import type { LayoutEngineResult, LayoutTemplateId } from "./types";
import { getParagraphStyleSpec, layoutStyleIdToParagraphStyleId, styleSpecToCss } from "./styles";
type EditorParagraphStyleId =
  | "normal"
  | "title"
  | "articleHeading"
  | "clauseHeading"
  | "partyBlock"
  | "signature";

export function applyLayoutEngineToEditor(
  editor: Editor,
  templateId: LayoutTemplateId,
  locale: "zh" | "en"
): LayoutEngineResult {
  const result = runLayoutEngine(editor.getHTML(), { templateId, locale });
  editor.commands.setContent(result.html, { emitUpdate: false });
  return result;
}

/** Apply a single paragraph style spec to the current TipTap block. */
export function applyLayoutStyleSpecToEditor(
  editor: Editor,
  templateId: LayoutTemplateId,
  styleId: Parameters<typeof getParagraphStyleSpec>[1]
) {
  const spec = getParagraphStyleSpec(templateId, styleId);
  const { from, to } = (() => {
    const { $from } = editor.state.selection;
    return { from: $from.start($from.depth), to: $from.end($from.depth) };
  })();

  let chain = editor.chain().focus().setTextSelection({ from, to });

  if (spec.headingLevel) {
    chain = chain.setHeading({ level: spec.headingLevel }).setTextAlign(spec.align);
  } else {
    chain = chain.setParagraph().setTextAlign(spec.align);
  }
  chain.run();

  editor
    .chain()
    .focus()
    .setTextSelection({ from, to })
    .setFontFamily(spec.fontFamily)
    .setFontSize(`${spec.fontSizePt}pt`)
    .run();

  editor.commands.updateAttributes("paragraph", { style: styleSpecToCss(spec) });

  if (spec.bold) {
    editor.chain().focus().setTextSelection({ from, to }).setMark("bold").run();
  } else {
    editor.chain().focus().setTextSelection({ from, to }).unsetMark("bold").run();
  }
}

export function paragraphStyleIdViaLayout(
  editor: Editor,
  paragraphStyleId: EditorParagraphStyleId,
  locale: "zh" | "en"
): void {
  const templateId = documentFormatIdToTemplateId(
    locale === "en" ? "en-standard" : "zh-standard"
  );

  const map: Record<EditorParagraphStyleId, Parameters<typeof getParagraphStyleSpec>[1]> = {
    normal: "body",
    title: "title",
    articleHeading: "articleHeading",
    clauseHeading: "clauseHeading",
    partyBlock: "partyBlock",
    signature: "signature",
  };

  applyLayoutStyleSpecToEditor(editor, templateId, map[paragraphStyleId]);
}

export function formatLayoutStatsSummary(
  result: LayoutEngineResult,
  locale: "zh" | "en"
): string {
  const { stats } = result;
  const parts: string[] = [];
  const labels: Record<string, { zh: string; en: string }> = {
    title: { zh: "标题", en: "title" },
    articleHeading: { zh: "条款", en: "articles" },
    clauseHeading: { zh: "分项", en: "clauses" },
    body: { zh: "正文", en: "body" },
    partyBlock: { zh: "甲乙方", en: "parties" },
    signature: { zh: "签署", en: "signature" },
  };

  for (const [key, label] of Object.entries(labels)) {
    const count = stats[key as keyof typeof stats];
    if (count && count > 0) {
      parts.push(`${locale === "zh" ? label.zh : label.en} ${count}`);
    }
  }

  return parts.join(locale === "zh" ? " · " : " · ");
}

export { layoutStyleIdToParagraphStyleId };
