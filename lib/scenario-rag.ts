import type { ContractScenarioId } from "./contract-scenarios";
import { getScenarioKnowledge } from "./scenario-knowledge";
import { buildKnowledgeChunksForScenario } from "./rag/knowledge-chunks";
import { filterKnowledgeChunks } from "./rag/filter-chunks";
import { formatKnowledgeChunksForPrompt } from "./rag/format-knowledge-prompt";
import {
  toKnowledgeJurisdictionFilter,
  type KnowledgeJurisdiction,
} from "./rag/knowledge-meta";

export { formatKnowledgeChunksForPrompt } from "./rag/format-knowledge-prompt";

/** 将场景知识库格式化为 Prompt 片段（法条摘要 + 范本 + 必查项） */
export function formatScenarioKnowledgeForPrompt(
  scenarioId: ContractScenarioId,
  locale: "zh" | "en",
  jurisdiction?: string | null
): string {
  const filter = toKnowledgeJurisdictionFilter(jurisdiction);
  const chunks = buildKnowledgeChunksForScenario(scenarioId);
  const { kept } = filterKnowledgeChunks(chunks, filter);
  return formatKnowledgeChunksForPrompt(kept, locale);
}

export function getMandatoryChecks(
  scenarioId: ContractScenarioId,
  locale: "zh" | "en",
  jurisdiction?: string | null
): string[] {
  const filter = toKnowledgeJurisdictionFilter(jurisdiction);
  if (!filter) {
    const pack = getScenarioKnowledge(scenarioId);
    return locale === "zh" ? pack.mandatoryChecksZh : pack.mandatoryChecksEn;
  }
  const chunks = buildKnowledgeChunksForScenario(scenarioId);
  const { kept } = filterKnowledgeChunks(chunks, filter);
  return kept
    .filter((c) => c.kind === "mandatory_check")
    .map((c) => (locale === "zh" ? c.bodyZh : c.bodyEn));
}

export type { KnowledgeJurisdiction };
