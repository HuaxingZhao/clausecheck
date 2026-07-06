import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFPage, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { extractTextItems, getDocumentProxy, type StructuredTextItem } from "unpdf";
import type { ContractChange } from "./types";
import { loadCjkFontBytes } from "./pdf-export";

type EditMode = "apply" | "preview" | "highlight";

interface TextBBox {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

function copyBytes(buf: Uint8Array): Uint8Array {
  return new Uint8Array(buf.slice(0));
}

function normalizeForMatch(text: string): string {
  const PUNCT: Record<string, string> = {
    "，": ",",
    "。": ".",
    "：": ":",
    "；": ";",
    "（": "(",
    "）": ")",
    "、": ",",
    "“": '"',
    "”": '"',
  };
  let out = "";
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    out += (PUNCT[ch] ?? ch).toLowerCase();
  }
  return out;
}

function normChar(ch: string): string {
  const PUNCT: Record<string, string> = {
    "，": ",",
    "。": ".",
    "：": ":",
    "；": ";",
    "（": "(",
    "）": ")",
    "、": ",",
    "“": '"',
    "”": '"',
  };
  return (PUNCT[ch] ?? ch).toLowerCase();
}

/** Build per-page plain text + normalized index from structured items. */
function pageTextIndex(items: StructuredTextItem[]) {
  let plain = "";
  const normMap: { normIdx: number; itemIdx: number; charInItem: number }[] = [];
  let norm = "";

  items.forEach((item, itemIdx) => {
    for (let i = 0; i < item.str.length; i++) {
      const ch = item.str[i]!;
      plain += ch;
      if (/\s/.test(ch)) continue;
      normMap.push({ normIdx: norm.length, itemIdx, charInItem: i });
      norm += normChar(ch);
    }
    if (item.hasEOL) plain += "\n";
  });

  return { plain, norm, normMap, items };
}

function findNeedleRange(
  norm: string,
  normMap: { normIdx: number; itemIdx: number; charInItem: number }[],
  needle: string
): { normStart: number; normEnd: number } | null {
  const needleNorm = normalizeForMatch(needle);
  if (needleNorm.length < 4) return null;
  let at = norm.indexOf(needleNorm);
  if (at < 0 && needleNorm.length > 12) {
    at = norm.indexOf(needleNorm.slice(0, needleNorm.length - 3));
  }
  if (at < 0) return null;
  return { normStart: at, normEnd: at + needleNorm.length };
}

function bboxForRange(
  items: StructuredTextItem[],
  normMap: { normIdx: number; itemIdx: number; charInItem: number }[],
  normStart: number,
  normEnd: number,
  pageIndex: number
): TextBBox | null {
  const start = normMap[normStart];
  const end = normMap[normEnd - 1];
  if (!start || !end) return null;

  const first = items[start.itemIdx]!;
  const last = items[end.itemIdx]!;

  const x = first.x;
  const y = Math.min(first.y, last.y);
  const right = Math.max(first.x + first.width, last.x + last.width);
  const top = Math.max(first.y + first.height, last.y + last.height);
  const fontSize = Math.max(first.fontSize, last.fontSize, 9);

  return {
    pageIndex,
    x,
    y,
    width: Math.max(right - x, 10),
    height: Math.max(top - y, fontSize * 0.9),
    fontSize,
  };
}

function wrapPdfText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    const test = current + ch;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current.length > 0) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

async function loadFonts(pdfDoc: PDFDocument, locale: "zh" | "en"): Promise<PDFFont> {
  pdfDoc.registerFontkit(fontkit);
  if (locale === "zh") {
    const cjk = await loadCjkFontBytes();
    return pdfDoc.embedFont(cjk);
  }
  return pdfDoc.embedFont(StandardFonts.Helvetica);
}

function drawHighlight(page: PDFPage, box: TextBBox) {
  page.drawRectangle({
    x: box.x - 2,
    y: box.y - 2,
    width: box.width + 4,
    height: box.height + 4,
    color: rgb(1, 0.82, 0.82),
    opacity: 0.85,
  });
}

