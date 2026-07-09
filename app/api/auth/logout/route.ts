import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/db/audit-log";
import { getClientIp } from "@/lib/invite/request-meta";

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (session?.sub) {
    await writeAuditLog({
      userId: session.sub,
      action: "auth.logout",
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
