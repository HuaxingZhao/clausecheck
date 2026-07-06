/** Shared section-label parsing for Chinese and English contracts. */

const CN_TO_DIGIT: Record<string, string> = {
  一: "1", 二: "2", 三: "3", 四: "4", 五: "5",
  六: "6", 七: "7", 八: "8", 九: "9", 十: "10",
};

export interface ParsedSectionHint {
  cnArticle?: string;
  decimal?: string;
  enArticle?: string;
  enSection?: string;
  enClause?: string;
  title?: string;
}

export function parseSectionHint(section: string): ParsedSectionHint {
  const sec = section.trim();
  const out: ParsedSectionHint = {};

  const cnArt = sec.match(/第\s*([一二三四五六七八九十百千\d]+)\s*条/)?.[1];
  if (cnArt) out.cnArticle = cnArt;

  const decimal = sec.match(/\b(\d+(?:\.\d+)+)\b/)?.[1];
  if (decimal) out.decimal = decimal;

  const enArticle = sec.match(/\b(Article|ARTICLE)\s+([IVXLC\d]+|\d+)\b/i);
  if (enArticle) out.enArticle = enArticle[0]!;

  const enSection = sec.match(/\b(Section|SECTION)\s+(\d+(?:\.\d+)*|\d+)\b/i);
  if (enSection) out.enSection = enSection[0]!;

  const enClause = sec.match(/\b(Clause|CLAUSE)\s+(\d+(?:\.\d+)*|\d+)\b/i);
  if (enClause) out.enClause = enClause[0]!;

  const titlePart = sec
    .replace(/^[\d.\s、一二三四五六七八九十]+/, "")
    .replace(/^(Article|Section|Clause|Part)\s+[\d.IVXLC]+\s*[-–—:]?\s*/i, "")
    .replace(/^第\s*[一二三四五六七八九十百千\d]+\s*条\s*[\d.]+\s*/, "")
    .trim();
  if (titlePart.length >= 3) out.title = titlePart;

  return out;
}

function cnArticlePatterns(article: string): string[] {
  if (/^\d+$/.test(article)) return [`第\\s*${article}\\s*条`];
  const patterns = [`第\\s*${article}\\s*条`];
  const digit = CN_TO_DIGIT[article];
  if (digit) patterns.push(`第\\s*${digit}\\s*条`);
  return patterns;
}

function findCnArticle(text: string, article: string): number {
  let best = -1;
  for (const pattern of cnArticlePatterns(article)) {
    const re = new RegExp(pattern, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (best < 0 || m.index < best) best = m.index;
    }
  }
  return best;
}

/** Locate sub-clause (e.g. 6.4) under a specific 第X条 article. */
function findCnArticleSubclause(
  text: string,
  article: string,
  sub: string
): number {
  const subEsc = sub.replace(/\./g, "\\.");
  const subRe = new RegExp(
    `(?:^|[\\n\\r\\s。；;、])${subEsc}(?=[\\s\\u3000\\u4e00-\\u9fff(（:：])`,
    "m"
  );

  for (const pattern of cnArticlePatterns(article)) {
    const re = new RegExp(pattern, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const chunk = text.slice(m.index, m.index + 4000);
      const subMatch = subRe.exec(chunk);
      if (subMatch?.index != null) {
        return m.index + subMatch.index;
      }
    }
  }
  return -1;
}

/** Decimal sub-clause at line/ clause boundary — not bare substring in IDs. */
function findQualifiedDecimal(text: string, decimal: string): number {
  const subEsc = decimal.replace(/\./g, "\\.");
  const re = new RegExp(
    `(?:^|[\\n\\r。；;、\\s])${subEsc}(?=[\\s\\u3000\\u4e00-\\u9fff(（:：])`,
    "gm"
  );
  let best = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (best < 0 || m.index < best) best = m.index;
  }
  return best;
}

function findEnLabel(text: string, label: string): number {
  let idx = text.indexOf(label);
  if (idx >= 0) return idx;
  idx = text.toLowerCase().indexOf(label.toLowerCase());
  return idx;
}

export function buildSectionNeedles(section?: string): string[] {
  if (!section?.trim()) return [];

  const parsed = parseSectionHint(section);
  const needles: string[] = [];

  if (parsed.cnArticle && parsed.decimal) {
    needles.push(`第${parsed.cnArticle}条`);
    needles.push(`${parsed.decimal}`);
  }
  if (parsed.enSection) needles.push(parsed.enSection);
  if (parsed.enClause) needles.push(parsed.enClause);
  if (parsed.enArticle) needles.push(parsed.enArticle);
  if (parsed.title && parsed.title.length >= 4) {
    needles.push(parsed.title.slice(0, Math.min(40, parsed.title.length)));
  }

  const sec = section.trim();
  needles.push(sec.slice(0, Math.min(48, sec.length)));

  return [...new Set(needles.filter((n) => n.trim().length >= 2))];
}

export function findSectionAnchor(text: string, section?: string): number {
  if (!section?.trim()) return -1;

  const parsed = parseSectionHint(section);

  if (parsed.cnArticle && parsed.decimal) {
    const idx = findCnArticleSubclause(text, parsed.cnArticle, parsed.decimal);
    if (idx >= 0) return idx;
  }

  if (parsed.cnArticle) {
    const idx = findCnArticle(text, parsed.cnArticle);
    if (idx >= 0) return idx;
  }

  if (parsed.decimal) {
    const idx = findQualifiedDecimal(text, parsed.decimal);
    if (idx >= 0) return idx;
  }

  if (parsed.enSection) {
    const idx = findEnLabel(text, parsed.enSection);
    if (idx >= 0) return idx;
  }
  if (parsed.enClause) {
    const idx = findEnLabel(text, parsed.enClause);
    if (idx >= 0) return idx;
  }
  if (parsed.enArticle) {
    const idx = findEnLabel(text, parsed.enArticle);
    if (idx >= 0) return idx;
  }

  if (parsed.title && parsed.title.length >= 4) {
    const idx = text.indexOf(parsed.title.slice(0, Math.min(20, parsed.title.length)));
    if (idx >= 0) return idx;
  }

  return -1;
}

/** End of the current section window (next major heading). */
export function sectionWindowBounds(
  text: string,
  anchor: number
): { start: number; end: number } {
  const start = Math.max(0, anchor - 80);
  let end = text.length;

  const tail = text.slice(anchor + 3);
  const nextBreak = tail.search(
    /\n\n(?:第[一二三四五六七八九十百千\d]+条|[\d]+(?:\.\d+)+\s|[一二三四五六七八九十]+、|Article\s+\d+|Section\s+\d+|Clause\s+\d+|PART\s+[IVXLC\d]+|\d+\.\d+\s+[A-Z])/i
  );
  if (nextBreak >= 0) {
    end = anchor + 3 + nextBreak;
  } else {
    end = Math.min(text.length, anchor + 3200);
  }

  return { start, end: Math.max(end, start + 40) };
}

export interface SectionSearchWindow {
  start: number;
  end: number;
  anchor: number;
  /** Whether a section label was found in the contract text. */
  found: boolean;
}

export function sectionSearchWindow(
  text: string,
  section?: string
): SectionSearchWindow {
  if (!section?.trim()) {
    return { start: 0, end: text.length, anchor: 0, found: false };
  }

  const anchor = findSectionAnchor(text, section);
  if (anchor < 0) {
    return { start: 0, end: text.length, anchor: 0, found: false };
  }

  const { start, end } = sectionWindowBounds(text, anchor);
  return { start, end, anchor, found: true };
}
