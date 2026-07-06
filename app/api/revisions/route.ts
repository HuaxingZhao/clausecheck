import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { listRevisionsForUser } from "@/lib/db/store";
import { isProUser, getUserEntitlements } from "@/lib/billing/entitlements";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = await getUserEntitlements(session.sub);
  if (!user || !(await isProUser(user))) {
    return NextResponse.json({ error: "Pro subscription required" }, { status: 403 });
  }

  const revisions = await listRevisionsForUser(session.sub);
  return NextResponse.json({
    revisions: revisions.map((r) => ({
      id: r.id,
      title: r.title,
      locale: r.locale,
      changeCount: r.changes?.length ?? 0,
      createdAt: r.createdAt,
      hasFinalContract: !!(r.originalFile && r.originalFileType),
      finalFileType: r.originalFileType,
    })),
  });
}
