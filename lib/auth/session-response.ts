import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "./session";

export async function jsonWithSession(
  userId: string,
  email: string,
  extra: Record<string, unknown> = {}
): Promise<NextResponse> {
  const token = await createSessionToken({ sub: userId, email });
  const res = NextResponse.json({ ok: true, email, authenticated: true, ...extra });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}
