import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import {
  reviseContract,
  buildAcceptedRevisions,
  getDemoReviseResult,
} from "@/lib/revise";
import type { ScanResult } from "@/lib/types";

export const maxDuration = 90;

const PRO_MAX_CHARS = 80000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      contractText,
      result,
      locale: rawLocale,
      acceptedFlags = [],
      acceptedNegotiations = [],
      acceptedMissingClauses = [],
      originalFileBase64,
      originalFileType,
    } = body as {
      contractText?: string;
      result?: ScanResult;
      locale?: string;
      acceptedFlags?: number[];
      acceptedNegotiations?: number[];
      acceptedMissingClauses?: number[];
      originalFileBase64?: string;
      originalFileType?: "pdf" | "docx";
    };

    const locale = rawLocale === "en" ? "en" : "zh";

    if (!contractText || contractText.trim().length < 50) {
      const msg =
        locale === "en"
          ? "Original contract text is required. Re-scan the contract to enable revision."
          : "缺少原始合同文本，请重新扫描合同以启用修订功能。";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!result?.flags?.length) {
      return NextResponse.json(
        { error: locale === "en" ? "Scan result is required." : "缺少扫描结果。" },
        { status: 400 }
      );
    }

    const session = await getSessionFromRequest(req);
    const headerTier = req.headers.get("x-user-tier");
    const tier = await resolveTierForRequest(session?.sub ?? null, headerTier);
    const isPro = tier === "pro" || tier === "pay_per_use";

    if (!isPro) {
      const msg =
        locale === "en"
          ? "Contract revision is a Pro feature. Upgrade to generate a revised contract."
          : "合同修订为专业版功能，请升级后生成修订版合同。";
      return NextResponse.json({ error: msg, code: "PRO_REQUIRED" }, { status: 403 });
    }

    const acceptedRevisions = buildAcceptedRevisions(result, {
      flags: acceptedFlags,
      negotiations: acceptedNegotiations,
      missingClauses: acceptedMissingClauses,
    });

    if (acceptedRevisions.length === 0) {
      const msg =
        locale === "en"
          ? "Select at least one suggestion to apply."
          : "请至少选择一项建议进行应用。";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      return NextResponse.json(
        getDemoReviseResult(contractText, acceptedRevisions, locale)
      );
    }

    const reviseResult = await reviseContract(contractText, acceptedRevisions, apiKey, {
      locale,
      maxChars: PRO_MAX_CHARS,
    });

    // Persist to revision history for signed-in Pro users (non-blocking).
    let revisionId: string | null = null;
    if (session?.sub) {
      try {
        const { saveRevision } = await import("@/lib/db/store");
        const title =
          (result.contractType && String(result.contractType)) ||
          (locale === "en" ? "Revised contract" : "修订版合同");
        const saved = await saveRevision({
          userId: session.sub,
          title,
          locale,
          originalText: contractText,
          revisedContract: reviseResult.revisedContract,
          changes: reviseResult.changes,
          originalFile: originalFileBase64 ?? null,
          originalFileType: originalFileType ?? null,
        });
        revisionId = saved.id;
      } catch (e) {
        console.error("saveRevision failed:", e);
      }
    }

    return NextResponse.json({ ...reviseResult, revisionId });
  } catch (err: unknown) {
    console.error("revise error:", err);
    const message = err instanceof Error ? err.message : "Revision failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
