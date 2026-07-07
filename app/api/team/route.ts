import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getUserEntitlements } from "@/lib/billing/entitlements";
import { createTeamInvite, listTeamMembers } from "@/lib/db/store";
import { sendMagicLinkEmail } from "@/lib/auth/email";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user, team, isTeamOwner } = await getUserEntitlements(session.sub);
  if (!user?.teamId || !team) {
    return NextResponse.json({ team: null });
  }

  const members = await listTeamMembers(team.id);
  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      isOwner: isTeamOwner,
      members: members.map((m) => ({ email: m.email, role: m.teamRole })),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, locale } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const { user, team, isTeamOwner, pro } = await getUserEntitlements(session.sub);
  if (!pro || !user?.teamId || !team || !isTeamOwner) {
    return NextResponse.json({ error: "Team owner access required" }, { status: 403 });
  }

  await createTeamInvite(team.id, email);
  const loc = locale === "en" ? "en" : "zh";
  const base = process.env.NEXT_PUBLIC_URL || req.nextUrl.origin;
  const { createMagicToken } = await import("@/lib/db/store");
  const token = await createMagicToken(email);
  const link = `${base}/api/auth/verify?token=${token.token}&locale=${loc}`;

  await sendMagicLinkEmail(email, link, loc);
  return NextResponse.json({ ok: true });
}
