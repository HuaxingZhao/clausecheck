import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { buildExpertSystemPrompt, reviewContract } from "@/lib/ai";
import {
  DEFAULT_SCENARIO_ID,
  isValidScenarioId,
  type ContractScenarioId,
} from "@/lib/contract-scenarios";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { checkScanAccess, recordScanUsage } from "@/lib/server-quota";
import {
  assertExperienceWordLimit,
  consumeUserCredit,
  creditsSystemEnabled,
  refundUserCredit,
} from "@/lib/credits/user-credits";
import { sessionUserIdSchema } from "@/lib/credits/scan-form";
import { getDemoResult } from "@/lib/demo";
import {
  estimateDocumentTokens,
  reportApi5xx,
  trackBusinessEvent,
} from "@/lib/monitoring";
import { parseJurisdictionParam } from "@/lib/jurisdiction";

export const maxDuration = 90;

const FREE_MAX_CHARS = 12_000;
const PRO_MAX_CHARS = 80_000;

/**
 * Core text review API — hub between the frontend and the AI review engine.
 *
 * Accepts already-extracted contract text as JSON. File upload remains on
 * `POST /api/scan`. AI logic lives in `@/lib/ai` (`reviewContract` + expert prompt).
 *
 * Body: `{ contractText, locale?, scenarioId?, deep?, refine?, jurisdiction? }`
- `jurisdiction` (optional): `us_california` | `us_new_york` | `england_wales` | `china_prc` | `international_commercial`. When set, overrides AI auto-detect for `detectedJurisdiction`. Omit / `auto` → AI detects from Governing Law.
 */