function drawApply(
  page: PDFPage,
  font: PDFFont,
  box: TextBBox,
  revised: string
) {
  page.drawRectangle({
    x: box.x - 1,
    y: box.y - 2,
    width: box.width + 2,
    height: box.height + 4,
    color: rgb(1, 1, 1),
  });
  const size = Math.min(box.fontSize, 12);
  page.drawText(revised, {
    x: box.x,
    y: box.y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

function drawPreview(
  page: PDFPage,
  font: PDFFont,
  box: TextBBox,
  revised: string
) {
  const size = Math.min(box.fontSize, 11);
  const pageWidth = page.getWidth();
  const maxWidth = Math.max(pageWidth - box.x - 36, box.width, 80);

  page.drawRectangle({
    x: box.x - 2,
    y: box.y - 3,
    width: box.width + 4,
    height: box.height + 6,
    color: rgb(1, 0.93, 0.93),
    opacity: 0.8,
  });
  page.drawLine({
    start: { x: box.x, y: box.y + box.height * 0.35 },
    end: { x: box.x + box.width, y: box.y + box.height * 0.35 },
    thickness: 0.9,
    color: rgb(0.78, 0.12, 0.12),
  });

  const lines = wrapPdfText(revised, font, size, maxWidth);
  const lineHeight = size * 1.45;
  const pad = 4;
  const blockH = lines.length * lineHeight + pad * 2;
  let blockW = box.width;
  for (const line of lines) {
    blockW = Math.max(blockW, font.widthOfTextAtSize(line, size) + pad * 2);
  }
  blockW = Math.min(blockW + 4, maxWidth + pad * 2);

  const gap = 6;
  const blockBottom = box.y - gap;
  const blockTop = blockBottom - blockH;

  page.drawRectangle({
    x: box.x - 2,
    y: blockTop,
    width: blockW,
    height: blockH,
    color: rgb(0.93, 0.98, 0.95),
    borderColor: rgb(0.2, 0.55, 0.32),
    borderWidth: 0.5,
  });

  let textY = blockBottom - pad - size;
  for (const line of lines) {
    page.drawText(line, {
      x: box.x,
      y: textY,
      size,
      font,
      color: rgb(0.08, 0.42, 0.24),
    });
    textY -= lineHeight;
  }
}

async function applyChangesToPdfInternal(
  pdfBytes: Uint8Array,
  changes: ContractChange[],
  mode: EditMode,
  locale: "zh" | "en" = "zh"
): Promise<{ bytes: Uint8Array; applied: number }> {
  const unpdfCopy = copyBytes(pdfBytes);
  const pdfLibCopy = copyBytes(pdfBytes);

  const proxy = await getDocumentProxy(unpdfCopy);
  const { items: pagesItems } = await extractTextItems(proxy);
  const pdfDoc = await PDFDocument.load(pdfLibCopy);
  const font = await loadFonts(pdfDoc, locale);
  const pdfPages = pdfDoc.getPages();
  let applied = 0;

  for (const change of changes) {
    const orig = change.original?.trim();
    const rev = change.revised?.trim();
    if (!orig || !rev) continue;

    let matched = false;
    for (let pageIndex = 0; pageIndex < pagesItems.length; pageIndex++) {
      const pageItems = pagesItems[pageIndex] ?? [];
      const { norm, normMap, items } = pageTextIndex(pageItems);
      const range = findNeedleRange(norm, normMap, orig);
      if (!range) continue;

      const box = bboxForRange(items, normMap, range.normStart, range.normEnd, pageIndex);
      if (!box) continue;

      const page = pdfPages[pageIndex];
      if (!page) continue;

      if (mode === "apply") {
        drawApply(page, font, box, rev);
      } else if (mode === "highlight") {
        drawHighlight(page, box);
      } else {
        drawPreview(page, font, box, rev);
      }
      applied++;
      matched = true;
      break;
    }
    void matched;
  }

  const bytes = await pdfDoc.save();
  return { bytes, applied };
}

/** Replace matched text in the original PDF (white-out + new text). */
export async function applyChangesToPdf(
  pdfBytes: Uint8Array,
  changes: ContractChange[],
  locale: "zh" | "en" = "zh"
): Promise<{ bytes: Uint8Array; applied: number }> {
  return applyChangesToPdfInternal(pdfBytes, changes, "apply", locale);
}

/** Red highlight behind matched text — original wording unchanged. */
export async function highlightChangesOnPdf(
  pdfBytes: Uint8Array,
  changes: ContractChange[],
  locale: "zh" | "en" = "zh"
): Promise<{ bytes: Uint8Array; applied: number }> {
  return applyChangesToPdfInternal(pdfBytes, changes, "highlight", locale);
}

/** Draw red strikethrough + green revised text on the original PDF layout. */
export async function previewChangesOnPdf(
  pdfBytes: Uint8Array,
  changes: ContractChange[],
  locale: "zh" | "en" = "zh"
): Promise<{ bytes: Uint8Array; applied: number }> {
  return applyChangesToPdfInternal(pdfBytes, changes, "preview", locale);
}
