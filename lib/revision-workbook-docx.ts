import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  PageBreak,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import type { ReportLocale } from "@/lib/pdf-export";
import { toContractLines } from "@/lib/contract-format";
import {
  prepareChangesForExport,
  applyRevisionsToContractText,
  type PreparedExportChange,
} from "@/lib/revision-export";
import type { ContractChange } from "@/lib/types";

const FONT = (locale: ReportLocale) => (locale === "zh" ? "SimSun" : "Calibri");

const RED = "B91C1C";
const GREEN = "15803D";
const AMBER = "B45309";
const MUTED = "6B7280";

const L = {
  zh: {
    title: "合同修订对照稿",
    subtitle: "ClauseCheck · 仅供谈判参考，不构成法律意见",
    intro:
      "本文档包含两部分：① 逐条修订对照（原文 / 修改后 / 修改说明）；② 修订后合同全文（已尽量根据您采纳的建议自动改写，说明性建议已尝试推导为条款表述，请务必人工核对）。",
    stats: (total: number, applied: number) =>
      `共 ${total} 条采纳建议 · 其中 ${applied} 条已写入修订后全文`,
    sectionCompare: "一、逐条修订对照",
    sectionFull: "二、修订后合同全文",
    sectionRedline: "（对照部分含红线删增展示）",
    item: (n: number) => `第 ${n} 条`,
    original: "原文：",
    revised: "修改后：",
    advisory: "修改要点：",
    derived: "建议条款表述：",
    pending: "（未能自动改写为完整条款，请按修改要点人工调整）",
    reason: "理由：",
    missing: "建议新增条款：",
    empty: "暂无采纳的建议。",
    disclaimer:
      "本对照稿由 AI 辅助生成。签署前请由法务或律师审阅，并与对方确认每一条修订。",
  },
  en: {
    title: "Contract Revision Workbook",
    subtitle: "ClauseCheck · For negotiation only — not legal advice",
    intro:
      "Two parts: (1) item-by-item comparison; (2) full revised text with accepted edits applied where possible. Advisory notes are derived into clause wording — verify manually.",
    stats: (total: number, applied: number) =>
      `${total} accepted · ${applied} applied to full revised text`,
    sectionCompare: "I. Item-by-item comparison",
    sectionFull: "II. Full revised contract text",
    sectionRedline: "(Comparison section shows redline before/after)",
    item: (n: number) => `Item ${n}`,
    original: "Original: ",
    revised: "Revised: ",
    advisory: "Revision note: ",
    derived: "Suggested clause wording: ",
    pending: "(Could not auto-rewrite — please edit manually per the note above.)",
    reason: "Rationale: ",
    missing: "Proposed new clause: ",
    empty: "No accepted suggestions.",
    disclaimer:
      "AI-assisted draft only. Have counsel review and confirm each revision before signing.",
  },
};

function compareBlock(prepared: PreparedExportChange[], locale: ReportLocale): Paragraph[] {
  const font = FONT(locale);
  const labels = L[locale];
  const out: Paragraph[] = [];

  prepared.forEach((p, i) => {
    const header = `${labels.item(i + 1)}${p.section ? ` · ${p.section}` : ""}`;
    out.push(
      new Paragraph({
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: header, font, bold: true, size: 24 })],
      })
    );

    if (!p.original?.trim()) {
      out.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: labels.missing, font, bold: true, size: 20, color: GREEN }),
            new TextRun({
              text: p.exportRevised || p.revised || "",
              font,
              size: 22,
              color: GREEN,
            }),
          ],
        })
      );
    } else {
      out.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: labels.original, font, bold: true, size: 20 }),
            new TextRun({ text: p.original, font, size: 22 }),
          ],
        })
      );

      if (p.isAdvisory && p.advisoryNote) {
        out.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: labels.advisory, font, bold: true, size: 20, color: AMBER }),
              new TextRun({ text: p.advisoryNote, font, size: 22, color: AMBER }),
            ],
          })
        );
      }

      if (p.exportRevised?.trim()) {
        out.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: p.isAdvisory ? labels.derived : labels.revised,
                font,
                bold: true,
                size: 20,
                color: GREEN,
              }),
              new TextRun({ text: p.exportRevised, font, size: 22, color: GREEN }),
            ],
          })
        );
        out.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: labels.original, font, bold: true, size: 18, color: RED }),
              new TextRun({ text: p.original, font, size: 20, color: RED, strike: true }),
              new TextRun({ text: "  →  ", font, size: 20 }),
              new TextRun({ text: p.exportRevised, font, size: 20, color: GREEN }),
            ],
          })
        );
      } else if (p.isAdvisory) {
        out.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: labels.pending, font, italics: true, size: 20, color: MUTED }),
            ],
          })
        );
      }
    }

    if (p.reason) {
      out.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `${labels.reason}${p.reason}`,
              font,
              italics: true,
              size: 18,
              color: MUTED,
            }),
          ],
        })
      );
    }
  });

  return out;
}

function fullTextBlock(revisedPlain: string, locale: ReportLocale): Paragraph[] {
  const font = FONT(locale);
  const lines = toContractLines(revisedPlain);

  return lines.map((line) => {
    if (line.kind === "title") {
      return new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200, line: 360 },
        children: [new TextRun({ text: line.text, font, bold: true, size: 28 })],
      });
    }
    if (line.kind === "heading") {
      return new Paragraph({
        spacing: { before: 160, after: 80, line: 360 },
        children: [new TextRun({ text: line.text, font, bold: true, size: 24 })],
      });
    }
    return new Paragraph({
      spacing: { after: 60, line: 360 },
      indent: { firstLine: convertMillimetersToTwip(8) },
      children: [new TextRun({ text: line.text, font, size: 22 })],
    });
  });
}

export async function generateRevisionWorkbookDocx(opts: {
  contractText: string;
  changes: ContractChange[];
  locale?: ReportLocale;
  fileName?: string | null;
}): Promise<{ bytes: Uint8Array; prepared: PreparedExportChange[]; appliedCount: number }> {
  const locale = opts.locale === "en" ? "en" : "zh";
  const labels = L[locale];
  const font = FONT(locale);
  const prepared = prepareChangesForExport(opts.contractText, opts.changes);
  const { text: revisedPlain, appliedCount: fullTextApplied } = applyRevisionsToContractText(
    opts.contractText,
    prepared
  );

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: labels.title, font, bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: labels.subtitle, font, size: 18, color: MUTED })],
    }),
  ];

  if (opts.fileName) {
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: locale === "zh" ? `原文件：${opts.fileName}` : `Source: ${opts.fileName}`,
            font,
            size: 20,
            color: MUTED,
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: labels.intro, font, size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: labels.stats(prepared.length, fullTextApplied),
          font,
          bold: true,
          size: 20,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [new TextRun({ text: labels.sectionCompare, font, bold: true, size: 26 })],
    })
  );

  if (!prepared.length) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: labels.empty, font, size: 22, color: MUTED })],
      })
    );
  } else {
    children.push(...compareBlock(prepared, locale));
  }

  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: labels.sectionFull, font, bold: true, size: 26 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: labels.sectionRedline, font, italics: true, size: 18, color: MUTED }),
      ],
    }),
    ...fullTextBlock(revisedPlain, locale),
    new Paragraph({
      spacing: { before: 320 },
      children: [new TextRun({ text: labels.disclaimer, font, italics: true, size: 16, color: MUTED })],
    })
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const buffer = await Packer.toBuffer(doc);
  return { bytes: new Uint8Array(buffer), prepared, appliedCount: fullTextApplied };
}
