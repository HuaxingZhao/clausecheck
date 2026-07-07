import { NextRequest, NextResponse } from "next/server";
import { refineScanResult, pipelineRefineNeeded } from "@/lib/analyze";
import { DEFAULT_SCENARIO_ID, isValidScenarioId } from "@/lib/contract-scenarios";
import { resolveAuthorizedScanTier } from "@/lib/server-quota";
import type { ScanResult } from "@/lib/types";
import type { PipelineOptions } from "@/lib/analysis-pipeline";

export const maxDuration = 60;

const PRO_MAX_CHARS = 80000;
const FREE_MAX_CHARS = 12000;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 503 });
    }

    const body = (await req.json()) as {
      result?: ScanResult;
      contractText?: string;
      locale?: string;
      scenarioId?: string;
    };

    const result = body.result;
    const contractText = body.contractText?.trim();
    if (!result?.flags?.length || !contractText) {
      return NextResponse.json({ error: "Missing result or contract text" }, { status: 400 });
    }

    const locale = body.locale === "en" ? "en" : "zh";
    const rawScenario = String(body.scenarioId ?? result.scenarioId ?? DEFAULT_SCENARIO_ID);
    const scenarioId = isValidScenarioId(rawScenario) ? rawScenario : DEFAULT_SCENARIO_ID;
    const { tier } = await resolveAuthorizedScanTier(req);
    const deep = tier === "pro" || tier === "pay_per_use";
    const maxChars = deep ? PRO_MAX_CHARS : FREE_MAX_CHARS;

    const pipeOpts: PipelineOptions = { deep, locale, scenarioId };
    if (!pipelineRefineNeeded(result, pipeOpts)) {
      return NextResponse.json({ ...result, refineComplete: true });
    }

    const refined = await refineScanResult(contractText, apiKey, result, {
      deep,
      maxChars,
      locale,
      scenarioId,
    });

    return NextResponse.json({ ...refined, refineComplete: true });
  } catch (err: unknown) {
    console.error("scan refine error:", err);
    const message = err instanceof Error ? err.message : "Refine failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
