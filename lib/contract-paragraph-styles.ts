import type { Editor } from "@tiptap/react";
import {
  applyLayoutEngineToEditor,
  applyLayoutStyleSpecToEditor,
  documentFormatIdToTemplateId,
} from "@/lib/layout-engine";
import type { LayoutTemplateId } from "@/lib/layout-engine";

export type ContractParagraphStyleId =
  | "normal"
  | "title"
  | "articleHeading"
  | "clauseHeading"
  | "partyBlock"
  | "signature";

export type DocumentFormatId = LayoutTemplateId;

export interface DocumentFormatPreset {
  id: DocumentFormatId;
  locale: "zh" | "en";
  fontFamily: string;
  bodySizePt: number;
  titleSizePt: number;
}

export const DOCUMENT_FORMAT_PRESETS: DocumentFormatPreset[] = [
  {
    id: "zh-standard",
    locale: "zh",
    fontFamily: "SimSun, STSong, serif",
    bodySizePt: 12,
    titleSizePt: 16,
  },
  {
    id: "zh-formal",
    locale: "zh",
    fontFamily: '"SimHei", "Microsoft YaHei", sans-serif',
    bodySizePt: 11,
    titleSizePt: 18,
  },
  {
    id: "en-standard",
    locale: "en",
    fontFamily: "Calibri, Arial, sans-serif",
    bodySizePt: 11,
    titleSizePt: 16,
  },
  {
    id: "en-formal",
    locale: "en",
    fontFamily: '"Times New Roman", Times, serif',
    bodySizePt: 12,
    titleSizePt: 18,
  },
];

const PARAGRAPH_STYLE_MAP: Record<
  ContractParagraphStyleId,
  "body" | "title" | "articleHeading" | "clauseHeading" | "partyBlock" | "signature"
> = {
  normal: "body",
  title: "title",
  articleHeading: "articleHeading",
  clauseHeading: "clauseHeading",
  partyBlock: "partyBlock",
  signature: "signature",
};

/** Apply a Word-like paragraph style to the current block via the layout style registry. */
export function applyContractParagraphStyle(
  editor: Editor,
  styleId: ContractParagraphStyleId,
  locale: "zh" | "en" = "zh"
) {
  const templateId = documentFormatIdToTemplateId(
    locale === "en" ? "en-standard" : "zh-standard"
  );
  applyLayoutStyleSpecToEditor(editor, templateId, PARAGRAPH_STYLE_MAP[styleId]);
}

/** Apply a full document layout template through the layout engine. */
export function applyDocumentFormatPreset(
  editor: Editor,
  presetId: DocumentFormatId,
  locale: "zh" | "en"
): string {
  const templateId = documentFormatIdToTemplateId(presetId);
  const result = applyLayoutEngineToEditor(editor, templateId, locale);
  return result.html;
}

export function detectActiveParagraphStyle(editor: Editor): ContractParagraphStyleId {
  if (editor.isActive("heading", { level: 2 })) return "articleHeading";
  if (editor.isActive("heading", { level: 3 })) return "clauseHeading";
  if (editor.isActive({ textAlign: "center" })) return "title";
  if (editor.isActive({ textAlign: "right" })) return "signature";
  return "normal";
}
