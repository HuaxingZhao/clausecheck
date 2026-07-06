import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import type { ContractChange } from "@/lib/types";
import {
  type ContractTemplateId,
  getContractTemplate,
} from "@/lib/contract-templates";
import { type ReportLocale, generateCleanContractPdf, type SuggestionReportItem } from "@/lib/pdf-export";
import { buildRedlinedDocument } from "@/lib/redline";
import { toContractLines } from "@/lib/contract-format";

export { generateSuggestionsPdf, generateCleanContractPdf, generateSuggestionReportPdf } from "@/lib/pdf-export";
export type { SuggestionReportItem } from "@/lib/pdf-export";
export type { ContractTemplateId } from "@/lib/contract-templates";
export { CONTRACT_TEMPLATES, defaultTemplateForLocale } from "@/lib/contract-templates";

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

/** Structured final contract Word — professional template layout. */
export async function generateFinalContractDocx(
  finalText: string,
  locale: ReportLocale = "zh",
  templateId: ContractTemplateId = "formal-zh"
): Promise<Uint8Array> {
  const tpl = getContractTemplate(templateId);
  const font = tpl.font[locale];
  const lines = toContractLines(finalText);
  const bodyIndent =
    tpl.bodyFirstLineIndentMm > 0
      ? { firstLine: convertMillimetersToTwip(tpl.bodyFirstLineIndentMm) }
      : undefined;

  const children: Paragraph[] = lines.map((line) => {
    if (line.kind === "title") {
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: {
          after: tpl.spacingAfterTitleTwips,
          line: tpl.lineSpacingTwips,
        },
        children: [
          new TextRun({
            text: line.text,
            font,
            bold: true,
            size: tpl.titleSizeHalfPt,
          }),
        ],
      });
    }
    if (line.kind === "heading") {
      return new Paragraph({
        spacing: {
          before: tpl.spacingBeforeHeadingTwips,
          after: 160,
          line: tpl.lineSpacingTwips,
        },
        children: [
          new TextRun({
            text: line.text,
            font,
            bold: true,
            size: tpl.headingSizeHalfPt,
          }),
        ],
      });
    }
    return new Paragraph({
      spacing: { after: 160, line: tpl.lineSpacingTwips },
      indent: bodyIndent,
      children: [new TextRun({ text: line.text, font, size: tpl.bodySizeHalfPt })],
    });
  });

  const m = tpl.marginsMm;
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(m.top),
              right: convertMillimetersToTwip(m.right),
              bottom: convertMillimetersToTwip(m.bottom),
              left: convertMillimetersToTwip(m.left),
            },
          },
        },
        children,
      },
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

const REPORT_DOCX = {
  zh: {
    title: "带建议的修订报告",
    contractSection: "合同原文（红色标注为建议修改处）",
    suggestionsSection: "修订建议明细",
    item: (n: number) => `建议 ${n}`,
    original: "原文：",
    suggested: "建议修改为：",
    reason: "理由：",
    accepted: "接受",
    rejected: "不接受",
    disclaimer: "AI 生成，仅供参考，不构成法律意见。请在签署前自行审阅。",
  },
  en: {
    title: "Report with Suggestions",
    contractSection: "Original contract (red = suggested change areas)",
    suggestionsSection: "Suggestion details",
    item: (n: number) => `Suggestion ${n}`,
    original: "Original: ",
    suggested: "Suggested change: ",
    reason: "Rationale: ",
    accepted: "Accepted",
    rejected: "Declined",
    disclaimer: "AI-generated for reference only — not legal advice. Review before signing.",
  },
};

/** Report with original contract highlights + suggestion appendix (Word). */
export async function generateSuggestionReportDocx(
  originalText: string,
  items: SuggestionReportItem[],
  locale: ReportLocale = "zh"
): Promise<Uint8Array> {
  const L = REPORT_DOCX[locale];
  const font = FONT(locale);
  const { paragraphs } = buildRedlinedDocument(originalText, items, { preserveLayout: true });
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: L.title, font, bold: true, size: 32 })],
    })
  );

  children.push(
    new Paragraph({
      spacing: { before: 240, after: 160 },
      children: [new TextRun({ text: L.contractSection, font, bold: true, size: 26 })],
    })
  );

  for (const para of paragraphs) {
    const runs: TextRun[] = [];
    for (const span of para) {
      if (span.kind === "inserted") continue;
      if (span.kind === "deleted") {
        runs.push(
          new TextRun({ text: span.text, font, size: 22, color: RED, highlight: "red" })
        );
      } else {
        runs.push(new TextRun({ text: span.text, font, size: 22 }));
      }
    }
    if (runs.length) {
      children.push(new Paragraph({ spacing: { after: 120 }, children: runs }));
    }
  }

  children.push(
    new Paragraph({
      spacing: { before: 360, after: 160 },
      children: [new TextRun({ text: L.suggestionsSection, font, bold: true, size: 26 })],
    })
  );

  items.forEach((c, i) => {
    const status = c.accepted ? L.accepted : L.rejected;
    children.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [
          new TextRun({
            text: `${L.item(i + 1)} · ${status}${c.section ? ` · ${c.section}` : ""}`,
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
          children: [
            new TextRun({ text: L.original, font, bold: true, size: 22 }),
            new TextRun({ text: c.original, font, size: 22, color: RED, strike: true }),
          ],
        })
      );
    }
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: L.suggested, font, bold: true, size: 22 }),
          new TextRun({ text: c.revised, font, size: 22, color: GREEN }),
        ],
      })
    );
    if (c.reason) {
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: L.reason, font, bold: true, size: 20, color: MUTED }),
            new TextRun({ text: c.reason, font, size: 20, color: MUTED }),
          ],
        })
      );
    }
  });

  children.push(
    new Paragraph({
      spacing: { before: 360 },
      children: [new TextRun({ text: L.disclaimer, font, italics: true, size: 18, color: MUTED })],
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

export function suggestionReportFilenames(locale: ReportLocale) {
  const base =
    locale === "zh" ? "ClauseCheck-带建议报告" : "ClauseCheck-Report-with-Suggestions";
  return {
    pdf: `${base}.pdf`,
    docx: `${base}.docx`,
  };
}

export function finalContractFilenames(locale: ReportLocale) {
  const base = locale === "zh" ? "ClauseCheck-修订版合同" : "ClauseCheck-Revised-Contract";
  return {
    pdf: `${base}.pdf`,
    docx: `${base}.docx`,
  };
}
