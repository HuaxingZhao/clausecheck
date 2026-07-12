import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { extractTextFromBuffer } from "@/lib/extract-text";
import { analyzeContractFirstPass, pipelineRefineNeeded } from "@/lib/analyze";
import { getDemoResult } from "@/lib/demo";
import { checkScanAccess, recordScanUsage } from "@/lib/server-quota";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import {
  assertExperienceWordLimit,
  consumeUserCredit,
  creditsSystemEnabled,
  getUserCreditBalance,
} from "@/lib/credits/user-credits";
import {
  parseScanFormFields,
  ScanRequestValidationError,
  sessionUserIdSchema,
} from "@/lib/credits/scan-form";
import type { ExtractedText } from "@/lib/types";
import {
  estimateDocumentTokens,
  reportApi5xx,
  trackBusinessEvent,
} from "@/lib/monitoring";

/** Vercel Pro allows up to 300s — AI first-pass can exceed 90s on long CN PDFs. */
export const maxDuration = 300;

const FREE_MAX_CHARS = 12000;
const PRO_MAX_CHARS = 80000;

export async function POST(req: NextRequest) {
  let creditUserId: string | null = null;
  const reviewStartedAt = Date.now();
  let monitorUserId: string | null = null;
  let monitorTier = "free";
  let monitorCharCount = 0;
  let monitorFileSize = 0;

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    let fields;
    try {
      fields = parseScanFormFields(form);
    } catch (err) {
      if (err instanceof ScanRequestValidationError) {
        return NextResponse.json({ error: err.code }, { status: 400 });
      }
      throw err;
    }

    const locale = fields.locale;
    const scenarioId = fields.scenario;
    const jurisdiction = fields.jurisdiction;

    const session = await getSessionFromRequest(req);
    const useCredits = creditsSystemEnabled();

    if (useCredits && !session?.sub) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "请先登录后再扫描" },
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
      userId != null ? await getUserEntitlements(userId) : { pro: false, tier: "free" as const };
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    monitorFileSize = buffer.byteLength;

    let extracted: ExtractedText;
    try {
      extracted = await extractTextFromBuffer(buffer, mimeType);
    } catch (extractErr: unknown) {
      console.error("Text extraction failed:", extractErr);
      const message = extractErr instanceof Error ? extractErr.message : "Unknown error";
      const msg =
        locale === "en"
          ? `Text extraction failed: ${message}. If you uploaded a scanned (image-based) PDF, please convert it to a text-based PDF first.`
          : `文本提取失败：${message}。如果您上传的是扫描件（图片型 PDF），请先转为文字型 PDF 再上传。`;
      return NextResponse.json(
        { error: msg, code: "EXTRACTION_FAILED" },
        { status: 500 }
      );
    }

    if (!extracted.text || extracted.text.trim().length < 50) {
      const msg =
        locale === "en"
          ? "Not enough text extracted from the file. Please ensure it is a text-based PDF or DOCX."
          : "未能从文件中提取到足够文本，请确认文件是文字型 PDF 或 DOCX";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const charCount = extracted.text.length;
    monitorCharCount = charCount;

    void trackBusinessEvent({
      event: "review_started",
      route: "/api/scan",
      user_id: monitorUserId,
      plan_type: monitorTier,
      document_word_count: charCount,
      file_size_bytes: monitorFileSize,
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
        const msg =
          locale === "en"
            ? `Free tier supports up to ${FREE_MAX_CHARS.toLocaleString()} characters. Upgrade to Pro for ${PRO_MAX_CHARS.toLocaleString()} characters.`
            : `免费版仅支持 ${FREE_MAX_CHARS.toLocaleString()} 字以内的合同。升级专业版支持 ${PRO_MAX_CHARS.toLocaleString()} 字。`;
        return NextResponse.json(
          { error: msg, code: "TEXT_TOO_LONG" },
          { status: 413 }
        );
      }
    }

    // Check quota before AI — but consume only after success.
    // Otherwise a Vercel 504 can kill the function after debit with no refund.
    if (useCredits && userId) {
      const balance = await getUserCreditBalance(userId);
      if (balance < 1) {
        return NextResponse.json(
          {
            error: "INSUFFICIENT_QUOTA",
            message: "文档审阅配额不足，请升级或购买加油包",
          },
          { status: 402 }
        );
      }
      creditUserId = userId;
    }

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return NextResponse.json(getDemoResult(locale));
    }

    const deep = tier === "pro" || tier === "pay_per_use";
    // Cap free path — full experience docs (≤20k) still fit; avoid unbounded prompts.
    const maxChars = deep
      ? PRO_MAX_CHARS
      : Math.min(charCount, useCredits ? 20_000 : FREE_MAX_CHARS);

    const result = await analyzeContractFirstPass(extracted.text, apiKey, {
      deep,
      maxChars,
      locale,
      scenarioId,
      jurisdiction,
    });

    if (useCredits && creditUserId) {
      const consumed = await consumeUserCredit(creditUserId);
      if (!consumed) {
        return NextResponse.json(
          {
            error: "INSUFFICIENT_QUOTA",
            message: "文档审阅配额不足，请升级或购买加油包",
          },
          { status: 402 }
        );
      }
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

    const contractText = extracted.text.slice(0, maxChars);
    const refineNeeded = pipelineRefineNeeded(result, {
      deep,
      locale,
      scenarioId: result.scenarioId ?? scenarioId,
    });

    void trackBusinessEvent({
      event: "review_completed",
      route: "/api/scan",
      user_id: monitorUserId,
      plan_type: monitorTier,
      document_word_count: charCount,
      file_size_bytes: monitorFileSize,
      duration_ms: Date.now() - reviewStartedAt,
      tokens_used: estimateDocumentTokens(charCount),
    });

    return NextResponse.json({
      ...result,
      contractText,
      refineNeeded,
      tier,
    });
  } catch (err: unknown) {
    console.error("scan error:", err);
    reportApi5xx("/api/scan", err, {
      user_id: monitorUserId,
      plan_type: monitorTier,
      document_word_count: monitorCharCount || null,
      file_size_bytes: monitorFileSize || null,
      duration_ms: Date.now() - reviewStartedAt,
    });
    const message = err instanceof Error ? err.message : "扫描失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
