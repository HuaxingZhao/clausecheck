import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getReportForUser } from "@/lib/db/store";
import { isProUser, getUserEntitlements } from "@/lib/billing/entitlements";

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

  return NextResponse.json({
    id: report.id,
    title: report.title,
    fileName: report.fileName,
    locale: report.locale,
    scoreNum: report.scoreNum,
    scoreText: report.scoreText,
    result: report.result,
    createdAt: report.createdAt,
  });
}
