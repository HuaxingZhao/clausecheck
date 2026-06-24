import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { listReportsForUser, saveReport } from "@/lib/db/store";
import { isProUser, getUserEntitlements } from "@/lib/billing/entitlements";
import type { ScanResult } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = await getUserEntitlements(session.sub);
  if (!user || !(await isProUser(user))) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const reports = await listReportsForUser(session.sub);
  return NextResponse.json({
    reports: reports.map((r) => ({
      id: r.id,
      title: r.title,
      fileName: r.fileName,
      locale: r.locale,
      scoreNum: r.scoreNum,
      scoreText: r.scoreText,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = await getUserEntitlements(session.sub);
  if (!user || !(await isProUser(user))) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const body = await req.json();
  const result = body.result as ScanResult | undefined;
  const locale = body.locale === "en" ? "en" : "zh";
  const fileName = typeof body.fileName === "string" ? body.fileName : null;

  if (!result || typeof result.scoreNum !== "number") {
    return NextResponse.json({ error: "Invalid scan result" }, { status: 400 });
  }

  const title =
    result.contractType ||
    (locale === "zh" ? "合同风险报告" : "Contract Risk Report");

  const report = await saveReport({
    userId: session.sub,
    title,
    fileName,
    locale,
    result,
  });

  return NextResponse.json({ id: report.id, createdAt: report.createdAt });
}
