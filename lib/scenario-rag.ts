import type { ContractScenarioId } from "./contract-scenarios";
import { getScenarioKnowledge } from "./scenario-knowledge";

/** 将场景知识库格式化为 Prompt 片段（法条摘要 + 范本 + 必查项） */
export function formatScenarioKnowledgeForPrompt(
  scenarioId: ContractScenarioId,
  locale: "zh" | "en"
): string {
  const pack = getScenarioKnowledge(scenarioId);
  const isZh = locale === "zh";

  const checks = (isZh ? pack.mandatoryChecksZh : pack.mandatoryChecksEn)
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n");

  const statutes = pack.statutes
    .map((s) => `• ${s.title}：${isZh ? s.summaryZh : s.summaryEn}`)
    .join("\n");

  const templates = pack.templates
    .map(
      (t) =>
        `【${isZh ? t.nameZh : t.nameEn}】\n${isZh ? t.textZh : t.textEn}`
    )
    .join("\n\n");

  if (isZh) {
    return `
⸻ 场景专业知识库（分析时必须引用并对照，不可忽略）
【本场景必查项 — 每条须在 flags 或 missingClauses 中体现】
${checks}

【相关法律要点（写入 legalBasis 时优先引用）】
${statutes}

【建议措辞范本（suggestion / negotiations.suggested 应贴近此句式，写完整条款句，禁止只写「建议延长」类空话）】
${templates}
`;
  }

  return `
--- Scenario knowledge base (mandatory — cite in legalBasis; use template phrasing)
[Mandatory checks — each must appear in flags or missingClauses]
${checks}

[Legal reference points]
${statutes}

[Clause templates — suggestions must be full redline-ready sentences, not vague advice]
${templates}
`;
}

export function getMandatoryChecks(
  scenarioId: ContractScenarioId,
  locale: "zh" | "en"
): string[] {
  const pack = getScenarioKnowledge(scenarioId);
  return locale === "zh" ? pack.mandatoryChecksZh : pack.mandatoryChecksEn;
}
