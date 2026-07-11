import OpenAI from "openai";
import { buildContractIndex, formatClauseIndexForPrompt } from "./contract-index";
import {
  type ContractScenarioId,
  DEFAULT_SCENARIO_ID,
  getScenario,
  getScenarioPromptOverlay,
  isValidScenarioId,
} from "./contract-scenarios";
import {
  buildExpertSystemPrompt,
  CLAUSE_INDEX_RULES_EN,
  CLAUSE_INDEX_RULES_ZH,
} from "./ai/expert-system-prompt";
import { retrieveComplianceRules } from "./ai/retrieve-compliance-rules";
import {
  runAnalysisPipeline,
  pipelineRefineNeeded,
  type PipelineOptions,
} from "./analysis-pipeline";
import { annotateScanConfidence, computeQualityStats } from "./confidence";
import { snapScanResultToSource } from "./snap-scan-quotes";
import { buildContractReview } from "./lock-suggestions";
import type {
  ScanResult,
  RiskFlag,
  TimeTerm,
  MissingClause,
  SigningRecommendation,
  NegotiationPoint,
} from "./types";

/* ================================================================== */
/*  Analyze                                                            */
/* ================================================================== */

export interface AnalyzeOptions {
  deep?: boolean;
  maxChars?: number;
  locale?: "zh" | "en";
  scenarioId?: ContractScenarioId;
}

export async function analyzeContract(
  text: string,
  apiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const {
    deep = false,
    maxChars = 12000,
    locale = "zh",
    scenarioId = DEFAULT_SCENARIO_ID,
  } = options;

  const openai = new OpenAI({ apiKey });
  const truncated = text.slice(0, maxChars);
  const scenario = getScenario(scenarioId);
  const scenarioOverlay = getScenarioPromptOverlay(scenario.id, locale);
  const retrieval = retrieveComplianceRules(truncated, scenario.id, locale);
  const knowledgeBlock = retrieval.knowledgeBlock;

  // Step 1 — build clause index from extracted text
  const clauseIndex = buildContractIndex(truncated);
  const indexJson = formatClauseIndexForPrompt(clauseIndex, 80, 100);
  const indexRules = locale === "en" ? CLAUSE_INDEX_RULES_EN : CLAUSE_INDEX_RULES_ZH;

  const systemPrompt = buildExpertSystemPrompt({
    locale,
    deep,
    scenarioOverlay,
    knowledgeBlock,
  });

  const scenarioLine =
    scenario.id !== "general"
      ? locale === "en"
        ? `\nReview scenario: ${scenario.id}. Apply scenario-specific expertise — not generic boilerplate.\n`
        : `\n审阅场景：${scenario.id}。须按该场景专业标准输出，避免泛泛而谈。\n`
      : "";

  const userPrompt =
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

  const firstPass = await openai.chat.completions.create({
    model: deep ? "gpt-4o" : "gpt-4o-mini",
    temperature: deep ? 0.2 : 0.15,
    max_tokens: deep ? 5500 : 3800,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = firstPass.choices[0]?.message?.content;
  if (!raw) {
    throw new Error(locale === "en" ? "AI returned empty response" : "AI 返回为空");
  }

  let parsed = normalize(JSON.parse(raw) as ScanResult, locale);
  parsed.scenarioId = isValidScenarioId(scenarioId) ? scenarioId : DEFAULT_SCENARIO_ID;

  const minFlags = deep ? 8 : 6;
  let flagRetryUsed = false;
  if (parsed.flags.length < minFlags) {
    flagRetryUsed = true;
    const retry = await openai.chat.completions.create({
      model: deep ? "gpt-4o" : "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: deep ? 5500 : 3800,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            locale === "en"
              ? `Previous review returned only ${parsed.flags.length} flags (below the minimum of ${minFlags}). Re-examine the entire contract, find all material risks, and return at least ${minFlags} distinct flags with clauseId, quotes, paste-ready suggestions, and legalBasis. Do not start suggestions with "Suggest". Contract:\n\n---\n${truncated}\n---`
              : `上一次审查结果 flags 数量不足（仅 ${parsed.flags.length} 条，要求不少于 ${minFlags} 条）。请务必重新审视合同，找出所有潜在风险点，确保 flags 不少于 ${minFlags} 条；每条须含 clauseId、quote、可直接粘贴的 suggestion（禁止以「建议」开头）、legalBasis。合同：\n\n---\n${truncated}\n---`,
        },
      ],
      response_format: { type: "json_object" },
    });
    const retryRaw = retry.choices[0]?.message?.content;
    if (retryRaw) {
      const retried = normalize(JSON.parse(retryRaw) as ScanResult, locale);
      if (retried.flags.length >= parsed.flags.length) parsed = retried;
    }
  }

  if (parsed.flags.length === 0) {
    throw new Error(
      locale === "en"
        ? "Analysis returned no risk flags. Please retry."
        : "分析未识别到风险条款，请重试。"
    );
  }

  const finalized = finalizeFirstPass(clauseIndex, truncated, parsed);
  if (flagRetryUsed) {
    (finalized as ScanResult & { _flagRetryUsed?: boolean })._flagRetryUsed = true;
  }
  return finalized;
}

