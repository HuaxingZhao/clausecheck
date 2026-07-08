import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

let cachedAdminEmails: Set<string> | null = null;

function loadAdminEmails(): Set<string> {
  if (cachedAdminEmails) return cachedAdminEmails;
  const raw = process.env.ADMIN_EMAILS ?? "";
  cachedAdminEmails = new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
  return cachedAdminEmails;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = loadAdminEmails();
  if (admins.size === 0) return false;
  return admins.has(email.trim().toLowerCase());
}

export interface AdminSession {
  userId: string;
  email: string;
}

export type AdminAuthResult =
  | { ok: true; admin: AdminSession }
  | { ok: false; response: NextResponse };

/** Verify session email is in ADMIN_EMAILS whitelist. */
export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const session = await getSessionFromRequest(req);
  if (!session?.email || !session.sub) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!isAdminEmail(session.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    admin: { userId: session.sub, email: session.email },
  };
}

/** For server components / non-request contexts. */
export async function requireAdminFromCookies(): Promise<AdminSession | null> {
  const { getSessionFromCookies } = await import("@/lib/auth/session");
  const session = await getSessionFromCookies();
  if (!session?.email || !session.sub) return null;
  if (!isAdminEmail(session.email)) return null;
  return { userId: session.sub, email: session.email };
}
