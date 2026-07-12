import type { KnowledgeChunk } from "./knowledge-meta";

/** Format filtered knowledge chunks for the system prompt. */
export function formatKnowledgeChunksForPrompt(
  chunks: KnowledgeChunk[],
  locale: "zh" | "en"
): string {
  const isZh = locale === "zh";
  const checks = chunks
    .filter((c) => c.kind === "mandatory_check")
    .map((c, i) => `${i + 1}. ${isZh ? c.bodyZh : c.bodyEn}`)
    .join("\n");

  const statutes = chunks
    .filter((c) => c.kind === "statute")
    .map(
      (c) =>
        `• ${c.title} [${c.meta.jurisdiction}]：${isZh ? c.bodyZh : c.bodyEn}`
    )
    .join("\n");

  const templates = chunks
    .filter((c) => c.kind === "template")
    .map((c) => {
      const body = isZh ? c.bodyZh : c.bodyEn;
      const lines = body.split("\n");
      return `【${lines[0]}】\n${lines.slice(1).join("\n")}`;
    })
    .join("\n\n");

  if (isZh) {
    return `
⸻ 场景专业知识库（已按管辖区过滤；分析时必须引用并对照，不可忽略）
【本场景必查项 — 每条须在 flags 或 missingClauses 中体现】
${checks || "（无）"}

【相关法律要点（写入 legalBasis 时优先引用；勿引用其他管辖区法条）】
${statutes || "（本管辖区无成文法摘要；请用商业惯例 / riskRationale 安全模板）"}

【建议措辞范本（suggestion / negotiations.suggested 应贴近此句式，写完整条款句，禁止只写「建议延长」类空话）】
${templates || "（无）"}
`;
  }

  return `
--- Scenario knowledge base (jurisdiction-filtered — cite in legalBasis / riskRationale)
[Mandatory checks — each must appear in flags or missingClauses]
${checks || "(none)"}

[Legal reference points — do not cite other jurisdictions]
${statutes || "(no statutes for this jurisdiction; use commercial-practice / safe riskRationale templates)"}

[Clause templates — suggestions must be full redline-ready sentences, not vague advice]
${templates || "(none)"}
`;
}
