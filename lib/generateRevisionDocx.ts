import { Readable } from "node:stream";
import {
  AlignmentType,
  Document,
  Header,
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
import { refundUserCredit } from "@/lib/credits/user-credits";
import { getAiDisclaimerExport } from "@/lib/ai-disclaimer";
import type { ContractChange } from "@/lib/types";

/** Hard limits for export safety under concurrent load. */
export const REVISION_DOCX_MAX_BYTES = 50 * 1024 * 1024;
export const REVISION_DOCX_TIMEOUT_MS = 60_000;
/** Paragraphs appended per micro-task to avoid long synchronous stretches. */
const FULLTEXT_YIELD_EVERY = 400;

export type RevisionDocxErrorCode =
  | "INVALID_INPUT"
  | "SIZE_ESTIMATE_EXCEEDED"
  | "SIZE_EXCEEDED"
  | "TIMEOUT"
  | "DOCX_ERROR";

export class RevisionDocxExportError extends Error {
  readonly code: RevisionDocxErrorCode;

  constructor(code: RevisionDocxErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RevisionDocxExportError";
    this.code = code;
  }
}

export interface GenerateRevisionDocxOptions {
  contractText: string;
  changes: ContractChange[];
  locale?: ReportLocale;
  fileName?: string | null;
  /** When set, a failed export triggers credit refund (stage-2 logic). */
  userId?: string | null;
  maxBytes?: number;
  timeoutMs?: number;
}

export interface GenerateRevisionDocxResult {
  bytes: Uint8Array;
  prepared: PreparedExportChange[];
  appliedCount: number;
}

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
    footerNote: "签署前请由法务或律师审阅，并与对方确认每一条修订。",
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
    footerNote:
      "Have counsel review and confirm each revision before signing.",
  },
};

function validateInput(opts: GenerateRevisionDocxOptions): void {
  if (typeof opts.contractText !== "string") {
    throw new RevisionDocxExportError("INVALID_INPUT", "contractText must be a string");
  }
  if (!Array.isArray(opts.changes)) {
    throw new RevisionDocxExportError("INVALID_INPUT", "changes must be an array");
  }
  for (const c of opts.changes) {
    if (c == null || typeof c !== "object") {
      throw new RevisionDocxExportError("INVALID_INPUT", "each change must be an object");
    }
  }
}

/** Pre-export size estimate (UTF-8 bytes × heuristic XML overhead). */
export function estimateRevisionDocxBytes(opts: {
  contractText: string;
  changes: ContractChange[];
}): number {
  const textBytes = Buffer.byteLength(opts.contractText, "utf8");
  let changeBytes = 0;
  for (const c of opts.changes) {
    changeBytes += Buffer.byteLength(String(c.original ?? ""), "utf8");
    changeBytes += Buffer.byteLength(String(c.revised ?? ""), "utf8");
    changeBytes += Buffer.byteLength(String(c.reason ?? ""), "utf8");
  }
  return Math.ceil(textBytes * 2.4 + changeBytes * 3.5 + 512_000);
}

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

function lineToParagraph(
  line: ReturnType<typeof toContractLines>[number],
  font: string
): Paragraph {
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
}

