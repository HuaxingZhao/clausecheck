import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ContractChange } from "@/lib/types";
import { type ReportLocale } from "@/lib/pdf-export";

export { generateSuggestionsPdf } from "@/lib/pdf-export";

const FONT = (locale: ReportLocale) => (locale === "zh" ? "SimSun" : "Calibri");

const LABELS = {
  zh: {
    title: "合同修订建议清单",
    item: (n: number) => `建议 ${n}`,
    removed: "删除原文：",
    added: "建议新增：",
    reason: "理由：",
    empty: "暂无可应用的建议。",
    disclaimer: "本清单由 AI 生成，仅供参考，不构成法律意见。请在签署前自行审阅。",
  },
  en: {
    title: "Contract Revision Suggestions",
    item: (n: number) => `Suggestion ${n}`,
    removed: "Removed: ",
    added: "Added: ",
    reason: "Rationale: ",
    empty: "No applicable suggestions.",
    disclaimer:
      "This list is AI-generated for reference only — not legal advice. Review before signing.",
  },
};

const RED = "B91C1C";
const GREEN = "15803D";
const MUTED = "6B7280";

/**
 * Suggestions report as Word (.docx): each accepted edit shown as a redline —
 * removed sentence struck through in red, added sentence in green. Editable.
 */
export async function generateSuggestionsDocx(
  changes: ContractChange[],
  locale: ReportLocale = "zh"
): Promise<Uint8Array> {
  const font = FONT(locale);
  const L = LABELS[locale];

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: L.title, font, bold: true, size: 30 })],
    }),
  ];

  if (!changes.length) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: L.empty, font, size: 22, color: MUTED })] })
    );
  }

  changes.forEach((c, i) => {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 60 },
        children: [
          new TextRun({
            text: `${L.item(i + 1)}${c.section ? ` · ${c.section}` : ""}`,
            font,
            bold: true,
            size: 24,
          }),
        ],
      })
    );
    if (c.original) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: L.removed, font, bold: true, size: 20, color: RED }),
            new TextRun({ text: c.original, font, size: 22, color: RED, strike: true }),
          ],
        })
      );
    }
    if (c.revised) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: L.added, font, bold: true, size: 20, color: GREEN }),
            new TextRun({ text: c.revised, font, size: 22, color: GREEN }),
          ],
        })
      );
    }
    if (c.reason) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: `${L.reason}${c.reason}`, font, italics: true, size: 18, color: MUTED }),
          ],
        })
      );
    }
  });

  children.push(
    new Paragraph({
      spacing: { before: 240 },
      children: [new TextRun({ text: L.disclaimer, font, italics: true, size: 16, color: MUTED })],
    })
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

export function suggestionsFilenames(locale: ReportLocale) {
  const base =
    locale === "zh" ? "ClauseCheck-修订建议清单" : "ClauseCheck-Suggestions";
  return {
    pdf: `${base}.pdf`,
    docx: `${base}.docx`,
  };
}
