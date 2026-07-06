import { readFile } from "fs/promises";
import path from "path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  rgb,
  PageSizes,
  StandardFonts,
  type PDFPage,
  type PDFFont,
  type RGB,
} from "pdf-lib";
import type { ScanResult, SigningRecommendation, ContractChange } from "./types";
import { buildRedlinedDocument, type RedlineSpan } from "./redline";
import { toContractLines } from "./contract-format";
import {
  type ContractTemplateId,
  getContractTemplate,
} from "./contract-templates";

export type ReportLocale = "zh" | "en";

const COLORS = {
  primary: rgb(0.1, 0.1, 0.1),
  accent: rgb(0.88, 0.35, 0.14),
  accentDark: rgb(0.55, 0.23, 0.06),
  medium: rgb(0.96, 0.65, 0.14),
  low: rgb(0.16, 0.67, 0.42),
  muted: rgb(0.45, 0.45, 0.48),
  lightBg: rgb(0.96, 0.95, 0.93),
  white: rgb(1, 1, 1),
  border: rgb(0.88, 0.87, 0.85),
  redBg: rgb(0.99, 0.95, 0.94),
  amberBg: rgb(0.99, 0.97, 0.92),
  greenBg: rgb(0.94, 0.98, 0.96),
  cardBg: rgb(0.99, 0.98, 0.96),
};

const LABELS = {
  zh: {
    subtitle: "AI 合同风险报告",
    generated: "生成时间",
    overview: "报告概览",
    riskScore: "综合风险评分",
    formula: "加权公式: 公平性 x 35% + 合规性 x 25% + 财务风险 x 40%",
    dimensions: "分维度风险评分",
    dimHint: "分数越高 = 该维度风险越大",
    fairness: "合同公平性",
    compliance: "法律合规性",
    financial: "财务风险",
    flags: (n: number) => `发现 ${n} 个需关注条款`,
    timeTerms: "时间敏感条款",
    negotiations: "谈判优先级",
    current: "当前表述",
    suggested: "建议改为",
    summary: "综合评估与行动建议",
    executive: "高管摘要",
    signing: "签署建议",
    signingRec: {
      sign: "可以签署",
      sign_with_changes: "修改后签署",
      do_not_sign: "不建议签署",
    } as Record<SigningRecommendation, string>,
    contractType: "合同类型",
    worstCase: "最坏情况分析",
    strengths: "有利条款 (谈判筹码)",
    missing: "缺失的关键条款",
    actionItems: "优先行动项",
    refineNotes: "交叉验证说明",
    disclaimer: "免责声明",
    disclaimerText:
      "本报告由 AI 自动生成，仅供参考，不构成法律意见。涉及重大利益的合同，建议咨询专业律师。ClauseCheck 不对因使用本报告而产生的任何损失承担责任。",
    footer: (n: number, total: number) => `ClauseCheck · 第 ${n} / ${total} 页`,
    riskLevel: { high: "高风险", medium: "中风险", low: "低风险" },
    timeType: {
      auto_renewal: "自动续约",
      deadline: "硬性截止日",
      expiration: "到期/失效",
      notice_period: "通知期限",
    },
    category: "类别",
    legalBasis: "法律依据",
    impact: "不修改的后果",
    quote: "原文引用",
  },
  en: {
    subtitle: "AI Contract Risk Report",
    generated: "Generated",
    overview: "Report Overview",
    riskScore: "Overall Risk Score",
    formula: "Weighted: Fairness x 35% + Compliance x 25% + Financial x 40%",
    dimensions: "Risk by Dimension",
    dimHint: "Higher score = greater risk in that dimension",
    fairness: "Contract Fairness",
    compliance: "Legal Compliance",
    financial: "Financial Risk",
    flags: (n: number) => `${n} Clauses Flagged`,
    timeTerms: "Time-Sensitive Clauses",
    negotiations: "Negotiation Priorities",
    current: "Current wording",
    suggested: "Suggested revision",
    summary: "Overall Assessment & Action Plan",
    executive: "Executive Summary",
    signing: "Signing Recommendation",
    signingRec: {
      sign: "Ready to Sign",
      sign_with_changes: "Sign After Negotiation",
      do_not_sign: "Do Not Sign As-Is",
    } as Record<SigningRecommendation, string>,
    contractType: "Contract Type",
    worstCase: "Worst-Case Scenario",
    strengths: "Favorable Terms (Leverage)",
    missing: "Missing Standard Clauses",
    actionItems: "Priority Action Items",
    refineNotes: "Quality Review Notes",
    disclaimer: "Disclaimer",
    disclaimerText:
      "This report is AI-generated for reference only and does not constitute legal advice. For high-stakes contracts, consult a licensed attorney. ClauseCheck is not liable for losses arising from use of this report.",
    footer: (n: number, total: number) => `ClauseCheck · Page ${n} of ${total}`,
    riskLevel: { high: "High Risk", medium: "Medium Risk", low: "Low Risk" },
    timeType: {
      auto_renewal: "Auto-renewal",
      deadline: "Hard deadline",
      expiration: "Expiration",
      notice_period: "Notice period",
    },
    category: "Category",
    legalBasis: "Legal basis",
    impact: "If unchanged",
    quote: "Original text",
  },
};

let fontCache: Uint8Array | null = null;

export async function loadCjkFontBytes(): Promise<Uint8Array> {
  if (fontCache) return fontCache;
  const fontPath = path.join(process.cwd(), "assets/fonts/NotoSansSC-Regular.otf");
  fontCache = await readFile(fontPath);
  return fontCache;
}

function isBasicLatin(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return code >= 0x20 && code <= 0x7e;
}

/** Coerce AI fields that may arrive as objects/arrays into plain text */
function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(toText).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const inner = toText(v);
        return inner ? `${k}: ${inner}` : k;
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(value);
}

