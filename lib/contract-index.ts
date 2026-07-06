import { formatContractText } from "./contract-format";

const CN_NUM = "一二三四五六七八九十百千零〇两壹贰叁肆伍陆柒捌玖拾佰仟\\d";

export type ClauseLevel =
  | "preamble"
  | "article"
  | "subclause"
  | "en-section"
  | "en-decimal";

export interface ContractClause {
  id: string;
  label: string;
  start: number;
  end: number;
  level: ClauseLevel;
}

export interface ContractIndex {
  source: string;
  clauses: ContractClause[];
}

interface LineInfo {
  start: number;
  end: number;
  text: string;
}

function buildLineMap(source: string): LineInfo[] {
  const lines = source.split("\n");
  const out: LineInfo[] = [];
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]!;
    out.push({ start: pos, end: pos + text.length, text });
    pos += text.length + (i < lines.length - 1 ? 1 : 0);
  }
  return out;
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}~${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

/** Step 1 — Parse formatted contract into clause blocks with stable ids + char offsets. */
export function buildContractIndex(rawText: string): ContractIndex {
  const source = formatContractText(rawText.replace(/\r\n/g, "\n"));
  const lineInfos = buildLineMap(source);
  const clauses: ContractClause[] = [];
  const usedIds = new Set<string>();

  const CN_ART_RE = new RegExp(`^第\\s*([${CN_NUM}]+)\\s*条\\s*(.*)$`);
  const SUB_RE = /^(\d{1,2}(?:\.\d{1,2}){1,2})[\s、.．:：)）\u3000]*(.*)$/;
  const EN_HEAD_RE =
    /^(Section|Article|Clause|PART)\s+(\d+(?:\.\d+)*|[IVXLC]+)\b(.*)$/i;
  const EN_DEC_RE = /^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s+([A-Za-z].*)$/;

  const articles: { lineIdx: number; artNum: string; title: string; start: number }[] =
    [];

  for (let li = 0; li < lineInfos.length; li++) {
    const line = lineInfos[li]!.text.trim();
    if (!line) continue;
    const cn = line.match(CN_ART_RE);
    if (cn) {
      articles.push({
        lineIdx: li,
        artNum: cn[1]!,
        title: cn[2]?.trim() || "",
        start: lineInfos[li]!.start,
      });
    }
  }

  let firstStructureLine = articles[0]?.lineIdx ?? -1;

  if (firstStructureLine < 0) {
    for (let li = 0; li < lineInfos.length; li++) {
      const line = lineInfos[li]!.text.trim();
      if (EN_HEAD_RE.test(line) || SUB_RE.test(line)) {
        firstStructureLine = li;
        break;
      }
    }
  }

  if (firstStructureLine > 0) {
    clauses.push({
      id: uniqueId("preamble", usedIds),
      label: "前言",
      start: lineInfos[0]?.start ?? 0,
      end: lineInfos[firstStructureLine]!.start,
      level: "preamble",
    });
  }

  for (let ai = 0; ai < articles.length; ai++) {
    const art = articles[ai]!;
    const nextStart =
      ai + 1 < articles.length ? articles[ai + 1]!.start : source.length;
    const artId = uniqueId(`art-${art.artNum}`, usedIds);
    const artLabel = `第${art.artNum}条${art.title ? ` ${art.title}` : ""}`;

    const subs: { lineIdx: number; num: string; start: number }[] = [];
    for (let li = art.lineIdx + 1; li < lineInfos.length; li++) {
      if (lineInfos[li]!.start >= nextStart) break;
      const line = lineInfos[li]!.text.trim();
      const sub = line.match(SUB_RE);
      if (sub) {
        subs.push({ lineIdx: li, num: sub[1]!, start: lineInfos[li]!.start });
      }
    }

    if (!subs.length) {
      const chunk = source.slice(art.start, nextStart);
      const inlineRe = /(?:^|\n)(\d{1,2}\.\d{1,2})[\s、.．:：)）\u3000]*/gm;
      let m: RegExpExecArray | null;
      while ((m = inlineRe.exec(chunk)) !== null) {
        const absStart = art.start + m.index! + m[0].indexOf(m[1]!);
        if (!subs.some((s) => s.num === m![1]!)) {
          subs.push({ lineIdx: -1, num: m[1]!, start: absStart });
        }
      }
      subs.sort((a, b) => a.start - b.start);
    }

    if (!subs.length) {
      clauses.push({
        id: artId,
        label: artLabel,
        start: art.start,
        end: nextStart,
        level: "article",
      });
      continue;
    }

    if (subs[0]!.start > art.start) {
      clauses.push({
        id: artId,
        label: artLabel,
        start: art.start,
        end: subs[0]!.start,
        level: "article",
      });
    }

    for (let si = 0; si < subs.length; si++) {
      const sub = subs[si]!;
      const subEnd = si + 1 < subs.length ? subs[si + 1]!.start : nextStart;
      clauses.push({
        id: uniqueId(sub.num, usedIds),
        label: `${artLabel} ${sub.num}`,
        start: sub.start,
        end: subEnd,
        level: "subclause",
      });
    }
  }

  if (!articles.length) {
    const enSections: { lineIdx: number; label: string; id: string; start: number }[] =
      [];
    for (let li = 0; li < lineInfos.length; li++) {
      const line = lineInfos[li]!.text.trim();
      if (!line) continue;
      const en = line.match(EN_HEAD_RE);
      if (en) {
        const id = `${en[1]!.toLowerCase()}-${en[2]!.replace(/\s/g, "")}`;
        enSections.push({
          lineIdx: li,
          label: line.slice(0, 80),
          id,
          start: lineInfos[li]!.start,
        });
      }
    }

    for (let ei = 0; ei < enSections.length; ei++) {
      const sec = enSections[ei]!;
      const end =
        ei + 1 < enSections.length
          ? enSections[ei + 1]!.start
          : source.length;
      clauses.push({
        id: uniqueId(sec.id, usedIds),
        label: sec.label,
        start: sec.start,
        end,
        level: "en-section",
      });
    }

    if (!enSections.length) {
      const decimals: { lineIdx: number; num: string; start: number }[] = [];
      for (let li = 0; li < lineInfos.length; li++) {
        const line = lineInfos[li]!.text.trim();
        const dec = line.match(SUB_RE) || line.match(EN_DEC_RE);
        if (dec) {
          decimals.push({
            lineIdx: li,
            num: dec[1]!,
            start: lineInfos[li]!.start,
          });
        }
      }
      for (let di = 0; di < decimals.length; di++) {
        const d = decimals[di]!;
        const end =
          di + 1 < decimals.length ? decimals[di + 1]!.start : source.length;
        clauses.push({
          id: uniqueId(d.num, usedIds),
          label: d.num,
          start: d.start,
          end,
          level: "en-decimal",
        });
      }
    }
  }

  if (!clauses.length && source.length > 0) {
    clauses.push({
      id: uniqueId("full", usedIds),
      label: "全文",
      start: 0,
      end: source.length,
      level: "preamble",
    });
  }

  return { source, clauses };
}

