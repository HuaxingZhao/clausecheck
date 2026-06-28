import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getUserEntitlements, isProUser } from "@/lib/billing/entitlements";
import { generateReportPdf } from "@/lib/pdf-export";
import { sendReportEmail } from "@/lib/email/report";
import type { ScanResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { email, result, locale, reportId } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const session = await getSessionFromRequest(req);
    let scanResult = result as ScanResult | undefined;
    const loc = locale === "en" ? "en" : "zh";

    if (reportId && session) {
      const { user } = await getUserEntitlements(session.sub);
      if (user && (await isProUser(user))) {
        const { getReportForUser } = await import("@/lib/db/store");
        const saved = await getReportForUser(session.sub, reportId);
        if (saved) scanResult = saved.result;
      }
    }

    if (!scanResult || typeof scanResult.scoreNum !== "number") {
      return NextResponse.json({ error: "Invalid scan result" }, { status: 400 });
    }

    const pdfBytes = await generateReportPdf(scanResult, loc);
    const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
    const reportsLink = session
      ? `${base}/${loc}/reports`
      : `${base}/${loc}/sample-report`;

    const { delivered } = await sendReportEmail({
      to: email,
      locale: loc,
      pdfBytes,
      reportsLink,
      scoreNum: scanResult.scoreNum,
    });

    return NextResponse.json({
      ok: true,
      delivered,
      ...(delivered
        ? {}
        : {
            message:
              loc === "zh"
                ? "邮件服务未配置（RESEND_API_KEY）。请下载 PDF 或联系管理员。"
                : "Email service not configured (RESEND_API_KEY). Download the PDF instead.",
          }),
    });
  } catch (err: unknown) {
    console.error("email report error:", err);
    const message = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
