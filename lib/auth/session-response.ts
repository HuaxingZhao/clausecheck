import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "./session";
import { findUserById } from "@/lib/db/store";

export async function jsonWithSession(
  userId: string,
  email: string | null | undefined,
  extra: Record<string, unknown> = {},
  phone?: string | null
): Promise<NextResponse> {
  const emailClaim = email?.trim() || "";
  const user = await findUserById(userId);
  const token = await createSessionToken({
    sub: userId,
    email: emailClaim,
    phone: phone || undefined,
    sessionVersion: user?.sessionVersion ?? 0,
  });
  const res = NextResponse.json({
    ok: true,
    email: emailClaim || null,
    phone: phone || null,
    authenticated: true,
    ...extra,
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