/** Phase 1 — main AI pass + quote snap + review lock (fast path). */
export async function analyzeContractFirstPass(
  text: string,
  apiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  return analyzeContract(text, apiKey, options);
}

/** Phase 2 — critic + rewrite + re-lock (same quality as full synchronous scan). */
export async function refineScanResult(
  contractText: string,
  apiKey: string,
  result: ScanResult,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const {
    deep = false,
    maxChars = 12000,
    locale = "zh",
    scenarioId = DEFAULT_SCENARIO_ID,
  } = options;

  const openai = new OpenAI({ apiKey });
  const truncated = contractText.slice(0, maxChars);
  const clauseIndex = buildContractIndex(truncated);
  const pipeOpts: PipelineOptions = {
    deep,
    locale,
    scenarioId: isValidScenarioId(scenarioId) ? scenarioId : DEFAULT_SCENARIO_ID,
  };

  if (!pipelineRefineNeeded(result, pipeOpts)) {
    return attachContractReview(clauseIndex, result);
  }

  const piped = await runAnalysisPipeline(openai, truncated, result, pipeOpts);
  return attachContractReview(clauseIndex, piped.result);
}

export { pipelineRefineNeeded };

function finalizeFirstPass(
  clauseIndex: ReturnType<typeof buildContractIndex>,
  contractText: string,
  parsed: ScanResult
): ScanResult {
  let current = snapScanResultToSource(contractText, parsed);
  current = annotateScanConfidence(current, contractText);
  current.qualityStats = computeQualityStats(current);
  return attachContractReview(clauseIndex, current);
}

function attachContractReview(
  clauseIndex: ReturnType<typeof buildContractIndex>,
  parsed: ScanResult
): ScanResult {
  const contractReview = buildContractReview(clauseIndex, parsed);
  return { ...parsed, contractReview };
}

/** Full synchronous scan (first pass + refine). */
export async function analyzeContractFull(
  text: string,
  apiKey: string,
  options: AnalyzeOptions = {}
): Promise<ScanResult> {
  const first = await analyzeContractFirstPass(text, apiKey, options);
  return refineScanResult(text, apiKey, first, options);
}

/* ================================================================== */
/*  Normalize                                                          */
/* ================================================================== */

function normalize(parsed: ScanResult, locale: "zh" | "en"): ScanResult {
  parsed.flags = ensureFlagsArray(parsed.flags).map(normalizeFlag).filter((f) => f.text.trim());
  parsed.timeTerms = normalizeTimeTerms(parsed.timeTerms);
  parsed.negotiations = (parsed.negotiations || [])
    .map(normalizeNegotiation)
    .sort((a, b) => a.priority - b.priority);
  parsed.missingClauses = normalizeMissingClauses(parsed.missingClauses);
  parsed.strengths = parsed.strengths || [];
  parsed.actionItems = parsed.actionItems || [];

  if (!parsed.dimensions) {
    parsed.dimensions = {
      fairness: parsed.scoreNum ?? 50,
      compliance: parsed.scoreNum ?? 50,
      financial: parsed.scoreNum ?? 50,
    };
  }

  if (parsed.dimensions && parsed.scoreNum == null) {
    const d = parsed.dimensions;
    parsed.scoreNum = Math.round(d.fairness * 0.35 + d.compliance * 0.25 + d.financial * 0.4);
  }

  parsed.scoreNum = clamp(parsed.scoreNum ?? 50, 0, 100);
  parsed.scoreText = deriveScoreText(parsed.scoreNum, parsed.scoreText, locale);

  parsed.signingRecommendation = normalizeSigningRec(parsed.signingRecommendation);

  parsed.executiveSummary = toTextField(parsed.executiveSummary) || undefined;
  parsed.signingRationale = toTextField(parsed.signingRationale) || undefined;
  parsed.summary = toTextField(parsed.summary) || parsed.summary || "";
  parsed.worstCase = toTextField(parsed.worstCase) || undefined;
  parsed.refineNotes = toTextField(parsed.refineNotes) || undefined;
  parsed.contractType = toTextField(parsed.contractType) || undefined;
  parsed.actionItems = (parsed.actionItems || []).map(toTextField).filter(Boolean);
  parsed.strengths = (parsed.strengths || []).map(toTextField).filter(Boolean);

  if (!parsed.executiveSummary && parsed.summary) {
    parsed.executiveSummary = parsed.summary.split("\n")[0]?.slice(0, 500);
  }

  if (parsed.actionItems.length === 0 && parsed.summary) {
    parsed.actionItems = extractActionItems(parsed.summary);
  }

  return parsed;
}

