import { formatContractText, isHeadingLine, toContractLines } from "@/lib/contract-format";
import { htmlToPlainText, isRichTextHtml } from "@/lib/rich-text";
import {
  layoutFormatPlainText,
  runLayoutEngine,
  documentFormatIdToTemplateId,
  type LayoutTemplateId,
} from "@/lib/layout-engine";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Remove consecutive duplicate lines and obvious inline repeats. */
export function cleanContractPlain(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n");

  const lines = s.split("\n");
  const deduped: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (deduped.length && deduped[deduped.length - 1] !== "") deduped.push("");
      continue;
    }
    if (deduped.length && deduped[deduped.length - 1]?.trim() === t) continue;
    deduped.push(dedupeInlineFragment(line.trim()));
  }

  return deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function dedupeInlineFragment(line: string): string {
  if (line.length < 16) return line;
  for (let len = Math.min(48, Math.floor(line.length / 2)); len >= 8; len--) {
    const head = line.slice(0, len);
    const repeatAt = line.indexOf(head, len);
    if (repeatAt > 0 && repeatAt < line.length * 0.75) {
      return line.slice(0, repeatAt).trim();
    }
  }
  return line;
}

export interface ProfessionalFormatOptions {
  locale?: "zh" | "en";
  fontFamily?: string;
  bodySizePt?: number;
  titleSizePt?: number;
  templateId?: LayoutTemplateId;
}

/**
 * One-click professional contract layout via the layout engine.
 * @deprecated inline path — prefer `runLayoutEngine` directly.
 */
export function professionalFormatHtml(
  content: string,
  opts: ProfessionalFormatOptions = {}
): string {
  const locale = opts.locale ?? "zh";
  const templateId =
    opts.templateId ??
    documentFormatIdToTemplateId(locale === "en" ? "en-standard" : "zh-standard");

  return runLayoutEngine(content, { templateId, locale }).html;
}

/** @deprecated Legacy line mapper — kept for exporters that still use ContractLine[]. */
export function professionalFormatHtmlLegacy(
  content: string,
  opts: ProfessionalFormatOptions = {}
): string {
  const locale = opts.locale ?? "zh";
  const fontFamily =
    opts.fontFamily ??
    (locale === "zh" ? "SimSun, STSong, serif" : "Calibri, Arial, sans-serif");
  const bodySize = opts.bodySizePt ?? 12;
  const titleSize = opts.titleSizePt ?? 16;

  const rawPlain = isRichTextHtml(content) ? htmlToPlainText(content) : content;
  const cleaned = cleanContractPlain(formatContractText(rawPlain));
  const lines = toContractLines(cleaned);

  if (!lines.length) return "<p></p>";

  const bodyIndent = locale === "zh" ? "text-indent: 2em;" : "text-indent: 0; margin-left: 0;";
  const bodyLineHeight = locale === "zh" ? "1.75" : "1.5";

  return lines
    .map((line) => {
      const text = escapeHtml(line.text);
      if (line.kind === "title") {
        return `<p style="text-align: center; font-family: ${fontFamily}; font-size: ${titleSize}pt; margin-bottom: 1em;"><strong>${text}</strong></p>`;
      }
      if (line.kind === "heading" || isHeadingLine(line.text)) {
        return `<p style="text-align: left; font-family: ${fontFamily}; font-size: ${bodySize}pt; margin-top: 0.75em; margin-bottom: 0.35em; text-indent: 0;"><strong>${text}</strong></p>`;
      }
      return `<p style="text-align: justify; ${bodyIndent} font-family: ${fontFamily}; font-size: ${bodySize}pt; margin-bottom: 0.35em; line-height: ${bodyLineHeight};">${text}</p>`;
    })
    .join("");
}

export { layoutFormatPlainText };
