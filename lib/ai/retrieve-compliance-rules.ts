/**
 * Compliance-rule retrieval for contract review (scenario knowledge RAG).
 * Keyword-ranked over jurisdiction-tagged chunks — no external vector DB required.
 */

import type { ContractScenarioId } from "@/lib/contract-scenarios";
import { buildKnowledgeChunksForScenario } from "@/lib/rag/knowledge-chunks";
import { filterKnowledgeChunks } from "@/lib/rag/filter-chunks";
import { formatKnowledgeChunksForPrompt } from "@/lib/rag/format-knowledge-prompt";
import type { KnowledgeChunk, KnowledgeJurisdiction } from "@/lib/rag/knowledge-meta";
import { toKnowledgeJurisdictionFilter } from "@/lib/rag/knowledge-meta";

export type PromptLocale = "zh" | "en";

export interface RetrievedRule {
  kind: "mandatory_check" | "statute" | "template";
  id: string;
  title: string;
  body: string;
  score: number;
  jurisdiction?: KnowledgeJurisdiction;
  docType?: string;
}

export interface RetrieveComplianceRulesResult {
  scenarioId: ContractScenarioId;
  locale: PromptLocale;
  rules: RetrievedRule[];
  knowledgeBlock: string;
  mandatoryChecks: string[];
  jurisdictionFilter: KnowledgeJurisdiction | null;
  degraded: boolean;
  excludedCount: number;
}

export interface RetrieveComplianceRulesOptions {
  topK?: number;
  jurisdiction?: string | null;
}

const STOP_ZH = new Set(
  "的了在是和与或及对为有被将从到等其及之中上不无与或若则及".split("")
);

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const en = lower.match(/[a-z0-9]{3,}/g) ?? [];
  const zh = lower.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  return [...en, ...zh.filter((t) => !STOP_ZH.has(t))];
}

function overlapScore(queryTokens: Set<string>, doc: string): number {
  const docTokens = tokenize(doc);
  if (!docTokens.length) return 0;
  let hits = 0;
  for (const t of docTokens) {
    if (queryTokens.has(t)) hits += 1;
  }
  return hits / Math.sqrt(docTokens.length);
}

function scoreChunk(
  query: Set<string>,
  chunk: KnowledgeChunk,
  locale: PromptLocale
): RetrievedRule {
  const body = locale === "zh" ? chunk.bodyZh : chunk.bodyEn;
  const title =
    locale === "zh"
      ? chunk.title
      : chunk.kind === "template"
        ? chunk.bodyEn.split("\n")[0] || chunk.title
        : chunk.title;
  let boost = 0;
  if (chunk.kind === "mandatory_check") boost = 0.5;
  else if (chunk.kind === "statute") boost = 0.15;
  return {
    kind: chunk.kind,
    id: chunk.id,
    title,
    body,
    score: overlapScore(query, chunk.searchText) + boost,
    jurisdiction: chunk.meta.jurisdiction,
    docType: chunk.meta.doc_type,
  };
}

export function retrieveComplianceRules(
  contractText: string,
  scenarioId: ContractScenarioId,
  locale: PromptLocale = "zh",
  options: RetrieveComplianceRulesOptions = {}
): RetrieveComplianceRulesResult {
  const topK = options.topK ?? 12;
  const filter = toKnowledgeJurisdictionFilter(options.jurisdiction);

  if (!filter) {
    console.warn(
      "[rag] retrieveComplianceRules: no jurisdiction filter (auto/omitted) — CN and foreign statutes may mix. Pass jurisdiction for isolation."
    );
  }

  const allChunks = buildKnowledgeChunksForScenario(scenarioId);
  const { kept, excludedCount, degraded } = filterKnowledgeChunks(allChunks, filter);

  if (degraded) {
    console.warn(
      `[rag] retrieveComplianceRules: no chunks for filter=${filter}; degraded to GENERAL only.`
    );
  }

  const query = new Set(tokenize(contractText.slice(0, 8000)));
  const scored = kept.map((c) => scoreChunk(query, c, locale));
  scored.sort((a, b) => b.score - a.score);
  const rules = scored.slice(0, topK);

  const mandatoryChecks = kept
    .filter((c) => c.kind === "mandatory_check")
    .map((c) => (locale === "zh" ? c.bodyZh : c.bodyEn));

  return {
    scenarioId,
    locale,
    rules,
    knowledgeBlock: formatKnowledgeChunksForPrompt(kept, locale),
    mandatoryChecks,
    jurisdictionFilter: filter,
    degraded,
    excludedCount,
  };
}

export { filterKnowledgeChunks };