function clean(text: string, locale: ReportLocale): string {
  let s = (text || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\u00d7/g, "x")
    .replace(/[ \t]+/g, " ")
    .trim();
  if (locale === "en") {
    s = s
      .replace(/[「」]/g, '"')
      .replace(/\uFF0C/g, ",")
      .replace(/\u3002/g, ".")
      .replace(/\uFF1A/g, ":")
      .replace(/\uFF1B/g, ";")
      .replace(/\uFF08/g, "(")
      .replace(/\uFF09/g, ")")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"');
  }
  return s;
}

function isAsciiText(text: string): boolean {
  return [...text].every((ch) => isBasicLatin(ch));
}

function formatDate(locale: ReportLocale): string {
  const d = new Date();
  if (locale === "zh") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreKey(scoreText: string, scoreNum: number): "high" | "medium" | "low" {
  if (scoreText.includes("高") || scoreText.toLowerCase().includes("high")) return "high";
  if (scoreText.includes("中") || scoreText.toLowerCase().includes("medium")) return "medium";
  if (scoreText.includes("低") || scoreText.toLowerCase().includes("low")) return "low";
  if (scoreNum >= 70) return "high";
  if (scoreNum >= 40) return "medium";
  return "low";
}

function riskColor(level: string): RGB {
  if (level === "high") return COLORS.accent;
  if (level === "low") return COLORS.low;
  return COLORS.medium;
}

class PdfWriter {
  private page: PDFPage;
  private y: number;
  private readonly pages: PDFPage[] = [];
  private readonly lineGap: number;

  constructor(
    private doc: PDFDocument,
    private latin: PDFFont,
    private latinBold: PDFFont,
    private cjk: PDFFont | null,
    private width: number,
    private height: number,
    private margin: number,
    private contentW: number,
    private locale: ReportLocale
  ) {
    this.page = doc.addPage([width, height]);
    this.pages.push(this.page);
    this.y = height - margin;
    this.lineGap = locale === "zh" ? 7 : 4;
  }

  private pickFont(ch: string, bold = false): PDFFont {
    if (isBasicLatin(ch)) {
      return bold ? this.latinBold : this.latin;
    }
    return this.cjk ?? (bold ? this.latinBold : this.latin);
  }

  private charWidth(ch: string, size: number, bold = false): number {
    const font = this.pickFont(ch, bold);
    try {
      return font.widthOfTextAtSize(ch, size);
    } catch {
      if (this.cjk && font !== this.cjk) {
        return this.cjk.widthOfTextAtSize(ch, size);
      }
      return size * 0.45;
    }
  }

  private measure(text: string, size: number, bold = false): number {
    let w = 0;
    for (const ch of text) {
      w += this.charWidth(ch, size, bold);
    }
    return w;
  }

  private wrapLatin(text: string, size: number, maxWidth: number, bold = false): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (this.measure(test, size, bold) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  private wrapCjk(text: string, size: number, maxWidth: number, bold = false): string[] {
    const lines: string[] = [];
    let current = "";
    for (const ch of text) {
      if (ch === "\n") {
        if (current) lines.push(current);
        current = "";
        continue;
      }
      const test = current + ch;
      if (this.measure(test, size, bold) > maxWidth && current) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  private wrap(text: unknown, size: number, maxWidth: number, bold = false): string[] {
    const normalized = clean(toText(text), this.locale);
    const lines: string[] = [];
    const paragraphs = normalized.split(/\n+/);
    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lines.push("");
        continue;
      }
      const chunkLines = isAsciiText(paragraph)
        ? this.wrapLatin(paragraph, size, maxWidth, bold)
        : this.wrapCjk(paragraph, size, maxWidth, bold);
      lines.push(...chunkLines);
    }
    return lines.length ? lines : [""];
  }

  private drawLine(line: string, x: number, yPos: number, size: number, color: RGB, bold = false) {
    let xCursor = x;
    for (const ch of line) {
      const f = this.pickFont(ch, bold);
      try {
        this.page.drawText(ch, { x: xCursor, y: yPos, size, font: f, color });
        xCursor += f.widthOfTextAtSize(ch, size);
      } catch {
        if (this.cjk && f !== this.cjk) {
          this.page.drawText(ch, { x: xCursor, y: yPos, size, font: this.cjk, color });
          xCursor += this.cjk.widthOfTextAtSize(ch, size);
        }
      }
    }
  }

  ensureSpace(needed: number) {
    if (this.y - needed < this.margin + 44) {
      this.page = this.doc.addPage([this.width, this.height]);
      this.pages.push(this.page);
      this.y = this.height - this.margin;
    }
  }

  drawText(
    text: unknown,
    opts: {
      size?: number;
      color?: RGB;
      bold?: boolean;
      maxWidth?: number;
      indent?: number;
      gap?: number;
    } = {}
  ) {
    const {
      size = 10,
      color = COLORS.primary,
      bold = false,
      maxWidth = this.contentW,
      indent = 0,
      gap = this.lineGap,
    } = opts;
    for (const line of this.wrap(text, size, maxWidth - indent, bold)) {
      if (!line) {
        this.y -= gap;
        continue;
      }
      this.ensureSpace(size + gap + 2);
      this.drawLine(line, this.margin + indent, this.y, size, color, bold);
      this.y -= size + gap;
    }
  }

  drawSectionTitle(title: string) {
    this.ensureSpace(36);
    this.y -= 12;
    this.page.drawLine({
      start: { x: this.margin, y: this.y + 14 },
      end: { x: this.width - this.margin, y: this.y + 14 },
      thickness: 0.75,
      color: COLORS.border,
    });
    this.y -= 8;
    this.drawText(title, { size: 13, bold: true, gap: 8 });
    this.y -= 6;
  }

  /** Bordered prose block for executive summary / overall assessment */
  drawProseBlock(
    title: unknown,
    body?: unknown,
    opts: { bg?: RGB; titleColor?: RGB; size?: number; padding?: number } = {}
  ) {
    const safeTitle = toText(title);
    const safeBody = toText(body);
    if (!safeTitle && !safeBody.trim()) return;

    const {
      bg = COLORS.cardBg,
      titleColor = COLORS.primary,
      size = 10,
      padding = 14,
    } = opts;
    const innerW = this.contentW - padding * 2;
    const titleLines = safeTitle ? this.wrap(safeTitle, 11, innerW, true) : [];
    const bodyParagraphs = safeBody.split(/\n+/).filter(Boolean);
    const bodyLines = bodyParagraphs.flatMap((p, i) => {
      const wrapped = this.wrap(p, size, innerW);
      return i > 0 ? ["", ...wrapped] : wrapped;
    });
    const titleH = titleLines.length ? titleLines.length * (11 + this.lineGap) + 6 : 0;
    const bodyH = bodyLines.reduce(
      (h, line) => h + (line ? size + this.lineGap : this.lineGap),
      0
    );
    const boxH = titleH + bodyH + padding * 2 + 4;

    this.ensureSpace(boxH + 12);
    const boxBottom = this.y - boxH;
    this.page.drawRectangle({
      x: this.margin,
      y: boxBottom,
      width: this.contentW,
      height: boxH,
      color: bg,
      borderColor: COLORS.border,
      borderWidth: 0.75,
    });

    let textY = this.y - padding - (titleLines.length ? 11 : 0);
    for (const line of titleLines) {
      this.drawLine(line, this.margin + padding, textY, 11, titleColor, true);
      textY -= 11 + this.lineGap;
    }
    if (titleLines.length) textY -= 2;
    for (const line of bodyLines) {
      if (!line) {
        textY -= this.lineGap;
        continue;
      }
      this.drawLine(line, this.margin + padding, textY, size, COLORS.primary);
      textY -= size + this.lineGap;
    }
    this.y = boxBottom - 14;
  }

  /**
   * Redline pair for a suggestion: the removed sentence in red with a
   * strikethrough, then the added sentence in green.
   */
  drawRedlinePair(
    removedLabel: string,
    original: string,
    addedLabel: string,
    revised: string
  ) {
    const RED = rgb(0.72, 0.11, 0.11);
    const GREEN = rgb(0.11, 0.5, 0.27);
    const size = 9.5;
    const orig = toText(original).trim();
    const rev = toText(revised).trim();

    if (orig) {
      this.drawText(removedLabel, { size: 8, color: RED, bold: true, gap: 2 });
      for (const line of this.wrap(orig, size, this.contentW)) {
        if (!line) {
          this.y -= this.lineGap;
          continue;
        }
        this.ensureSpace(size + this.lineGap + 2);
        this.drawLine(line, this.margin, this.y, size, RED);
        const w = this.measure(line, size);
        this.page.drawLine({
          start: { x: this.margin, y: this.y + size * 0.32 },
          end: { x: this.margin + w, y: this.y + size * 0.32 },
          thickness: 0.7,
          color: RED,
        });
        this.y -= size + this.lineGap;
      }
      this.y -= 2;
    }

    if (rev) {
      this.drawText(addedLabel, { size: 8, color: GREEN, bold: true, gap: 2 });
      for (const line of this.wrap(rev, size, this.contentW)) {
        if (!line) {
          this.y -= this.lineGap;
          continue;
        }
        this.ensureSpace(size + this.lineGap + 2);
        this.drawLine(line, this.margin, this.y, size, GREEN);
        this.y -= size + this.lineGap;
      }
    }
    this.y -= 6;
  }

  /** Overview panel: signing recommendation + executive summary in one bordered section */
  drawOverviewPanel(
    signingTitle: unknown,
    signingBody: unknown,
    signingBg: RGB,
    executiveTitle: unknown,
    executiveBody: unknown
  ) {
    const padding = 16;
    const innerW = this.contentW - padding * 2;
    const dividerGap = 12;

    const signingTitleLines = this.wrap(signingTitle, 11, innerW, true);
    const signingBodyLines = this.wrap(signingBody, 10, innerW);
    const execTitleLines = this.wrap(executiveTitle, 11, innerW, true);
    const execBodyLines = this.wrap(executiveBody, 10, innerW);

    const signingH =
      signingTitleLines.length * (11 + this.lineGap) +
      signingBodyLines.length * (10 + this.lineGap) +
      8;
    const execH =
      execTitleLines.length * (11 + this.lineGap) +
      execBodyLines.length * (10 + this.lineGap) +
      8;
    const boxH = padding * 2 + signingH + dividerGap + execH;

    this.ensureSpace(boxH + 12);
    const boxBottom = this.y - boxH;
    this.page.drawRectangle({
      x: this.margin,
      y: boxBottom,
      width: this.contentW,
      height: boxH,
      color: COLORS.white,
      borderColor: COLORS.border,
      borderWidth: 0.75,
    });

    // Signing sub-panel
    const signPanelH = signingH + 12;
    this.page.drawRectangle({
      x: this.margin + 8,
      y: this.y - padding - signPanelH + 4,
      width: this.contentW - 16,
      height: signPanelH,
      color: signingBg,
      borderColor: COLORS.border,
      borderWidth: 0.5,
    });

    let textY = this.y - padding - 11;
    for (const line of signingTitleLines) {
      this.drawLine(line, this.margin + padding, textY, 11, COLORS.primary, true);
      textY -= 11 + this.lineGap;
    }
    textY -= 2;
    for (const line of signingBodyLines) {
      if (!line) continue;
      this.drawLine(line, this.margin + padding, textY, 10, COLORS.muted);
      textY -= 10 + this.lineGap;
    }

    textY -= dividerGap;
    this.page.drawLine({
      start: { x: this.margin + padding, y: textY + 6 },
      end: { x: this.width - this.margin - padding, y: textY + 6 },
      thickness: 0.5,
      color: COLORS.border,
    });
    textY -= 8;

    for (const line of execTitleLines) {
      this.drawLine(line, this.margin + padding, textY, 11, COLORS.accentDark, true);
      textY -= 11 + this.lineGap;
    }
    textY -= 2;
    for (const line of execBodyLines) {
      if (!line) continue;
      this.drawLine(line, this.margin + padding, textY, 10, COLORS.primary);
      textY -= 10 + this.lineGap;
    }

    this.y = boxBottom - 14;
  }

  drawHighlightBox(title: unknown, body: unknown, bg: RGB) {
    const innerW = this.contentW - 28;
    const titleLines = this.wrap(title, 11, innerW, true);
    const bodyLines = this.wrap(body, 10, innerW);
    const boxH =
      titleLines.length * (11 + this.lineGap) +
      bodyLines.length * (10 + this.lineGap) +
      28;

    this.ensureSpace(boxH + 10);
    const boxBottom = this.y - boxH;
    this.page.drawRectangle({
      x: this.margin,
      y: boxBottom,
      width: this.contentW,
      height: boxH,
      color: bg,
      borderColor: COLORS.border,
      borderWidth: 0.75,
    });

    let textY = this.y - 14;
    for (const line of titleLines) {
      this.drawLine(line, this.margin + 14, textY, 11, COLORS.primary, true);
      textY -= 11 + this.lineGap;
    }
    textY -= 2;
    for (const line of bodyLines) {
      this.drawLine(line, this.margin + 14, textY, 10, COLORS.muted);
      textY -= 10 + this.lineGap;
    }
    this.y = boxBottom - 14;
  }

  drawScoreCard(scoreNum: number, scoreLabel: string, scoreColor: RGB, formula: string) {
    const innerW = this.contentW - 40;
    const formulaLines = this.wrap(formula, 8, innerW);
    const cardH = 72 + formulaLines.length * (8 + this.lineGap);
    this.ensureSpace(cardH + 10);
    const boxBottom = this.y - cardH;
    this.page.drawRectangle({
      x: this.margin,
      y: boxBottom,
      width: this.contentW,
      height: cardH,
      color: COLORS.lightBg,
      borderColor: COLORS.border,
      borderWidth: 0.75,
    });

    const scoreBaseline = this.y - 36;
    this.drawLine(String(scoreNum), this.margin + 20, scoreBaseline, 42, scoreColor, true);
    this.drawLine(scoreLabel, this.margin + 20, scoreBaseline - 32, 14, scoreColor, true);

    let formulaY = scoreBaseline - 52;
    for (const line of formulaLines) {
      this.drawLine(line, this.margin + 20, formulaY, 8, COLORS.muted);
      formulaY -= 8 + this.lineGap;
    }
    this.y = boxBottom - 16;
  }

  drawDimensionBar(label: string, value: number, color: RGB) {
    const rowH = 26;
    this.ensureSpace(rowH + 6);
    const rowTop = this.y;
    const labelColW = this.locale === "zh" ? 88 : 100;
    const scoreColW = 28;
    const barX = this.margin + labelColW + 6;
    const barW = this.contentW - labelColW - scoreColW - 12;
    const barCenterY = rowTop - 14;

    this.drawLine(label, this.margin, rowTop - 4, 9, COLORS.primary);
    this.page.drawRectangle({
      x: barX,
      y: barCenterY - 5,
      width: barW,
      height: 10,
      color: COLORS.white,
      borderColor: COLORS.border,
      borderWidth: 0.4,
    });
    if (value > 0) {
      this.page.drawRectangle({
        x: barX,
        y: barCenterY - 5,
        width: Math.max(2, (value / 100) * barW),
        height: 10,
        color,
      });
    }
    const scoreX = this.margin + this.contentW - scoreColW;
    this.drawLine(String(value), scoreX, rowTop - 4, 9, color, true);
    this.y = rowTop - rowH;
  }

  drawFlagCard(
    flag: ScanResult["flags"][0],
    labels: (typeof LABELS)["zh"],
    lvl: string
  ) {
    const innerW = this.contentW - 28;
    const lines: { text: string; size: number; color: RGB; bold?: boolean; indent?: number }[] = [];
    if (flag.category) {
      lines.push({ text: `${labels.category}: ${flag.category}`, size: 8, color: COLORS.muted });
    }
    lines.push({ text: flag.text, size: 10, color: COLORS.primary, bold: true });
    if (flag.quote) {
      lines.push({
        text: `${labels.quote}: "${flag.quote}"`,
        size: 8,
        color: COLORS.muted,
        indent: 4,
      });
    }
    if (flag.legalBasis) {
      lines.push({
        text: `${labels.legalBasis}: ${flag.legalBasis}`,
        size: 8,
        color: COLORS.muted,
        indent: 4,
      });
    }
    if (flag.impact) {
      lines.push({
        text: `${labels.impact}: ${flag.impact}`,
        size: 8,
        color: COLORS.muted,
        indent: 4,
      });
    }
    if (flag.suggestion) {
      lines.push({
        text: flag.suggestion,
        size: 9,
        color: COLORS.accentDark,
        indent: 4,
      });
    }

    const wrappedBlocks = lines.flatMap((l) =>
      this.wrap(l.text, l.size, innerW - (l.indent ?? 0)).map((t) => ({ ...l, text: t }))
    );
    const badge = labels.riskLevel[lvl as keyof typeof labels.riskLevel] || lvl;
    const badgeW = Math.min(this.measure(badge, 8, true) + 16, 80);
    const headerH = 24;
    const cardH = wrappedBlocks.reduce((h, l) => h + l.size + this.lineGap, 0) + headerH + 16;

    this.ensureSpace(cardH + 8);
    const boxBottom = this.y - cardH;
    this.page.drawRectangle({
      x: this.margin,
      y: boxBottom,
      width: this.contentW,
      height: cardH,
      color: COLORS.white,
      borderColor: COLORS.border,
      borderWidth: 0.75,
    });

    const badgeY = this.y - 16;
    this.page.drawRectangle({
      x: this.width - this.margin - badgeW - 10,
      y: badgeY - 6,
      width: badgeW,
      height: 16,
      color: riskColor(lvl),
    });
    const badgeTextX =
      this.width - this.margin - badgeW - 10 + (badgeW - this.measure(badge, 8, true)) / 2;
    this.drawLine(badge, badgeTextX, badgeY - 2, 8, COLORS.white, true);

    let textY = this.y - headerH;
    for (const l of wrappedBlocks) {
      if (!l.text) continue;
      this.drawLine(l.text, this.margin + 14 + (l.indent ?? 0), textY, l.size, l.color, l.bold);
      textY -= l.size + this.lineGap;
    }
    this.y = boxBottom - 10;
  }

  drawNegotiationItem(
    n: ScanResult["negotiations"] extends (infer T)[] | undefined ? T : never,
    labels: (typeof LABELS)["zh"]
  ) {
    const innerW = this.contentW - 40;
    const rows = [
      { text: n.clause, size: 10, bold: true, color: COLORS.primary },
      { text: `${labels.current}: ${n.current}`, size: 9, color: COLORS.muted },
      { text: `${labels.suggested}: ${n.suggested}`, size: 9, color: COLORS.accentDark },
      { text: n.reason, size: 8, color: COLORS.muted },
    ];
    const wrapped = rows.flatMap((r) =>
      this.wrap(r.text, r.size, innerW).map((t) => ({ ...r, text: t }))
    );
    const itemH = wrapped.reduce((h, r) => h + r.size + this.lineGap, 0) + 20;

    this.ensureSpace(itemH + 6);
    const boxBottom = this.y - itemH;
    this.page.drawRectangle({
      x: this.margin,
      y: boxBottom,
      width: this.contentW,
      height: itemH,
      color: COLORS.lightBg,
      borderColor: COLORS.border,
      borderWidth: 0.5,
    });

    this.page.drawCircle({
      x: this.margin + 16,
      y: this.y - 14,
      size: 9,
      color: COLORS.accent,
    });
    this.drawLine(String(n.priority), this.margin + (n.priority >= 10 ? 10 : 13), this.y - 18, 9, COLORS.white, true);

    let textY = this.y - 14;
    for (const r of wrapped) {
      this.drawLine(r.text, this.margin + 32, textY, r.size, r.color, r.bold);
      textY -= r.size + this.lineGap;
    }
    this.y = boxBottom - 8;
  }

  drawHeaderBar(color: RGB) {
    this.page.drawRectangle({ x: 0, y: this.height - 5, width: this.width, height: 5, color });
  }

  spacer(n: number) {
    this.y -= n;
  }

  /** Center-aligned text (used for contract titles). */
  drawCentered(
    text: unknown,
    opts: { size?: number; color?: RGB; bold?: boolean; gap?: number } = {}
  ) {
    const { size = 14, color = COLORS.primary, bold = true, gap = this.lineGap } = opts;
    for (const line of this.wrap(text, size, this.contentW, bold)) {
      if (!line) {
        this.y -= gap;
        continue;
      }
      this.ensureSpace(size + gap + 2);
      const lineW = this.measure(line, size, bold);
      const x = this.margin + Math.max(0, (this.contentW - lineW) / 2);
      this.drawLine(line, x, this.y, size, color, bold);
      this.y -= size + gap;
    }
  }

  /** Inline redline: deleted = red strikethrough, inserted = green */
  drawRedlineParagraphs(
    paragraphs: { text: string; kind: "normal" | "deleted" | "inserted" }[][],
    size = 10
  ) {
    const deletedColor = rgb(0.72, 0.14, 0.14);
    const insertedColor = rgb(0.1, 0.42, 0.22);

    for (const para of paragraphs) {
      if (!para.length) continue;
      this.ensureSpace(size + this.lineGap + 4);
      let x = this.margin;
      const lineY = this.y;

      for (const span of para) {
        const color =
          span.kind === "deleted"
            ? deletedColor
            : span.kind === "inserted"
              ? insertedColor
              : COLORS.primary;

        for (const ch of span.text) {
          const cw = this.charWidth(ch, size);
          if (x + cw > this.margin + this.contentW && x > this.margin) {
            this.y -= size + this.lineGap;
            this.ensureSpace(size + this.lineGap + 4);
            x = this.margin;
          }
          const yPos = this.y;
          this.drawLine(ch, x, yPos, size, color);
          if (span.kind === "deleted") {
            this.page.drawLine({
              start: { x, y: yPos - size * 0.35 },
              end: { x: x + cw, y: yPos - size * 0.35 },
              thickness: 0.6,
              color: deletedColor,
            });
          }
          x += cw;
        }
      }
      this.y -= size + this.lineGap * 2;
    }
  }

  /** Original text with red highlight behind flagged passages — no strikethrough or replacements. */
  drawHighlightParagraphs(
    paragraphs: { text: string; kind: "normal" | "deleted" | "inserted" }[][],
    size = 10
  ) {
    const highlightBg = rgb(1, 0.82, 0.82);

    for (const para of paragraphs) {
      if (!para.length) continue;
      this.ensureSpace(size + this.lineGap + 4);
      let x = this.margin;

      for (const span of para) {
        if (span.kind === "inserted") continue;

        for (const ch of span.text) {
          const cw = this.charWidth(ch, size);
          if (x + cw > this.margin + this.contentW && x > this.margin) {
            this.y -= size + this.lineGap;
            this.ensureSpace(size + this.lineGap + 4);
            x = this.margin;
          }
          const yPos = this.y;
          if (span.kind === "deleted") {
            this.page.drawRectangle({
              x: x - 1,
              y: yPos - 2,
              width: cw + 2,
              height: size + 3,
              color: highlightBg,
              opacity: 0.9,
            });
          }
          this.drawLine(ch, x, yPos, size, COLORS.primary);
          x += cw;
        }
      }
      this.y -= size + this.lineGap * 2;
    }
  }

  drawFooters(labelFn: (n: number, total: number) => string) {
    const total = this.pages.length;
    const dateStr = new Date().toISOString().slice(0, 10);
    const savedPage = this.page;
    this.pages.forEach((p, i) => {
      this.page = p;
      this.drawLine(labelFn(i + 1, total), this.margin, 28, 8, COLORS.muted);
      this.drawLine(dateStr, this.width - this.margin - 60, 28, 8, COLORS.muted);
    });
    this.page = savedPage;
  }
}

function normalizeForPdf(result: ScanResult): ScanResult {
  return {
    ...result,
    contractType: toText(result.contractType) || undefined,
    executiveSummary: toText(result.executiveSummary) || undefined,
    signingRationale: toText(result.signingRationale) || undefined,
    summary: toText(result.summary),
    worstCase: toText(result.worstCase) || undefined,
    refineNotes: toText(result.refineNotes) || undefined,
    strengths: (result.strengths ?? []).map(toText).filter(Boolean),
    actionItems: (result.actionItems ?? []).map(toText).filter(Boolean),
    flags: (result.flags ?? []).map((f) => ({
      ...f,
      text: toText(f.text),
      suggestion: toText(f.suggestion),
      category: f.category ? toText(f.category) : undefined,
      quote: f.quote ? toText(f.quote) : undefined,
      legalBasis: f.legalBasis ? toText(f.legalBasis) : undefined,
      impact: f.impact ? toText(f.impact) : undefined,
    })),
  };
}

export async function generateReportPdf(
  result: ScanResult,
  locale: ReportLocale = "zh"
): Promise<Uint8Array> {
  const L = LABELS[locale];
  const normalized = normalizeForPdf(result);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cjkBytes = await loadCjkFontBytes();
  const cjk = await pdf.embedFont(cjkBytes);

  const [width, height] = PageSizes.A4;
  const margin = 52;
  const contentW = width - margin * 2;

  const w = new PdfWriter(pdf, latin, latinBold, cjk, width, height, margin, contentW, locale);

  w.drawHeaderBar(COLORS.accent);

  w.drawText("ClauseCheck", { size: 22, color: COLORS.accent, bold: true, gap: 2 });
  w.drawText(L.subtitle, { size: 14, bold: true, gap: 6 });
  w.drawText(`${L.generated}: ${formatDate(locale)}`, { size: 9, color: COLORS.muted, gap: 10 });

  if (normalized.contractType) {
    w.drawText(`${L.contractType}: ${normalized.contractType}`, { size: 10, color: COLORS.accentDark, gap: 10 });
  }

  // ── Overview section (signing + executive summary) ──
  w.drawSectionTitle(L.overview);

  if (normalized.signingRecommendation && normalized.executiveSummary) {
    const rec = normalized.signingRecommendation;
    const bg =
      rec === "do_not_sign" ? COLORS.redBg : rec === "sign" ? COLORS.greenBg : COLORS.amberBg;
    w.drawOverviewPanel(
      `${L.signing}: ${L.signingRec[rec]}`,
      normalized.signingRationale || "",
      bg,
      L.executive,
      normalized.executiveSummary
    );
  } else if (normalized.signingRecommendation) {
    const rec = normalized.signingRecommendation;
    const bg =
      rec === "do_not_sign" ? COLORS.redBg : rec === "sign" ? COLORS.greenBg : COLORS.amberBg;
    w.drawHighlightBox(
      `${L.signing}: ${L.signingRec[rec]}`,
      normalized.signingRationale || "",
      bg
    );
  } else if (normalized.executiveSummary) {
    w.drawProseBlock(L.executive, normalized.executiveSummary);
  }

  // ── Score ──
  w.drawSectionTitle(L.riskScore);
  const sk = scoreKey(normalized.scoreText, normalized.scoreNum);
  const sc = riskColor(sk);
  w.drawScoreCard(normalized.scoreNum, L.riskLevel[sk], sc, L.formula);

  if (normalized.dimensions) {
    w.drawSectionTitle(L.dimensions);
    w.drawDimensionBar(L.fairness, normalized.dimensions.fairness, COLORS.medium);
    w.drawDimensionBar(L.compliance, normalized.dimensions.compliance, rgb(0.2, 0.4, 0.75));
    w.drawDimensionBar(L.financial, normalized.dimensions.financial, COLORS.accent);
    w.drawText(L.dimHint, { size: 8, color: COLORS.muted, gap: 10 });
  }

  w.drawSectionTitle(L.flags((normalized.flags ?? []).length));
  for (const flag of normalized.flags ?? []) {
    w.drawFlagCard(flag, L, flag.level || "medium");
  }

  if (normalized.timeTerms?.length) {
    w.drawSectionTitle(L.timeTerms);
    for (const term of normalized.timeTerms) {
      const label = L.timeType[term.type as keyof typeof L.timeType] || term.type;
      w.drawText(label, { size: 10, bold: true, color: riskColor(term.risk), gap: 4 });
      const desc = toText(term.description) + (term.date && term.date !== "N/A" ? ` (${term.date})` : "");
      w.drawText(desc, { size: 9, gap: 10 });
    }
  }

  if (normalized.negotiations?.length) {
    w.drawSectionTitle(L.negotiations);
    for (const n of normalized.negotiations) {
      w.drawNegotiationItem(n, L);
    }
  }

  if (normalized.worstCase) {
    w.drawProseBlock(L.worstCase, normalized.worstCase, {
      bg: COLORS.redBg,
      titleColor: COLORS.accent,
    });
  }

  if (normalized.strengths?.length) {
    w.drawSectionTitle(L.strengths);
    for (const s of normalized.strengths) {
      w.drawText(`- ${s}`, { size: 9, gap: 6 });
    }
  }

  if (normalized.missingClauses?.length) {
    w.drawSectionTitle(L.missing);
    for (const c of normalized.missingClauses) {
      w.drawProseBlock(c.name, `${toText(c.importance)}\n\n${toText(c.suggestion)}`, {
        bg: COLORS.amberBg,
        size: 9,
      });
    }
  }

  if (normalized.actionItems?.length) {
    w.drawSectionTitle(L.actionItems);
    normalized.actionItems.forEach((item, i) => {
      w.drawText(`${i + 1}. ${item}`, { size: 9, gap: 6, indent: 4 });
    });
  }

  if (normalized.summary) {
    w.drawSectionTitle(L.summary);
    w.drawProseBlock("", normalized.summary, {
      bg: COLORS.cardBg,
      size: 10,
      padding: 16,
    });
  }

  if (normalized.refineNotes) {
    w.drawProseBlock(L.refineNotes, normalized.refineNotes, { size: 9 });
  }

  w.drawSectionTitle(L.disclaimer);
  w.drawText(L.disclaimerText, { size: 8, color: COLORS.muted, gap: 5 });

  w.drawFooters(L.footer);

  return pdf.save();
}

const CONTRACT_LABELS = {
  zh: {
    footer: (n: number, total: number) => `ClauseCheck · 第 ${n} / ${total} 页`,
    disclaimer:
      "AI 修订仅供参考，不构成法律意见。删除线为原文，绿色为建议修订文本。",
  },
  en: {
    footer: (n: number, total: number) => `ClauseCheck · Page ${n} of ${total}`,
    disclaimer:
      "AI redline for reference only — not legal advice. Strikethrough = original; green = suggested text.",
  },
};

/** Redlined contract PDF — preserves original layout with inline track-changes */
export async function generateRedlinedContractPdf(
  originalText: string,
  changes: ContractChange[],
  locale: ReportLocale = "zh"
): Promise<Uint8Array> {
  const L = CONTRACT_LABELS[locale];
  const { paragraphs } = buildRedlinedDocument(originalText, changes);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cjkBytes = await loadCjkFontBytes();
  const cjk = await pdf.embedFont(cjkBytes);

  const [width, height] = PageSizes.A4;
  const margin = 52;
  const contentW = width - margin * 2;

  const w = new PdfWriter(pdf, latin, latinBold, cjk, width, height, margin, contentW, locale);

  w.drawRedlineParagraphs(paragraphs as RedlineSpan[][], 10);

  w.drawText(L.disclaimer, { size: 7, color: COLORS.muted, gap: 8 });
  w.drawFooters(L.footer);

  return pdf.save();
}

/** @deprecated Use generateRedlinedContractPdf with original text + changes */
export async function generateRevisedContractPdf(
  contractText: string,
  locale: ReportLocale = "zh"
): Promise<Uint8Array> {
  return generateRedlinedContractPdf(contractText, [], locale);
}

const SUGGESTION_LABELS = {
  zh: {
    title: "合同修订建议清单",
    generated: "生成时间",
    item: (n: number) => `建议 ${n}`,
    removed: "删除原文",
    added: "建议新增",
    reason: "理由",
    empty: "暂无可应用的建议。",
    disclaimer: "AI 生成，仅供参考，不构成法律意见。请在签署前自行审阅。",
    notice: "说明",
    footer: (n: number, total: number) => `ClauseCheck · 第 ${n} / ${total} 页`,
  },
  en: {
    title: "Contract Revision Suggestions",
    generated: "Generated",
    item: (n: number) => `Suggestion ${n}`,
    removed: "Removed",
    added: "Added",
    reason: "Rationale",
    empty: "No applicable suggestions.",
    disclaimer: "AI-generated for reference only — not legal advice. Review before signing.",
    notice: "Notice",
    footer: (n: number, total: number) => `ClauseCheck · Page ${n} of ${total}`,
  },
};

/**
 * Suggestions report PDF — each accepted edit shown as a redline:
 * the removed sentence in red strikethrough, the added sentence in green.
 */
export async function generateSuggestionsPdf(
  changes: ContractChange[],
  locale: ReportLocale = "zh"
): Promise<Uint8Array> {
  const L = SUGGESTION_LABELS[locale];
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cjkBytes = await loadCjkFontBytes();
  const cjk = await pdf.embedFont(cjkBytes);

  const [width, height] = PageSizes.A4;
  const margin = 52;
  const contentW = width - margin * 2;

  const w = new PdfWriter(pdf, latin, latinBold, cjk, width, height, margin, contentW, locale);

  w.drawHeaderBar(COLORS.accent);
  w.drawText("ClauseCheck", { size: 20, color: COLORS.accent, bold: true, gap: 2 });
  w.drawText(L.title, { size: 14, bold: true, gap: 6 });
  w.drawText(`${L.generated}: ${formatDate(locale)}`, { size: 9, color: COLORS.muted, gap: 12 });

  if (!changes.length) {
    w.drawText(L.empty, { size: 10, color: COLORS.muted, gap: 6 });
  }

  changes.forEach((c, i) => {
    w.drawSectionTitle(`${L.item(i + 1)}${c.section ? ` · ${c.section}` : ""}`);
    w.drawRedlinePair(L.removed, c.original, L.added, c.revised);
    if (c.reason) {
      w.drawText(`${L.reason}: ${c.reason}`, { size: 8, color: COLORS.muted, gap: 8 });
    }
  });

  w.drawSectionTitle(L.notice);
  w.drawText(L.disclaimer, { size: 8, color: COLORS.muted, gap: 5 });
  w.drawFooters(L.footer);

  return pdf.save();
}

export type SuggestionReportItem = ContractChange & { accepted?: boolean };

const REPORT_LABELS = {
  zh: {
    title: "带建议的修订报告",
    contractSection: "合同原文（红色标注为建议修改处）",
    suggestionsSection: "修订建议明细",
    generated: "生成时间",
    item: (n: number) => `建议 ${n}`,
    original: "原文",
    suggested: "建议修改为",
    reason: "理由",
    status: "您的选择",
    accepted: "接受",
    rejected: "不接受",
    disclaimer: "AI 生成，仅供参考，不构成法律意见。请在签署前自行审阅。",
    footer: (n: number, total: number) => `ClauseCheck · 第 ${n} / ${total} 页`,
  },
  en: {
    title: "Report with Suggestions",
    contractSection: "Original contract (red = suggested change areas)",
    suggestionsSection: "Suggestion details",
    generated: "Generated",
    item: (n: number) => `Suggestion ${n}`,
    original: "Original",
    suggested: "Suggested change",
    reason: "Rationale",
    status: "Your choice",
    accepted: "Accepted",
    rejected: "Declined",
    disclaimer: "AI-generated for reference only — not legal advice. Review before signing.",
    footer: (n: number, total: number) => `ClauseCheck · Page ${n} of ${total}`,
  },
};

/** Full report: original contract with red highlights + suggestion appendix with accept/decline status. */
export async function generateSuggestionReportPdf(
  originalText: string,
  items: SuggestionReportItem[],
  locale: ReportLocale = "zh"
): Promise<Uint8Array> {
  const L = REPORT_LABELS[locale];
  const { paragraphs } = buildRedlinedDocument(originalText, items, { preserveLayout: true });

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cjkBytes = await loadCjkFontBytes();
  const cjk = await pdf.embedFont(cjkBytes);

  const [width, height] = PageSizes.A4;
  const margin = 52;
  const contentW = width - margin * 2;

  const w = new PdfWriter(pdf, latin, latinBold, cjk, width, height, margin, contentW, locale);

  w.drawText("ClauseCheck", { size: 20, color: COLORS.accent, bold: true, gap: 2 });
  w.drawText(L.title, { size: 14, bold: true, gap: 6 });
  w.drawText(`${L.generated}: ${formatDate(locale)}`, { size: 9, color: COLORS.muted, gap: 14 });

  w.drawSectionTitle(L.contractSection);
  w.drawHighlightParagraphs(paragraphs as RedlineSpan[][], 10);
  w.spacer(12);

  w.drawSectionTitle(L.suggestionsSection);
  items.forEach((c, i) => {
    const status = c.accepted ? L.accepted : L.rejected;
    w.drawSectionTitle(`${L.item(i + 1)} · ${status}${c.section ? ` · ${c.section}` : ""}`);
    w.drawRedlinePair(L.original, c.original, L.suggested, c.revised);
    if (c.reason) {
      w.drawText(`${L.reason}: ${c.reason}`, { size: 8, color: COLORS.muted, gap: 8 });
    }
  });

  w.drawText(L.disclaimer, { size: 8, color: COLORS.muted, gap: 5 });
  w.drawFooters(L.footer);

  return pdf.save();
}

/**
 * @deprecated Final-contract generation removed. Kept as a thin shim only so
 * older imports don't break; not used by the product.
 */
export async function generateCleanContractPdf(
  finalText: string,
  locale: ReportLocale = "zh",
  templateId: ContractTemplateId = "formal-zh"
): Promise<Uint8Array> {
  const tpl = getContractTemplate(templateId);
  const lines = toContractLines(finalText);

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cjkBytes = await loadCjkFontBytes();
  const cjk = await pdf.embedFont(cjkBytes);

  const [width, height] = PageSizes.A4;
  const mmToPt = (mm: number) => mm * 2.834645669;
  const marginLeft = mmToPt(tpl.marginsMm.left);
  const marginTop = mmToPt(tpl.marginsMm.top);
  const contentW = width - mmToPt(tpl.marginsMm.left + tpl.marginsMm.right);

  const bodyIndentPt = tpl.bodyFirstLineIndentMm * 2.834645669;
  const w = new PdfWriter(pdf, latin, latinBold, cjk, width, height, marginLeft, contentW, locale);
  w.spacer(Math.max(8, marginTop - marginLeft + 8));
  for (const line of lines) {
    if (line.kind === "title") {
      w.drawCentered(line.text, { size: tpl.pdfTitleSize, bold: true, gap: 10 });
      w.spacer(8);
    } else if (line.kind === "heading") {
      w.spacer(6);
      w.drawText(line.text, { size: tpl.pdfHeadingSize, bold: true, gap: 6 });
    } else {
      w.drawText(line.text, {
        size: tpl.pdfBodySize,
        gap: tpl.pdfLineGap,
        indent: bodyIndentPt > 0 ? bodyIndentPt : undefined,
        maxWidth: bodyIndentPt > 0 ? contentW - bodyIndentPt : contentW,
      });
    }
  }

  w.drawFooters(
    locale === "zh"
      ? (n, total) => `ClauseCheck · 第 ${n} / ${total} 页`
      : (n, total) => `ClauseCheck · Page ${n} of ${total}`
  );

  return pdf.save();
}