/** Append full-text paragraphs incrementally (no intermediate full array). */
async function appendFullTextParagraphs(
  target: Paragraph[],
  revisedPlain: string,
  locale: ReportLocale
): Promise<void> {
  const font = FONT(locale);
  const lines = toContractLines(revisedPlain);
  for (let i = 0; i < lines.length; i++) {
    target.push(lineToParagraph(lines[i]!, font));
    if (i > 0 && i % FULLTEXT_YIELD_EVERY === 0) {
      await yieldToEventLoop();
    }
  }
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

async function packDocumentStreamToBytes(
  doc: Document,
  maxBytes: number
): Promise<Uint8Array> {
  const stream = Packer.toStream(doc) as Readable;
  const chunks: Buffer[] = [];
  let total = 0;

  return new Promise<Uint8Array>((resolve, reject) => {
    const fail = (err: Error) => {
      stream.destroy();
      reject(err);
    };

    stream.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        fail(
          new RevisionDocxExportError(
            "SIZE_EXCEEDED",
            `Exported DOCX exceeds ${maxBytes} bytes`
          )
        );
        return;
      }
      chunks.push(chunk);
    });

    stream.on("error", (err) => {
      fail(
        new RevisionDocxExportError("DOCX_ERROR", "DOCX pack stream failed", { cause: err })
      );
    });

    stream.on("end", () => {
      resolve(new Uint8Array(Buffer.concat(chunks)));
    });
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new RevisionDocxExportError("TIMEOUT", `Revision DOCX export timed out after ${ms}ms`)
      );
    }, ms);

    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function buildAndPackDocx(opts: {
  contractText: string;
  changes: ContractChange[];
  locale: ReportLocale;
  fileName?: string | null;
  maxBytes: number;
}): Promise<GenerateRevisionDocxResult> {
  const labels = L[opts.locale];
  const font = FONT(opts.locale);

  let prepared: PreparedExportChange[];
  let revisedPlain: string;
  let fullTextApplied: number;

  try {
    prepared = prepareChangesForExport(opts.contractText, opts.changes);
    const applied = applyRevisionsToContractText(opts.contractText, prepared);
    revisedPlain = applied.text;
    fullTextApplied = applied.appliedCount;
  } catch (err) {
    throw new RevisionDocxExportError("INVALID_INPUT", "Failed to prepare revision export", {
      cause: err,
    });
  }

  const aiDisclaimer = getAiDisclaimerExport(opts.locale);

  const children: Paragraph[] = [
    // First-screen hard banner (also mirrored in page header below).
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      border: {
        top: { style: "single", size: 12, color: AMBER, space: 8 },
        bottom: { style: "single", size: 12, color: AMBER, space: 8 },
        left: { style: "single", size: 12, color: AMBER, space: 8 },
        right: { style: "single", size: 12, color: AMBER, space: 8 },
      },
      children: [
        new TextRun({
          text: aiDisclaimer,
          font,
          bold: true,
          size: 22,
          color: AMBER,
        }),
      ],
    }),
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
            text:
              opts.locale === "zh" ? `原文件：${opts.fileName}` : `Source: ${opts.fileName}`,
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
    children.push(...compareBlock(prepared, opts.locale));
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
    })
  );

  await appendFullTextParagraphs(children, revisedPlain, opts.locale);

  children.push(
    new Paragraph({
      spacing: { before: 320 },
      children: [
        new TextRun({
          text: `${aiDisclaimer} ${labels.footerNote}`,
          font,
          italics: true,
          size: 16,
          color: MUTED,
        }),
      ],
    })
  );

  let bytes: Uint8Array;
  try {
    const doc = new Document({
      sections: [
        {
          properties: {},
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: aiDisclaimer,
                      font,
                      bold: true,
                      size: 16,
                      color: AMBER,
                    }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    });
    bytes = await packDocumentStreamToBytes(doc, opts.maxBytes);
  } catch (err) {
    if (err instanceof RevisionDocxExportError) throw err;
    throw new RevisionDocxExportError("DOCX_ERROR", "DOCX generation failed", { cause: err });
  }

  return { bytes, prepared, appliedCount: fullTextApplied };
}

/**
 * Generate revision workbook DOCX with streaming pack, size/time guards, and optional refund.
 */
export async function generateRevisionDocx(
  opts: GenerateRevisionDocxOptions
): Promise<GenerateRevisionDocxResult> {
  validateInput(opts);

  const locale = opts.locale === "en" ? "en" : "zh";
  const maxBytes = opts.maxBytes ?? REVISION_DOCX_MAX_BYTES;
  const timeoutMs = opts.timeoutMs ?? REVISION_DOCX_TIMEOUT_MS;

  const estimate = estimateRevisionDocxBytes({
    contractText: opts.contractText,
    changes: opts.changes,
  });
  if (estimate > maxBytes) {
    throw new RevisionDocxExportError(
      "SIZE_ESTIMATE_EXCEEDED",
      `Estimated export size ${estimate} bytes exceeds limit ${maxBytes}`
    );
  }

  try {
    return await withTimeout(
      buildAndPackDocx({
        contractText: opts.contractText,
        changes: opts.changes,
        locale,
        fileName: opts.fileName,
        maxBytes,
      }),
      timeoutMs
    );
  } catch (err) {
    if (opts.userId) {
      try {
        await refundUserCredit(opts.userId);
      } catch (refundErr) {
        console.error("revision docx refund failed:", refundErr);
      }
    }
    throw err;
  }
}

/** @deprecated Use generateRevisionDocx — kept for existing imports. */
export async function generateRevisionWorkbookDocx(opts: {
  contractText: string;
  changes: ContractChange[];
  locale?: ReportLocale;
  fileName?: string | null;
  userId?: string | null;
}): Promise<{ bytes: Uint8Array; prepared: PreparedExportChange[]; appliedCount: number }> {
  return generateRevisionDocx(opts);
}
