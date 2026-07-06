import { formatContractText } from "@/lib/contract-format";
import type { ContractChange } from "@/lib/types";
import { applyChangeToText } from "@/lib/apply-change";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Whether stored contract body is TipTap HTML rather than plain text. */
export function isRichTextHtml(value: string): boolean {
  const trimmed = value.trim();
  return /^<(p|h[1-6]|ul|ol|div|br)\b/i.test(trimmed);
}

/** Convert plain contract text into HTML paragraphs for the rich editor. */
export function plainTextToHtml(text: string): string {
  const formatted = formatContractText(text.replace(/\r\n/g, "\n"));
  if (!formatted.trim()) return "<p></p>";

  return (
    formatted
      .split(/\n\n+/)
      .map((block) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (!lines.length) return "";
        const inner = lines.map((line) => escapeHtml(line)).join("<br>");
        return `<p>${inner}</p>`;
      })
      .filter(Boolean)
      .join("") || "<p></p>"
  );
}

/** Strip HTML to plain text (works on server and client). */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  if (!isRichTextHtml(html)) return html.replace(/\r\n/g, "\n");

  let text = html
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<\/h[1-6]>\s*<h[1-6][^>]*>/gi, "\n\n")
    .replace(/<\/li>\s*<li[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/ul>|<\/ol>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/** Normalize saved/initial body into HTML for the rich editor. */
export function prepareEditableContractHtml(raw: string): string {
  if (!raw) return "<p></p>";
  if (isRichTextHtml(raw)) return raw;
  return plainTextToHtml(raw);
}

/** Plain-text prep kept for backwards compatibility. */
export function prepareEditableContractText(raw: string): string {
  return formatContractText(raw.replace(/\r\n/g, "\n"));
}

/** Apply a suggestion to HTML or plain contract body. */
export function applyChangeToRichContent(
  content: string,
  change: ContractChange
): string | null {
  const plain = htmlToPlainText(content);
  const next = applyChangeToText(plain, change);
  if (!next || next === plain) return null;
  if (isRichTextHtml(content)) return plainTextToHtml(next);
  return next;
}

/** Plain text used for suggestion matching in the editor. */
export function contractBodyPlainText(content: string): string {
  return htmlToPlainText(content);
}

/** Text sent to export APIs — preserves structure as plain text. */
export function contractBodyForExport(content: string): string {
  return htmlToPlainText(content);
}
