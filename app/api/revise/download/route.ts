import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import {
  generateSuggestionsDocx,
  generateSuggestionsPdf,
  suggestionsFilenames,
} from "@/lib/contract-export";
import type { ContractChange } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { format, changes = [], locale: rawLocale } = await req.json();
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
    const names = suggestionsFilenames(locale);

    if (fmt === "docx") {
      const bytes = await generateSuggestionsDocx(changeList, locale);
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(names.docx)}"`,
        },
      });
    }

    const bytes = await generateSuggestionsPdf(changeList, locale);
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
