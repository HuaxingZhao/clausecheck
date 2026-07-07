import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { resolveTierForRequest } from "@/lib/billing/entitlements";
import { generateRevisionWorkbookDocx } from "@/lib/revision-workbook-docx";
import type { ContractChange } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    const tier = await resolveTierForRequest(session?.sub ?? null);
    const isPro = tier === "pro" || tier === "pay_per_use";

    const body = await req.json();
    const locale = body.locale === "en" ? "en" : "zh";
    const contractText = String(body.contractText ?? "").trim();
    const fileName = body.fileName ? String(body.fileName) : null;
    const changes: ContractChange[] = Array.isArray(body.changes) ? body.changes : [];

    if (!isPro) {
      return NextResponse.json(
        {
          error:
            locale === "en"
              ? "Revision workbook export is a Pro feature."
              : "下载修订对照稿为专业版功能。",
          code: "PRO_REQUIRED",
        },
        { status: 403 }
      );
    }

    if (!contractText) {
      return NextResponse.json(
        { error: locale === "en" ? "Contract text is required." : "缺少合同正文。" },
        { status: 400 }
      );
    }

    if (!changes.length) {
      return NextResponse.json(
        { error: locale === "en" ? "No accepted changes." : "请先勾选要采纳的建议。" },
        { status: 400 }
      );
    }

    const { bytes, appliedCount } = await generateRevisionWorkbookDocx({
      contractText,
      changes,
      locale,
      fileName,
    });

    const filename =
      locale === "zh" ? "ClauseCheck-修订对照稿.docx" : "ClauseCheck-Revision-Workbook.docx";

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "X-Applied-Count": String(appliedCount),
      },
    });
  } catch (err: unknown) {
    console.error("review/export error:", err);
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
