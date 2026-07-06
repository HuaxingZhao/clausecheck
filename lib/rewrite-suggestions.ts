import OpenAI from "openai";
import { isAdvisoryRevision } from "./revision-export";
import type { NegotiationPoint, RiskFlag, ScanResult } from "./types";

interface RewriteItem {
  kind: "flag" | "negotiation";
  index: number;
  original: string;
  advisory: string;
  section?: string;
}

const REWRITE_SCHEMA = `{
  "items": [
    { "index": 0, "kind": "flag", "clauseText": "完整可粘贴的修订条款句" }
  ]
}`;

export async function rewriteAdvisorySuggestions(
  openai: OpenAI,
  contractText: string,
  result: ScanResult,
  locale: "zh" | "en"
): Promise<ScanResult> {
  const items: RewriteItem[] = [];

  result.flags.forEach((flag, index) => {
    const original = flag.quote?.trim();
    const suggestion = flag.suggestion?.trim();
    if (!original || !suggestion) return;
    if (!isAdvisoryRevision(original, suggestion)) return;
    items.push({
      kind: "flag",
      index,
      original,
      advisory: suggestion,
      section: flag.category || flag.text,
    });
  });

  (result.negotiations ?? []).forEach((nego, index) => {
    const original = nego.quote?.trim() || nego.current?.trim();
    const suggested = nego.suggested?.trim();
    if (!original || !suggested) return;
    if (!isAdvisoryRevision(original, suggested)) return;
    items.push({
      kind: "negotiation",
      index,
      original,
      advisory: suggested,
      section: nego.clause,
    });
  });

  if (!items.length) return result;

  const batch = items.slice(0, 14);
  const listText = batch
    .map(
      (it, i) =>
        locale === "zh"
          ? `[${i}] ${it.section || ""}\n原文：${it.original}\n修改要点：${it.advisory}`
          : `[${i}] ${it.section || ""}\nOriginal: ${it.original}\nNote: ${it.advisory}`
    )
    .join("\n\n");

  const system =
    locale === "zh"
      ? `你是合同修订专家。将「修改要点」改写为可直接替换原文的完整条款句（保留原文结构和编号风格，只改必要部分）。
规则：输出必须是完整句子；不得只输出「建议…」；数字/期限须明确写入。
输出 JSON：${REWRITE_SCHEMA}`
      : `You rewrite revision notes into full redline-ready clause sentences matching the original style.
Output JSON: ${REWRITE_SCHEMA}`;

  const user =
    locale === "zh"
      ? `请为以下 ${batch.length} 条生成完整修订条款句：\n\n${listText}`
      : `Rewrite these ${batch.length} items into full clause text:\n\n${listText}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 2800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content;
    if (!raw) return result;

    const parsed = JSON.parse(raw) as {
      items?: { index: number; kind: string; clauseText: string }[];
    };
    const rewrites = parsed.items ?? [];

    const flags = [...result.flags];
    const negotiations = [...(result.negotiations ?? [])];

    batch.forEach((item, batchIdx) => {
      const rw = rewrites.find((r) => r.index === batchIdx);
      const text = rw?.clauseText?.trim();
      if (!text || text.length < 8) return;
      if (item.kind === "flag") {
        flags[item.index] = { ...flags[item.index]!, suggestion: text };
      } else {
        negotiations[item.index] = {
          ...negotiations[item.index]!,
          suggested: text,
        };
      }
    });

    return { ...result, flags, negotiations };
  } catch (err) {
    console.error("rewriteAdvisorySuggestions error:", err);
    return result;
  }
}

export function countAdvisoryItems(result: ScanResult): number {
  let n = 0;
  for (const f of result.flags) {
    if (f.quote && f.suggestion && isAdvisoryRevision(f.quote, f.suggestion)) n++;
  }
  for (const nego of result.negotiations ?? []) {
    const o = nego.quote || nego.current;
    if (o && nego.suggested && isAdvisoryRevision(o, nego.suggested)) n++;
  }
  return n;
}
