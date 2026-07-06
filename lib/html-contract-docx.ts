import {
  AlignmentType,
  Document,
  Packer,
  Paragraph,
  TextRun,
  convertMillimetersToTwip,
} from "docx";
import { HTMLElement, parse } from "node-html-parser";
import {
  type ContractTemplateId,
  getContractTemplate,
} from "@/lib/contract-templates";
import type { ReportLocale } from "@/lib/pdf-export";
import { generateFinalContractDocx } from "@/lib/contract-export";
import { htmlToPlainText, isRichTextHtml } from "@/lib/rich-text";

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

function parseAlignment(style: string | undefined): Align {
  const source = (style ?? "").toLowerCase();
  if (source.includes("center")) return AlignmentType.CENTER;
  if (source.includes("right")) return AlignmentType.RIGHT;
  if (source.includes("justify")) return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function parseSizePt(style: string | undefined, fallback: number): number {
  const match = style?.match(/font-size:\s*([\d.]+)pt/i);
  if (!match) return fallback;
  return Math.round(parseFloat(match[1]!) * 2);
}

function parseFontFamily(style: string | undefined, fallback: string): string {
  const match = style?.match(/font-family:\s*([^;]+)/i);
  if (!match) return fallback;
  return match[1]!.replace(/['"]/g, "").split(",")[0]!.trim() || fallback;
}

interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: { type: "single" };
  strike?: boolean;
  font?: string;
  size?: number;
  color?: string;
  highlight?: string;
  subScript?: boolean;
  superScript?: boolean;
}

function textRunFromStyle(
  text: string,
  style: RunStyle,
  font: string,
  defaultSize: number
): TextRun {
  return new TextRun({
    text,
    font: style.font ?? font,
    size: style.size ?? defaultSize,
    bold: style.bold,
    italics: style.italics,
    underline: style.underline,
    strike: style.strike,
    color: style.color,
    shading: style.highlight ? { fill: style.highlight.replace("#", "") } : undefined,
    subScript: style.subScript,
    superScript: style.superScript,
  });
}

function collectTextRuns(
  el: HTMLElement,
  style: RunStyle,
  font: string,
  defaultSize: number
): TextRun[] {
  const runs: TextRun[] = [];

  for (const child of el.childNodes) {
    if (!(child instanceof HTMLElement)) {
      const text = child.text.replace(/\u00a0/g, " ");
      if (text) {
        runs.push(textRunFromStyle(text, style, font, defaultSize));
      }
      continue;
    }

    const tag = child.tagName.toLowerCase();
    const inlineStyle = child.getAttribute("style") ?? "";

    const next: RunStyle = {
      ...style,
      font: parseFontFamily(inlineStyle, style.font ?? font),
      size: parseSizePt(inlineStyle, style.size ?? defaultSize),
    };

    const colorMatch = inlineStyle.match(/(?:^|;)color:\s*([^;]+)/i);
    if (colorMatch) next.color = colorMatch[1]!.trim().replace(/['"]/g, "");

    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italics = true;
    if (tag === "u") next.underline = { type: "single" };
    if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
    if (tag === "sub") next.subScript = true;
    if (tag === "sup") next.superScript = true;
    if (tag === "mark") {
      const bg = inlineStyle.match(/background-color:\s*([^;]+)/i)?.[1]?.trim();
      if (bg) next.highlight = bg;
    }
    if (tag === "br") {
      runs.push(
        new TextRun({
          text: "",
          break: 1,
          font: next.font ?? font,
          size: next.size ?? defaultSize,
        })
      );
      continue;
    }

    if (tag === "span") {
      runs.push(...collectTextRuns(child, next, font, defaultSize));
      continue;
    }

    runs.push(...collectTextRuns(child, next, font, defaultSize));
  }

  return runs;
}

function paragraphFromElement(
  el: HTMLElement,
  font: string,
  defaultSize: number,
  bodyIndent?: { firstLine: number }
): Paragraph {
  const style = el.getAttribute("style") ?? "";
  const align = parseAlignment(style);
  const runs = collectTextRuns(el, {}, font, defaultSize);

  return new Paragraph({
    alignment: align,
    spacing: { after: 160 },
    indent: bodyIndent,
    children: runs.length ? runs : [new TextRun({ text: "", font, size: defaultSize })],
  });
}

function listParagraphs(
  el: HTMLElement,
  ordered: boolean,
  font: string,
  defaultSize: number
): Paragraph[] {
  return el.querySelectorAll("li").map((li, index) => {
    const prefix = ordered ? `${index + 1}. ` : "• ";
    const runs = collectTextRuns(li, {}, font, defaultSize);
    return new Paragraph({
      spacing: { after: 80 },
      indent: { left: convertMillimetersToTwip(8) },
      children: [
        new TextRun({ text: prefix, font, size: defaultSize, bold: ordered }),
        ...runs,
      ],
    });
  });
}

/** Convert TipTap HTML into a formatted Word document. */
export async function generateContractDocxFromHtml(
  html: string,
  locale: ReportLocale = "zh",
  templateId: ContractTemplateId = "formal-zh"
): Promise<Uint8Array> {
  if (!isRichTextHtml(html)) {
    return generateFinalContractDocx(htmlToPlainText(html), locale, templateId);
  }

  const tpl = getContractTemplate(templateId);
  const font = tpl.font[locale];
  const defaultSize = tpl.bodySizeHalfPt;
  const bodyIndent =
    tpl.bodyFirstLineIndentMm > 0
      ? { firstLine: convertMillimetersToTwip(tpl.bodyFirstLineIndentMm) }
      : undefined;

  const root = parse(html);
  const children: Paragraph[] = [];

  for (const node of root.childNodes) {
    if (!(node instanceof HTMLElement)) continue;
    const tag = node.tagName.toLowerCase();

    if (tag === "ul") {
      children.push(...listParagraphs(node, false, font, defaultSize));
      continue;
    }
    if (tag === "ol") {
      children.push(...listParagraphs(node, true, font, defaultSize));
      continue;
    }
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const size =
        tag === "h1" ? tpl.titleSizeHalfPt : tag === "h2" ? tpl.headingSizeHalfPt : tpl.headingSizeHalfPt - 2;
      const runs = collectTextRuns(node, { bold: true, size }, font, size);
      children.push(
        new Paragraph({
          alignment: tag === "h1" ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: tag === "h1" ? 0 : 200, after: tag === "h1" ? 240 : 160 },
          children: runs.length ? runs : [new TextRun({ text: "", font, size, bold: true })],
        })
      );
      continue;
    }
    if (tag === "p") {
      children.push(paragraphFromElement(node, font, defaultSize, bodyIndent));
    }
  }

  if (!children.length) {
    return generateFinalContractDocx(htmlToPlainText(html), locale, templateId);
  }

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
