import OpenAI from "openai";
import {
  annotateScanConfidence,
  computeQualityStats,
  type AnalysisQualityStats,
} from "./confidence";
import { getMandatoryChecks } from "./scenario-rag";
import { rewriteAdvisorySuggestions, countAdvisoryItems } from "./rewrite-suggestions";
import { snapScanResultToSource } from "./snap-scan-quotes";
import type { ContractScenarioId } from "./contract-scenarios";
import type { ScanResult } from "./types";

export interface PipelineOptions {
  deep: boolean;
  locale: "zh" | "en";
  scenarioId: ContractScenarioId;
}

/** 轻量交叉校验：补漏场景必查项、修正明显问题 */
async function runCriticPass(
  openai: OpenAI,
  contractText: string,
  result: ScanResult,
  opts: PipelineOptions
): Promise<ScanResult> {
  const mandatory = getMandatoryChecks(opts.scenarioId, opts.locale);
  if (!mandatory.length && opts.scenarioId === "general") return result;

  const mandatoryList = mandatory.map((m, i) => `${i + 1}. ${m}`).join("\n");
  const summary = JSON.stringify({
    flags: result.flags.slice(0, 12).map((f) => ({
      text: f.text,
      quote: f.quote,
      level: f.level,
      confidence: f.confidence,
    })),
    signingRecommendation: result.signingRecommendation,
    missingClauses: result.missingClauses?.map((m) => m.name),
  });

  const system =
    opts.locale === "zh"
      ? `你是合同审查质检员。对照「场景必查项」检查初版分析是否遗漏重大风险。
只输出 JSON：{ "addFlags": [...最多3条新增flag，结构与初版相同，必须有quote], "refineNotes": "80字以上说明补漏或校验结论", "signingRecommendation": "可选修正" }
若无遗漏：addFlags 为空数组。quote 必须从合同原文复制。`
      : `QA reviewer for contract scans. Check mandatory scenario items.
Output JSON: { "addFlags": [...max 3 new flags with quotes], "refineNotes": "80+ chars", "signingRecommendation": "optional fix" }`;

  const user =
    opts.locale === "zh"
      ? `场景必查项：\n${mandatoryList}\n\n初版分析摘要：\n${summary}\n\n合同节选（前6000字）：\n${contractText.slice(0, 6000)}`
      : `Mandatory checks:\n${mandatoryList}\n\nFirst pass summary:\n${summary}\n\nContract excerpt:\n${contractText.slice(0, 6000)}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.15,
      max_tokens: 2200,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });

    const raw = res.choices[0]?.message?.content;
    if (!raw) return result;

    const patch = JSON.parse(raw) as {
      addFlags?: ScanResult["flags"];
      refineNotes?: string;
      signingRecommendation?: ScanResult["signingRecommendation"];
    };

    const addFlags = Array.isArray(patch.addFlags) ? patch.addFlags : [];
    const merged: ScanResult = {
      ...result,
      flags: [...result.flags, ...addFlags.filter((f) => f?.text?.trim())],
      refineNotes: patch.refineNotes || result.refineNotes,
      signingRecommendation: patch.signingRecommendation || result.signingRecommendation,
    };
    return merged;
  } catch (err) {
    console.error("runCriticPass error:", err);
    return result;
  }
}

/**
 * 分析管线 v2：对齐原文 → 交叉校验 → 一次改写 → 置信度评分
 * （先 critic 再单次 rewrite，与原先双次 rewrite 的最终质量等价）
 */
export async function runAnalysisPipeline(
  openai: OpenAI,
  contractText: string,
  result: ScanResult,
  opts: PipelineOptions
): Promise<{ result: ScanResult; qualityStats: AnalysisQualityStats }> {
  let current = snapScanResultToSource(contractText, result);

  const runCritic = opts.deep || opts.scenarioId !== "general";
  if (runCritic) {
    current = await runCriticPass(openai, contractText, current, opts);
    current = snapScanResultToSource(contractText, current);
  }

  if (countAdvisoryItems(current) > 0) {
    current = await rewriteAdvisorySuggestions(openai, contractText, current, opts.locale);
    current = snapScanResultToSource(contractText, current);
  }

  current = annotateScanConfidence(current, contractText);
  const qualityStats = computeQualityStats(current);
  current.qualityStats = qualityStats;

  return { result: current, qualityStats };
}

/** Whether a second refine pass adds meaningful work (critic and/or rewrite). */
export function pipelineRefineNeeded(
  result: ScanResult,
  opts: PipelineOptions
): boolean {
  if (opts.deep || opts.scenarioId !== "general") return true;
  return countAdvisoryItems(result) > 0;
}
