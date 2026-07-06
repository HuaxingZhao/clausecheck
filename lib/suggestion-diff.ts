/** Inline diff segments for suggestion cards. */

export type DiffSegment = {
  text: string;
  type: "equal" | "insert" | "delete";
};

/** Character-level LCS diff for contract excerpts. */
export function diffStrings(a: string, b: string): DiffSegment[] {
  const n = a.length;
  const m = b.length;
  if (!n && !m) return [];
  if (!n) return [{ text: b, type: "insert" }];
  if (!m) return [{ text: a, type: "delete" }];

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const raw: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      const last = raw[raw.length - 1];
      if (last?.type === "equal") last.text += a[i];
      else raw.push({ text: a[i]!, type: "equal" });
      i++;
      j++;
    } else if (j < m && (i >= n || dp[i]![j + 1]! >= dp[i + 1]![j]!)) {
      const last = raw[raw.length - 1];
      if (last?.type === "insert") last.text += b[j];
      else raw.push({ text: b[j]!, type: "insert" });
      j++;
    } else {
      const last = raw[raw.length - 1];
      if (last?.type === "delete") last.text += a[i];
      else raw.push({ text: a[i]!, type: "delete" });
      i++;
    }
  }
  return coalesceSegments(raw);
}

function coalesceSegments(segs: DiffSegment[]): DiffSegment[] {
  const out: DiffSegment[] = [];
  for (const s of segs) {
    if (!s.text) continue;
    const prev = out[out.length - 1];
    if (prev && prev.type === s.type) prev.text += s.text;
    else out.push({ ...s });
  }
  return out;
}

export function diffForSuggestion(original: string, revised: string) {
  const o = original.trim();
  const r = revised.trim();
  if (!o) {
    return {
      originalParts: [] as { text: string; removed: boolean }[],
      revisedParts: [{ text: r, added: true }],
    };
  }
  if (!r) {
    return {
      originalParts: [{ text: o, removed: true }],
      revisedParts: [] as { text: string; added: boolean }[],
    };
  }

  const segments = diffStrings(o, r);
  const originalParts: { text: string; removed: boolean }[] = [];
  const revisedParts: { text: string; added: boolean }[] = [];

  for (const s of segments) {
    if (s.type === "equal") {
      originalParts.push({ text: s.text, removed: false });
      revisedParts.push({ text: s.text, added: false });
    } else if (s.type === "delete") {
      originalParts.push({ text: s.text, removed: true });
    } else {
      revisedParts.push({ text: s.text, added: true });
    }
  }

  return { originalParts, revisedParts };
}

/** Detect AI meta-commentary instead of actual clause text. */
export function isMetaCommentary(text: string, locale: "zh" | "en" = "zh"): boolean {
  const t = text.trim();
  if (!t) return false;

  const zhPatterns = [
    /合同中未提及/,
    /本文未提及/,
    /原文未提及/,
    /协议中未提及/,
    /未提及.{0,20}(协议|条款|标准|SLA|约定|规定)/i,
    /缺少.{0,12}(条款|规定|约定|内容)/,
    /未(作出|进行|设置|约定|规定|明确|涉及|包含|载明)/,
    /无(相关|此项|明确|具体)?(约定|规定|条款|说明)/,
    /应增加.{0,30}条款[。．]?\s*$/,
    /建议增加.{0,30}[。．]?\s*$/,
    /^(该合同|本合同|合同)?未(包含|规定|约定|明确)/,
    /本确认函未/,
    /未规定任何/,
    /未包含任何/,
    /确认函中未/,
    /未见.{0,8}(约定|规定|条款)/,
    /不存在.{0,8}(条款|约定|规定)/,
  ];
  const enPatterns = [
    /contract does not mention/i,
    /not mentioned in the contract/i,
    /is missing from the contract/i,
    /should add a clause/i,
    /recommend adding/i,
    /^missing .{0,40} clause\.?$/i,
    /does not specify/i,
    /does not address/i,
    /not addressed in/i,
    /no provision (for|regarding|on)/i,
    /confirmation letter does not/i,
    /not specified in the/i,
    /absent from the contract/i,
    /no explicit (provision|clause|term)/i,
  ];

  const patterns = locale === "en" ? enPatterns : zhPatterns;
  if (patterns.some((p) => p.test(t))) return true;

  if (t.length < 40 && /未提及|does not mention|missing|应增加|建议增加/i.test(t)) {
    return true;
  }

  return false;
}

/** Meta/absence description in any supported locale. */
export function isAbsenceDescription(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return isMetaCommentary(t, "zh") || isMetaCommentary(t, "en");
}

/** Strip meta suffix appended after the original passage. */
export function stripMetaSuffix(revised: string, original: string, locale: "zh" | "en"): string {
  let r = revised.trim();
  const o = original.trim();
  if (!r.startsWith(o)) return r;

  const tail = r.slice(o.length).trim();
  if (!tail || !isMetaCommentary(tail, locale)) return r;

  return o;
}