const bodySchema = z.object({
  contractText: z.string(),
  locale: z.enum(["zh", "en"]).optional().default("zh"),
  scenarioId: z.string().optional(),
  /** Override Pro deep mode; default follows entitlements. */
  deep: z.boolean().optional(),
  /** Default true — full pipeline; set false for faster smoke tests. */
  refine: z.boolean().optional().default(true),
  /** Optional Governing Law override; omit/auto → AI detect. */
  jurisdiction: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let creditConsumed = false;
  let creditUserId: string | null = null;
  const startedAt = Date.now();
  let monitorUserId: string | null = null;
  let monitorTier = "free";
  let monitorCharCount = 0;

  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_JSON", message: "Request body must be JSON" },
        { status: 400 }
      );
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const locale = parsed.data.locale;
    const contractText = parsed.data.contractText.trim();

    // 1) Validate contract text
    if (!contractText) {
      return NextResponse.json(
        {
          error: "EMPTY_CONTRACT",
          message: locale === "en" ? "contractText is required" : "合同文本不能为空",
        },
        { status: 400 }
      );
    }

    if (contractText.length < 50) {
      return NextResponse.json(
        {
          error: "TEXT_TOO_SHORT",
          message:
            locale === "en"
              ? "Not enough contract text to review."
              : "合同文本过短，无法审查。",
        },
        { status: 400 }
      );
    }

    const scenarioRaw = parsed.data.scenarioId ?? DEFAULT_SCENARIO_ID;
    const scenarioId: ContractScenarioId = isValidScenarioId(scenarioRaw)
      ? scenarioRaw
      : DEFAULT_SCENARIO_ID;

    const session = await getSessionFromRequest(req);
    const useCredits = creditsSystemEnabled();

    if (useCredits && !session?.sub) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "请先登录后再审查" },
        { status: 401 }
      );
    }

    let userId: string | null = null;
    if (session?.sub) {
      try {
        userId = sessionUserIdSchema.parse(session.sub);
      } catch (err) {
        if (err instanceof ZodError) {
          return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
        }
        throw err;
      }
    }

    const entitlements =
      userId != null
        ? await getUserEntitlements(userId)
        : { pro: false, tier: "free" as const };
    const tier = entitlements.tier;
    const isPro = entitlements.pro;
    monitorUserId = userId;
    monitorTier = tier;

    let access: Awaited<ReturnType<typeof checkScanAccess>> | null = null;
    if (!useCredits) {
      access = await checkScanAccess(req, locale);
      if (!access.allowed) {
        return NextResponse.json(
          { error: access.error, code: access.code },
          { status: 403 }
        );
      }
    }

    const charCount = contractText.length;
    monitorCharCount = charCount;

    void trackBusinessEvent({
      event: "review_started",
      route: "/api/review",
      user_id: monitorUserId,
      plan_type: monitorTier,
      document_word_count: charCount,
      tokens_used: estimateDocumentTokens(charCount),
    });

    if (useCredits && userId) {
      const wordLimit = await assertExperienceWordLimit(userId, charCount, isPro);
      if (!wordLimit.ok) {
        return NextResponse.json(
          {
            error: "WORD_LIMIT_EXCEEDED",
            limit: wordLimit.limit,
            upgradeUrl: "/pricing",
          },
          { status: 413 }
        );
      }
    }

    if (!useCredits && tier !== "pro" && tier !== "pay_per_use") {
      if (charCount > FREE_MAX_CHARS) {
        return NextResponse.json(
          {
            error:
              locale === "en"
                ? `Free tier supports up to ${FREE_MAX_CHARS.toLocaleString()} characters.`
                : `免费版仅支持 ${FREE_MAX_CHARS.toLocaleString()} 字以内的合同。`,
            code: "TEXT_TOO_LONG",
          },
          { status: 413 }
        );
      }
    }

    if (useCredits && userId) {
      const consumed = await consumeUserCredit(userId);
      if (!consumed) {
        return NextResponse.json(
          {
            error: "INSUFFICIENT_CREDITS",
            message: "额度不足，请升级或购买加油包",
          },
          { status: 402 }
        );
      }
      creditConsumed = true;
      creditUserId = userId;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const demo = getDemoResult(locale);
      return NextResponse.json({
        ...demo,
        contractText: contractText.slice(0, FREE_MAX_CHARS),
        tier,
        meta: { demo: true, scenarioId },
      });
    }

    const deep =
      parsed.data.deep ?? (tier === "pro" || tier === "pay_per_use");
    const maxChars = deep ? PRO_MAX_CHARS : useCredits ? charCount : FREE_MAX_CHARS;
    const jurisdiction = parseJurisdictionParam(parsed.data.jurisdiction);

    // 2) Build expert system prompt (Base + one Jurisdiction Pack).
    // Full RAG (scenario overlay + knowledge) is applied inside reviewContract.
    const systemPrompt = buildExpertSystemPrompt({
      locale,
      deep,
      jurisdiction,
      contractText,
    });

    // 3) Call AI review engine (OPENAI_API_KEY via env inside reviewContract).
    let out;
    try {
      out = await reviewContract(contractText, {
        locale,
        scenarioId,
        deep,
        maxChars,
        refine: parsed.data.refine,
        apiKey,
        jurisdiction,
      });
    } catch (analysisErr) {
      if (creditConsumed && creditUserId) {
        try {
          await refundUserCredit(creditUserId);
        } catch (refundErr) {
          console.error("credit refund failed:", refundErr);
        }
      }
      throw analysisErr;
    }

    if (useCredits && access == null) {
      await recordScanUsage(req, {
        allowed: true,
        tier,
        userId,
        email: session?.email ?? null,
      });
    } else if (access) {
      await recordScanUsage(req, access);
    }

    void trackBusinessEvent({
      event: "review_completed",
      route: "/api/review",
      user_id: monitorUserId,
      plan_type: monitorTier,
      document_word_count: charCount,
      duration_ms: Date.now() - startedAt,
      tokens_used: estimateDocumentTokens(charCount),
    });

    // 4) Return structured ScanResult JSON for the frontend
    return NextResponse.json({
      ...out.result,
      contractText: contractText.slice(0, maxChars),
      tier,
      meta: {
        ...out.meta,
        expertSystemPromptChars: systemPrompt.length,
      },
      retrievalTop: out.retrieval.rules.slice(0, 8).map((r) => ({
        kind: r.kind,
        title: r.title,
        score: r.score,
      })),
    });
  } catch (err: unknown) {
    console.error("review API error:", err);
    reportApi5xx("/api/review", err, {
      user_id: monitorUserId,
      plan_type: monitorTier,
      document_word_count: monitorCharCount || null,
      duration_ms: Date.now() - startedAt,
    });
    const message = err instanceof Error ? err.message : "审查失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