export function findClauseById(
  index: ContractIndex,
  clauseId?: string
): ContractClause | undefined {
  if (!clauseId?.trim()) return undefined;
  const id = clauseId.trim();
  return (
    index.clauses.find((c) => c.id === id) ||
    index.clauses.find((c) => c.id.startsWith(`${id}~`))
  );
}

/** Compact clause list for AI — ids must be referenced in analysis output. */
export function formatClauseIndexForPrompt(
  index: ContractIndex,
  maxClauses = 80,
  excerptLen = 100
): string {
  const items = index.clauses.slice(0, maxClauses).map((c) => ({
    id: c.id,
    label: c.label,
    excerpt: index.source
      .slice(c.start, Math.min(c.end, c.start + excerptLen))
      .replace(/\s+/g, " ")
      .trim(),
  }));
  return JSON.stringify(items);
}

export function resolveClauseIdFromHints(
  index: ContractIndex,
  ...hints: (string | undefined)[]
): ContractClause | undefined {
  let cnArt: string | undefined;
  let decimal: string | undefined;

  for (const raw of hints) {
    if (!raw?.trim()) continue;
    const s = raw.trim();

    if (!cnArt) {
      cnArt = s.match(new RegExp(`第\\s*([${CN_NUM}]+)\\s*条`))?.[1];
    }
    if (!decimal) {
      decimal = s.match(/\b(\d{1,2}(?:\.\d{1,2}){1,2})\b/)?.[1];
    }

    const direct = index.clauses.find((c) => c.id === s || c.label === s);
    if (direct) return direct;
  }

  if (decimal && cnArt) {
    const byBoth = index.clauses.find(
      (c) =>
        (c.id === decimal || c.id.startsWith(`${decimal}~`)) &&
        c.label.includes(`第${cnArt}条`)
    );
    if (byBoth) return byBoth;
  }

  if (decimal) {
    const matches = index.clauses.filter(
      (c) => c.id === decimal || c.id.startsWith(`${decimal}~`) || c.label.includes(decimal)
    );
    if (matches.length === 1) return matches[0];
    if (cnArt && matches.length > 1) {
      const filtered = matches.filter((c) => c.label.includes(`第${cnArt}条`));
      if (filtered.length === 1) return filtered[0];
    }
    if (matches.length > 0) return matches[0];
  }

  if (cnArt) {
    const byArt = index.clauses.find(
      (c) => c.id === `art-${cnArt}` || c.id.startsWith(`art-${cnArt}~`) || c.label.includes(`第${cnArt}条`)
    );
    if (byArt) return byArt;
  }

  for (const raw of hints) {
    if (!raw?.trim()) continue;
    const s = raw.trim();
    const en = s.match(/\b(Section|Article|Clause)\s+(\d+(?:\.\d+)*)/i);
    if (en) {
      const id = `${en[1]!.toLowerCase()}-${en[2]}`;
      const byEn = index.clauses.find((c) => c.id === id || c.id.startsWith(`${id}~`));
      if (byEn) return byEn;
    }
  }

  return undefined;
}
