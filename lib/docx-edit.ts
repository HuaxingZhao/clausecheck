import JSZip from "jszip";
import type { ContractChange } from "./types";

const PUNCT: Record<string, string> = {
  "，": ",",
  "。": ".",
  "：": ":",
  "；": ";",
  "！": "!",
  "？": "?",
  "（": "(",
  "）": ")",
  "【": "[",
  "】": "]",
  "、": ",",
  "—": "-",
  "－": "-",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "「": '"',
  "」": '"',
};

function normChar(ch: string): string {
  return (PUNCT[ch] ?? ch).toLowerCase();
}

function normalizeForMatch(text: string): string {
  let out = "";
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    out += normChar(ch);
  }
  return out;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function encodeXmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface RunSlice {
  /** Index of this `<w:t>` match in the paragraph */
  index: number;
  text: string;
  plainStart: number;
  plainEnd: number;
}

function collectRuns(paraXml: string): { runs: RunSlice[]; plain: string; norm: string; normMap: number[] } {
  const runs: RunSlice[] = [];
  let plain = "";
  const normMap: number[] = [];
  let norm = "";
  const re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(paraXml)) !== null) {
    const text = decodeXmlEntities(m[1] ?? "");
    const plainStart = plain.length;
    plain += text;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      if (/\s/.test(ch)) continue;
      normMap.push(plainStart + i);
      norm += normChar(ch);
    }
    runs.push({ index: idx++, text, plainStart, plainEnd: plainStart + text.length });
  }
  return { runs, plain, norm, normMap };
}

function locateNeedle(
  norm: string,
  normMap: number[],
  needle: string
): { start: number; end: number } | null {
  const needleNorm = normalizeForMatch(needle);
  if (needleNorm.length < 4) return null;

  let at = norm.indexOf(needleNorm);
  if (at < 0 && needleNorm.length > 12) {
    at = norm.indexOf(needleNorm.slice(0, needleNorm.length - 3));
    if (at >= 0) {
      const start = normMap[at]!;
      const end = normMap[at + needleNorm.length - 4]! + 1;
      return { start, end };
    }
    at = norm.indexOf(needleNorm.slice(3));
  }
  if (at < 0) return null;

  const start = normMap[at]!;
  const end = normMap[at + needleNorm.length - 1]! + 1;
  return { start, end };
}

/** Apply one find/replace inside a single `<w:p>` paragraph XML string. */
function replaceInParagraph(
  paraXml: string,
  original: string,
  revised: string
): { xml: string; matched: boolean } {
  const { runs, plain, norm, normMap } = collectRuns(paraXml);
  if (!runs.length) return { xml: paraXml, matched: false };

  const loc = locateNeedle(norm, normMap, original);
  if (!loc) return { xml: paraXml, matched: false };

  const newPlain = plain.slice(0, loc.start) + revised + plain.slice(loc.end);

  let firstIdx = runs.findIndex((r) => loc.start < r.plainEnd);
  let lastIdx = runs.findIndex((r) => loc.end <= r.plainEnd);
  if (firstIdx < 0) firstIdx = 0;
  if (lastIdx < 0) lastIdx = runs.length - 1;

  const texts: string[] = runs.map((r, i) => {
    if (i < firstIdx) return r.text;
    if (i > lastIdx) {
      const delta = newPlain.length - plain.length;
      return newPlain.slice(r.plainStart + delta, r.plainEnd + delta);
    }
    if (firstIdx === lastIdx) {
      return plain.slice(r.plainStart, loc.start) + revised + plain.slice(loc.end, r.plainEnd);
    }
    if (i === firstIdx) return plain.slice(r.plainStart, loc.start) + revised;
    if (i === lastIdx) return plain.slice(loc.end, r.plainEnd);
    return "";
  });

  let runIdx = 0;
  const xml = paraXml.replace(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g, (match) => {
    const newText = texts[runIdx] ?? "";
    runIdx++;
    return match.replace(/>([^<]*)</, `>${encodeXmlText(newText)}<`);
  });

  return { xml, matched: true };
}

function applyChangesToXml(xml: string, changes: ContractChange[]): { xml: string; applied: number } {
  let result = xml;
  let applied = 0;

  for (const c of changes) {
    if (!c.original?.trim() || !c.revised?.trim()) continue;
    const parts = result.split(/(?=<w:p[\s>])/);
    let merged = parts[0] ?? "";
    let matched = false;

    for (let p = 1; p < parts.length; p++) {
      const para = parts[p]!;
      const end = para.indexOf("</w:p>");
      if (end < 0) {
        merged += para;
        continue;
      }
      const body = para.slice(0, end + 6);
      const tail = para.slice(end + 6);
      if (!matched) {
        const rep = replaceInParagraph(body, c.original, c.revised);
        if (rep.matched) {
          merged += rep.xml + tail;
          matched = true;
          continue;
        }
      }
      merged += para;
    }

    if (matched) {
      result = merged;
      applied++;
    }
  }

  return { xml: result, applied };
}

const DOCX_PARTS = [
  "word/document.xml",
  ...Array.from({ length: 10 }, (_, i) => `word/header${i + 1}.xml`),
  ...Array.from({ length: 10 }, (_, i) => `word/footer${i + 1}.xml`),
];

/**
 * Apply find/replace edits directly into an uploaded .docx, preserving layout.
 */
export async function applyChangesToDocx(
  docxBytes: Uint8Array,
  changes: ContractChange[]
): Promise<{ bytes: Uint8Array; applied: number }> {
  const zip = await JSZip.loadAsync(docxBytes);
  let totalApplied = 0;

  for (const path of DOCX_PARTS) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async("string");
    const { xml: updated, applied } = applyChangesToXml(xml, changes);
    if (applied > 0) {
      zip.file(path, updated);
      totalApplied += applied;
    }
  }

  const out = await zip.generateAsync({ type: "uint8array" });
  return { bytes: out, applied: totalApplied };
}