function normalizeFlag(f: RiskFlag): RiskFlag {
  const raw = f as RiskFlag & { clauseId?: string };
  return {
    icon: f.icon || "⚠️",
    text: toTextField(f.text),
    suggestion: toTextField(f.suggestion),
    level: f.level || "medium",
    category: f.category ? toTextField(f.category) : undefined,
    clauseId: raw.clauseId ? toTextField(raw.clauseId) : undefined,
    quote: f.quote ? toTextField(f.quote) : undefined,
    legalBasis: f.legalBasis ? toTextField(f.legalBasis) : undefined,
    impact: f.impact ? toTextField(f.impact) : undefined,
    confidence: f.confidence,
  };
}

function normalizeNegotiation(n: NegotiationPoint): NegotiationPoint {
  const raw = n as NegotiationPoint & { clauseId?: string };
  return {
    priority: n.priority,
    clause: toTextField(n.clause),
    clauseId: raw.clauseId ? toTextField(raw.clauseId) : undefined,
    quote: n.quote ? toTextField(n.quote) : undefined,
    current: n.current ? toTextField(n.current) : undefined,
    suggested: toTextField(n.suggested),
    reason: toTextField(n.reason),
    confidence: n.confidence,
  };
}

function normalizeTimeTerms(terms?: TimeTerm[]): TimeTerm[] {
  if (!terms?.length) return [];
  return terms.map((t) => {
    const raw = t as TimeTerm & { clause?: string; risk?: string };
    const desc = raw.description || raw.clause || "";
    let risk = raw.risk;
    if (typeof risk === "string" && !["high", "medium", "low"].includes(risk)) {
      risk = "medium";
    }
    return {
      type: raw.type || "deadline",
      description: desc,
      date: raw.date,
      risk: (risk as TimeTerm["risk"]) || "medium",
    };
  });
}

function normalizeMissingClauses(clauses?: MissingClause[]): MissingClause[] {
  if (!clauses?.length) return [];
  return clauses.map((c) => {
    const raw = c as MissingClause & { clause?: string; risk?: string };
    return {
      name: raw.name || raw.clause || "",
      importance: raw.importance || raw.risk || "",
      suggestion: raw.suggestion || "",
    };
  });
}

function normalizeSigningRec(
  rec?: SigningRecommendation | string
): SigningRecommendation | undefined {
  if (!rec) return undefined;
  const s = String(rec).toLowerCase().replace(/[\s-]+/g, "_");
  if (s.includes("do_not") || s.includes("不要") || s.includes("不应")) return "do_not_sign";
  if (s.includes("with_change") || s.includes("修改") || s.includes("变更")) {
    return "sign_with_changes";
  }
  if (s.includes("sign") || s.includes("签署") || s.includes("可以签")) return "sign";
  return undefined;
}

function deriveScoreText(
  score: number,
  _existing: string | undefined,
  _locale: "zh" | "en"
): ScanResult["scoreText"] {
  if (score >= 70) return "高风险";
  if (score >= 40) return "中风险";
  return "低风险";
}

function extractActionItems(summary: string): string[] {
  const lines = summary.split(/\n/).flatMap((line) => {
    const m = line.match(/^\s*(?:\d+[\.\)、]|[-•])\s*(.+)/);
    return m ? [m[1].trim()] : [];
  });
  return lines.slice(0, 5);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function ensureFlagsArray(flags: unknown): RiskFlag[] {
  if (Array.isArray(flags)) return flags as RiskFlag[];
  if (flags && typeof flags === "object") {
    return Object.values(flags as Record<string, RiskFlag>);
  }
  return [];
}

function toTextField(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(toTextField).filter(Boolean).join("\n");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const inner = toTextField(v);
        return inner ? `${k}: ${inner}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return String(value);
}
