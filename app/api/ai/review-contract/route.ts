import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildReviewMessagesPreview,
  reviewContract,
} from "@/lib/ai/review-contract";
import { isValidScenarioId } from "@/lib/contract-scenarios";

export const maxDuration = 90;

/**
 * Dev / QA endpoint for the AI review workflow.
 * Gated by REVIEW_TEST_SECRET (header x-review-test-secret).
 * Never expose without the secret — uses OPENAI_API_KEY server-side.
 */
const bodySchema = z.object({
  text: z.string().min(20).max(80000).optional(),
  useFixture: z.boolean().optional(),
  scenarioId: z.string().optional(),
  locale: z.enum(["zh", "en"]).optional(),
  dryRun: z.boolean().optional(),
  refine: z.boolean().optional(),
});

function authorize(req: NextRequest): boolean {
  const expected = process.env.REVIEW_TEST_SECRET?.trim();
  if (!expected) return false;
  const got = req.headers.get("x-review-test-secret")?.trim();
  return Boolean(got && got === expected);
}

export async function POST(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json(
      {
        error: "UNAUTHORIZED",
        message:
          "Set REVIEW_TEST_SECRET and send header x-review-test-secret to use this endpoint.",
      },
      { status: 401 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const locale = parsed.data.locale ?? "zh";
  const scenarioRaw = parsed.data.scenarioId ?? "nda";
  const scenarioId = isValidScenarioId(scenarioRaw) ? scenarioRaw : "nda";

  let text = parsed.data.text;
  if (parsed.data.useFixture || !text) {
    text = readFileSync(
      join(process.cwd(), "fixtures/contracts/nda-risky-zh.txt"),
      "utf8"
    );
  }

  if (parsed.data.dryRun) {
    const preview = buildReviewMessagesPreview(text, { locale, scenarioId });
    return NextResponse.json({
      dryRun: true,
      scenarioId,
      retrieval: preview.retrieval.rules.slice(0, 10),
      systemPromptPreview: preview.system.slice(0, 1200),
      userPromptPreview: preview.user.slice(0, 800),
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY missing on server" },
      { status: 503 }
    );
  }

  try {
    const out = await reviewContract(text, {
      locale,
      scenarioId,
      refine: parsed.data.refine ?? false,
    });
    return NextResponse.json({
      meta: out.meta,
      retrievalTop: out.retrieval.rules.slice(0, 8),
      result: {
        contractType: out.result.contractType,
        scoreNum: out.result.scoreNum,
        scoreText: out.result.scoreText,
        signingRecommendation: out.result.signingRecommendation,
        executiveSummary: out.result.executiveSummary,
        flags: out.result.flags.map((f) => ({
          level: f.level,
          category: f.category,
          text: f.text,
          quote: f.quote,
          legalBasis: f.legalBasis,
          suggestion: f.suggestion,
          impact: f.impact,
          clauseId: f.clauseId,
        })),
        negotiations: out.result.negotiations?.slice(0, 5),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
