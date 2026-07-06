import { formatContractText } from "@/lib/contract-format";
import { htmlToPlainText, isRichTextHtml } from "@/lib/rich-text";
import { cleanContractPlain } from "@/lib/contract-professional-format";
import type { LayoutBlock, LayoutTemplateId } from "./types";
import { detectParagraphRole } from "./classify";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Parse plain or HTML content into ordered layout blocks. */
export function parseLayoutBlocks(
  content: string,
  locale: "zh" | "en"
): LayoutBlock[] {
  const rawPlain = isRichTextHtml(content) ? htmlToPlainText(content) : content;
  const cleaned = cleanContractPlain(formatContractText(rawPlain.replace(/\r\n/g, "\n")));
  const lines = cleaned.split("\n");

  const ctx = { locale, inSignatureBlock: false, inPreamble: true };
  const blocks: LayoutBlock[] = [];
  let blockIndex = 0;

  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;

    const role = detectParagraphRole(text, ctx, blockIndex);

    if (role === "signature") ctx.inSignatureBlock = true;
    if (role === "articleHeading" || role === "enArticle" || role === "enSection") {
      ctx.inPreamble = false;
    }

    blocks.push({
      index: blockIndex,
      text,
      role,
      isEmpty: false,
    });
    blockIndex += 1;
  }

  return blocks;
}

export function renderStyledParagraphHtml(
  text: string,
  spec: {
    align: string;
    fontFamily: string;
    fontSizePt: number;
    lineHeight: number;
    textIndent: string;
    marginTopEm: number;
    marginBottomEm: number;
    bold: boolean;
    headingLevel?: 1 | 2 | 3 | null;
  },
  meta: { role: string; styleId: string; ruleId: string | null }
): string {
  const css = [
    `text-align: ${spec.align}`,
    `font-family: ${spec.fontFamily}`,
    `font-size: ${spec.fontSizePt}pt`,
    `line-height: ${spec.lineHeight}`,
    `text-indent: ${spec.textIndent}`,
    `margin-top: ${spec.marginTopEm}em`,
    `margin-bottom: ${spec.marginBottomEm}em`,
  ].join("; ");

  const escaped = escapeHtml(text);
  const inner = spec.bold ? `<strong>${escaped}</strong>` : escaped;
  const attrs = [
    `style="${css}"`,
    `data-layout-role="${meta.role}"`,
    `data-layout-style="${meta.styleId}"`,
    meta.ruleId ? `data-layout-rule="${meta.ruleId}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (spec.headingLevel === 2) {
    return `<h2 ${attrs}>${inner}</h2>`;
  }
  if (spec.headingLevel === 3) {
    return `<h3 ${attrs}>${inner}</h3>`;
  }
  return `<p ${attrs}>${inner}</p>`;
}

export function resolveTemplateId(
  opts: { templateId?: LayoutTemplateId; locale?: "zh" | "en" }
): LayoutTemplateId {
  if (opts.templateId) return opts.templateId;
  return opts.locale === "en" ? "en-standard" : "zh-standard";
}
