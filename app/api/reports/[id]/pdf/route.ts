import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getReportForUser } from "@/lib/db/store";
import { isProUser, getUserEntitlements } from "@/lib/billing/entitlements";
import { generateReportPdf } from "@/lib/pdf-export";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = await getUserEntitlements(session.sub);
  if (!user || !(await isProUser(user))) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const report = await getReportForUser(session.sub, params.id);
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await generateReportPdf(report.result, report.locale);
  const asciiFilename = "ClauseCheck-Risk-Report.pdf";
  const utf8Filename =
    report.locale === "zh" ? "ClauseCheck-合同风险报告.pdf" : "ClauseCheck-Risk-Report.pdf";

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(utf8Filename)}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
