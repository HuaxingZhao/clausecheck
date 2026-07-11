/**
 * Compliance-rule retrieval for contract review (scenario knowledge RAG).
 * Scores knowledge snippets against contract text — no external vector DB required.
 * Swap the scorer for embeddings later without changing reviewContract callers.
 */

import type { ContractScenarioId } from "@/lib/contract-scenarios";
import {
  getScenarioKnowledge,
  type ClauseTemplate,
  type ScenarioKnowledgePack,
  type StatuteSnippet,
} from "@/lib/scenario-knowledge";
import { formatScenarioKnowledgeForPrompt } from "@/lib/scenario-rag";

export type PromptLocale = "zh" | "en";

export interface RetrievedRule {
  kind: "mandatory_check" | "statute" | "template";
  id: string;
  title: string;
  body: string;
  score: number;
}

export interface RetrieveComplianceRulesResult {
  scenarioId: ContractScenarioId;
  locale: PromptLocale;
  rules: RetrievedRule[];
  /** Prompt-ready block (must-cite knowledge). */
  knowledgeBlock: string;
  /** Always-on mandatory checks (even if score is low). */
  mandatoryChecks: string[];
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

function scoreStatute(
  query: Set<string>,
  s: StatuteSnippet,
  locale: PromptLocale,
  index: number
): RetrievedRule {
  const body = locale === "zh" ? s.summaryZh : s.summaryEn;
  const blob = `${s.title} ${body}`;
  return {
    kind: "statute",
    id: `statute-${index}`,
    title: s.title,
    body,
    score: overlapScore(query, blob) + 0.15, // slight boost: statutes are high value
  };
}

function scoreTemplate(
  query: Set<string>,
  t: ClauseTemplate,
  locale: PromptLocale,
  index: number
): RetrievedRule {
  const name = locale === "zh" ? t.nameZh : t.nameEn;
  const text = locale === "zh" ? t.textZh : t.textEn;
  const blob = `${name} ${text}`;
  return {
    kind: "template",
    id: `template-${index}`,
    title: name,
    body: text,
    score: overlapScore(query, blob),
  };
}

function scoreCheck(
  query: Set<string>,
  check: string,
  index: number
): RetrievedRule {
  return {
    kind: "mandatory_check",
    id: `check-${index}`,
    title: check,
    body: check,
    score: overlapScore(query, check) + 0.5, // mandatory checks always preferred
  };
}

/**
 * Retrieve relevant compliance rules for a contract text + scenario.
 * Always includes the full scenario knowledge block for the LLM (formatScenarioKnowledgeForPrompt),
 * and returns a ranked `rules` list for debugging / tests / future UI.
 */
export function retrieveComplianceRules(
  contractText: string,
  scenarioId: ContractScenarioId,
  locale: PromptLocale = "zh",
  options: { topK?: number } = {}
): RetrieveComplianceRulesResult {
  const topK = options.topK ?? 12;
  const pack: ScenarioKnowledgePack = getScenarioKnowledge(scenarioId);
  const query = new Set(tokenize(contractText.slice(0, 8000)));
  const mandatoryChecks =
    locale === "zh" ? pack.mandatoryChecksZh : pack.mandatoryChecksEn;

  const scored: RetrievedRule[] = [
    ...mandatoryChecks.map((c, i) => scoreCheck(query, c, i)),
    ...pack.statutes.map((s, i) => scoreStatute(query, s, locale, i)),
    ...pack.templates.map((t, i) => scoreTemplate(query, t, locale, i)),
  ];

  scored.sort((a, b) => b.score - a.score);
  const rules = scored.slice(0, topK);

  return {
    scenarioId,
    locale,
    rules,
    knowledgeBlock: formatScenarioKnowledgeForPrompt(scenarioId, locale),
    mandatoryChecks,
  };
}
