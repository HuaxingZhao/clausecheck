/**
 * Core AI review workflow: retrieve compliance rules → assemble expert prompt → LLM → ScanResult.
 * Backend-only; do not call from client components with secrets.
 */

import OpenAI from "openai";
import { analyzeContractFull, type AnalyzeOptions } from "@/lib/analyze";
import {
  buildExpertSystemPrompt,
  CLAUSE_INDEX_RULES_EN,
  CLAUSE_INDEX_RULES_ZH,
} from "@/lib/ai/expert-system-prompt";
import {
  retrieveComplianceRules,
  type RetrieveComplianceRulesResult,
} from "@/lib/ai/retrieve-compliance-rules";
import {
  DEFAULT_SCENARIO_ID,
  getScenarioPromptOverlay,
  isValidScenarioId,
  type ContractScenarioId,
} from "@/lib/contract-scenarios";
import { buildContractIndex, formatClauseIndexForPrompt } from "@/lib/contract-index";
import type { ScanResult } from "@/lib/types";

export interface ReviewContractOptions {
  locale?: "zh" | "en";
  scenarioId?: ContractScenarioId;
  deep?: boolean;
  maxChars?: number;
  /** When false, skip critic/rewrite pipeline (faster smoke tests). Default true. */
  refine?: boolean;
  apiKey?: string;
}

export interface ReviewContractResult {
  result: ScanResult;
  retrieval: RetrieveComplianceRulesResult;
  meta: {
    model: string;
    scenarioId: ContractScenarioId;
    locale: "zh" | "en";
    charCount: number;
    systemPromptChars: number;
  };
}

function requireApiKey(explicit?: string): string {
  const key = explicit || process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return key.trim();
}

/**
 * Assemble the final system prompt used for review (exported for tests).
 */
export function assembleReviewSystemPrompt(
  contractText: string,
  options: Pick<ReviewContractOptions, "locale" | "scenarioId" | "deep"> = {}
): { systemPrompt: string; retrieval: RetrieveComplianceRulesResult } {
  const locale = options.locale ?? "zh";
  const scenarioId = isValidScenarioId(options.scenarioId ?? DEFAULT_SCENARIO_ID)
    ? (options.scenarioId as ContractScenarioId)
    : DEFAULT_SCENARIO_ID;
  const deep = options.deep ?? false;

  const retrieval = retrieveComplianceRules(contractText, scenarioId, locale);
  const scenarioOverlay = getScenarioPromptOverlay(scenarioId, locale);
  const systemPrompt = buildExpertSystemPrompt({
    locale,
    deep,
    scenarioOverlay,
    knowledgeBlock: retrieval.knowledgeBlock,
  });

  return { systemPrompt, retrieval };
}

/**
 * Primary entry: review a contract with RAG + expert system prompt.
 * Uses the production analysis pipeline so UI/export stay compatible.
 */
export async function reviewContract(
  contractText: string,
  options: ReviewContractOptions = {}
): Promise<ReviewContractResult> {
  const text = contractText?.trim();
  if (!text) {
    throw new Error("contractText is empty");
  }

  const locale = options.locale ?? "zh";
  const scenarioId = isValidScenarioId(options.scenarioId ?? DEFAULT_SCENARIO_ID)
    ? (options.scenarioId as ContractScenarioId)
    : DEFAULT_SCENARIO_ID;
  const deep = options.deep ?? false;
  const maxChars = options.maxChars ?? (deep ? 80000 : 12000);
  const apiKey = requireApiKey(options.apiKey);

  const { systemPrompt, retrieval } = assembleReviewSystemPrompt(text, {
    locale,
    scenarioId,
    deep,
  });

  const analyzeOpts: AnalyzeOptions = {
    locale,
    scenarioId,
    deep,
    maxChars,
  };

  const result =
    options.refine === false
      ? await (
          await import("@/lib/analyze")
        ).analyzeContractFirstPass(text, apiKey, analyzeOpts)
      : await analyzeContractFull(text, apiKey, analyzeOpts);

  return {
    result,
    retrieval,
    meta: {
      model: deep ? "gpt-4o" : "gpt-4o-mini",
      scenarioId,
      locale,
      charCount: Math.min(text.length, maxChars),
      systemPromptChars: systemPrompt.length,
    },
  };
}

/**
 * Low-level dry-run helper: build messages that would be sent to the model
 * (no network). Used by unit tests and `scripts/test-review-contract.ts --dry-run`.
 */
export function buildReviewMessagesPreview(
  contractText: string,
  options: Pick<ReviewContractOptions, "locale" | "scenarioId" | "deep" | "maxChars"> = {}
): {
  system: string;
  user: string;
  retrieval: RetrieveComplianceRulesResult;
  clauseIndexPreview: string;
} {
  const locale = options.locale ?? "zh";
  const maxChars = options.maxChars ?? 12000;
  const truncated = contractText.slice(0, maxChars);
  const { systemPrompt, retrieval } = assembleReviewSystemPrompt(truncated, options);
  const clauseIndex = buildContractIndex(truncated);
  const indexJson = formatClauseIndexForPrompt(clauseIndex, 80, 100);
  const indexRules = locale === "en" ? CLAUSE_INDEX_RULES_EN : CLAUSE_INDEX_RULES_ZH;
  const scenarioLine =
    retrieval.scenarioId !== "general"
      ? locale === "en"
        ? `\nReview scenario: ${retrieval.scenarioId}. Apply scenario-specific expertise.\n`
        : `\n审阅场景：${retrieval.scenarioId}。须按该场景专业标准输出。\n`
      : "";

  const user =
    locale === "en"
      ? `Analyze the following contract. Apply the full review checklist.${scenarioLine}${indexRules}

CLAUSE INDEX:
${indexJson}

CONTRACT TEXT:
---
${truncated}
---`
      : `请分析以下合同，逐项适用审查清单。${scenarioLine}${indexRules}

条款索引 CLAUSE INDEX：
${indexJson}

合同原文：
---
${truncated}
---`;

  return {
    system: systemPrompt,
    user,
    retrieval,
    clauseIndexPreview: indexJson.slice(0, 500),
  };
}

/** Optional direct OpenAI call for isolated experiments (bypasses full pipeline). */
export async function reviewContractRawLlm(
  contractText: string,
  options: ReviewContractOptions = {}
): Promise<{ raw: string; retrieval: RetrieveComplianceRulesResult }> {
  const apiKey = requireApiKey(options.apiKey);
  const deep = options.deep ?? false;
  const preview = buildReviewMessagesPreview(contractText, options);
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: deep ? "gpt-4o" : "gpt-4o-mini",
    temperature: deep ? 0.2 : 0.15,
    max_tokens: deep ? 5500 : 3800,
    messages: [
      { role: "system", content: preview.system },
      { role: "user", content: preview.user },
    ],
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return { raw, retrieval: preview.retrieval };
}
