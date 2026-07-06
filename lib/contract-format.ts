/**
 * Re-introduce paragraph/clause structure into contract text that was
 * flattened during PDF extraction. ONLY inserts line breaks — never changes,
 * adds, or removes any actual content characters. This keeps the wording
 * byte-identical while restoring a contract-like layout.
 */

const CN_NUM = "一二三四五六七八九十百千零〇两壹贰叁肆伍陆柒捌玖拾佰仟";

export function formatContractText(raw: string): string {
  if (!raw) return raw;

  let s = raw.replace(/\r\n/g, "\n");

  // 1) Break before top-level structural intros.
  s = s.replace(/\s*(鉴于[：:])/g, "\n\n$1");
  s = s.replace(/(达成如下协议[：:])\s*/g, "$1\n\n");

  // 2) Break before article / chapter / section headers: 第X条 / 第X章 / 第X节
  s = s.replace(
    new RegExp(`\\s*(第\\s*[${CN_NUM}\\d]+\\s*[条章节款項项])`, "g"),
    "\n\n$1"
  );
  // 2b) Glued headers: …协议第一条 → …协议 + 第一条
  s = s.replace(
    new RegExp(`([\\u4e00-\\u9fff]{2,})(第\\s*[${CN_NUM}\\d]+\\s*[条章节款項项])`, "g"),
    "$1\n\n$2"
  );

  // 2c) Party labels on their own line
  s = s.replace(/([。；;]\s*|\n\s*)(甲方|乙方|丙方|丁方)/g, "$1\n$2");

  // 3) Break before decimal sub-clause numbering (1.1, 2.3, 10.2.1 …)
  s = s.replace(
    /([\u3000\s\u4e00-\u9fffA-Za-z0-9。」』）)】，,；;：:])(\d{1,2}(?:\.\d{1,2}){1,2})(?=[\s\u3000\u4e00-\u9fffA-Za-z(（])/g,
    "$1\n$2"
  );

  // 4) Break before bare ordinal list items at sentence boundaries: "。3. " etc.
  s = s.replace(/([。；;])\s*(\d{1,2}[\.、])(?=\s*[\u4e00-\u9fff])/g, "$1\n$2");

  // 5) English headings: "Section 3", "Article 5", "Clause 2.5", "PART I"
  s = s.replace(/\s*(Section\s+\d+(?:\.\d+)*|Article\s+[IVXLC\d]+|Clause\s+\d+(?:\.\d+)*|PART\s+[IVXLC\d]+)\b/gi, "\n\n$1");
  // 5b) English decimal clauses glued to prior text: "...Agreement2.5 Title"
  s = s.replace(
    /([a-zA-Z.)"\u201d\u2019])(\d{1,2}\.\d{1,2})(?=\s+[A-Z])/g,
    "$1\n\n$2"
  );
  // 5c) English recitals
  s = s.replace(/\s*(WHEREAS[,:]?|NOW[, ]+THEREFORE[, ]+|IN WITNESS WHEREOF[, ]*)/gi, "\n\n$1 ");
  // 5d) Party labels
  s = s.replace(/([.;])\s*(Party\s+[A-D]|Landlord|Tenant|Buyer|Seller|Licensor|Licensee)\b/gi, "$1\n\n$2");

  // 6) Sentence breaks inside long unbroken runs (common after PDF extraction).
  s = s.replace(/([。；;])\s*(?=[^\n\d])/g, "$1\n");

  // Collapse runs of blank lines and trailing spaces per line.
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t\u3000]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}

export type ContractLineKind = "title" | "heading" | "body";
export interface ContractLine {
  text: string;
  kind: ContractLineKind;
}

export function isHeadingLine(line: string): boolean {
  return (
    new RegExp(`^第\\s*[${CN_NUM}\\d]+\\s*[条章节]`).test(line) ||
    /^(article|section|clause|part)\s+[\d.IVXLC]+/i.test(line) ||
    /^\d{1,2}(?:\.\d{1,2}){1,2}\s+[A-Z]/.test(line) ||
    /^(附件|附录|签署页|签字页|schedule|exhibit|appendix)/i.test(line)
  );
}

/**
 * Turn a (formatted) contract into typed lines: the first non-empty line is
 * the title, article/section markers are headings, everything else is body.
 * Used by the on-screen view and the PDF / Word exporters for one consistent
 * layout that mirrors the original document.
 */
export function toContractLines(finalText: string): ContractLine[] {
  const lines = formatContractText(finalText).split("\n");
  const out: ContractLine[] = [];
  let titleSet = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (!titleSet) {
      out.push({ text: line, kind: "title" });
      titleSet = true;
      continue;
    }
    out.push({ text: line, kind: isHeadingLine(line) ? "heading" : "body" });
  }
  return out;
}
