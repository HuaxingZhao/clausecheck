import { NextRequest, NextResponse } from "next/server";
import { generateReportPdf, type ReportLocale } from "@/lib/pdf-export";
import { getDemoResult } from "@/lib/demo";

export async function GET(req: NextRequest) {
  const locale = (req.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh") as ReportLocale;
  const result = getDemoResult(locale);
  const pdfBytes = await generateReportPdf(result, locale);

  const asciiFilename = "ClauseCheck-Sample-Report.pdf";
  const utf8Filename =
    locale === "zh" ? "ClauseCheck-合同样本报告.pdf" : "ClauseCheck-Sample-Report.pdf";

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
