import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import {
  generateSuggestionReportDocx,
  generateSuggestionsDocx,
  generateSuggestionsPdf,
  suggestionReportFilenames,
  suggestionsFilenames,
} from "@/lib/contract-export";
import { generateSuggestionReportPdf } from "@/lib/pdf-export";
import type { ContractChange } from "@/lib/types";
import type { SuggestionReportItem } from "@/lib/pdf-export";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { format, changes = [], locale: rawLocale, contractText, acceptedIndices } = body;
    const locale = rawLocale === "en" ? "en" : "zh";
    const fmt = format === "docx" ? "docx" : "pdf";

    const session = await getSessionFromRequest(req);
    const tier = await resolveTierForRequest(
      session?.sub ?? null,
      req.headers.get("x-user-tier")
    );
    const isPro = tier === "pro" || tier === "pay_per_use";
    if (!isPro) {
      return NextResponse.json(
        {
          error: locale === "en" ? "Download is a Pro feature." : "下载为专业版功能。",
          code: "PRO_REQUIRED",
        },
        { status: 403 }
      );
    }

    const changeList = Array.isArray(changes) ? (changes as ContractChange[]) : [];
    const acceptedSet = new Set<number>(
      Array.isArray(acceptedIndices) ? acceptedIndices.filter((n: unknown) => typeof n === "number") : []
    );

    const withStatus: SuggestionReportItem[] = changeList.map((c, i) => ({
      ...c,
      accepted: acceptedSet.has(i),
    }));

    const isFullReport = typeof contractText === "string" && contractText.trim().length > 0;
    const names = isFullReport ? suggestionReportFilenames(locale) : suggestionsFilenames(locale);

    if (fmt === "docx") {
      const bytes = isFullReport
        ? await generateSuggestionReportDocx(contractText.trim(), withStatus, locale)
        : await generateSuggestionsDocx(changeList, locale);
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(names.docx)}"`,
        },
      });
    }

    const bytes = isFullReport
      ? await generateSuggestionReportPdf(contractText.trim(), withStatus, locale)
      : await generateSuggestionsPdf(changeList, locale);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(names.pdf)}"`,
      },
    });
  } catch (err: unknown) {
    console.error("suggestions download error:", err);
    const message = err instanceof Error ? err.message : "Download failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
