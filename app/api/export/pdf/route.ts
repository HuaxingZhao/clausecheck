import { NextRequest, NextResponse } from "next/server";
import { generateReportPdf, type ReportLocale } from "@/lib/pdf-export";
import type { ScanResult } from "@/lib/types";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = body.result as ScanResult | undefined;
    const locale = (body.locale === "en" ? "en" : "zh") as ReportLocale;

    if (!result || typeof result.scoreNum !== "number") {
      return NextResponse.json({ error: "Invalid scan result" }, { status: 400 });
    }

    const pdfBytes = await generateReportPdf(result, locale);
    const asciiFilename = "ClauseCheck-Risk-Report.pdf";
    const utf8Filename =
      locale === "zh" ? "ClauseCheck-合同风险报告.pdf" : "ClauseCheck-Risk-Report.pdf";

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: unknown) {
    console.error("PDF export error:", err);
    const message = err instanceof Error ? err.message : "PDF export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
