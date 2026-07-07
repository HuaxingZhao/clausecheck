import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { upsertUser } from "../db/store";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "./session";

export async function loginUserRedirect(
  email: string,
  locale: string,
  req: NextRequest,
  redirectPath?: string
): Promise<NextResponse> {
  const norm = email.trim().toLowerCase();
  const user = await upsertUser(norm, {});
  const sessionToken = await createSessionToken({ sub: user.id, email: user.email });
  const path = redirectPath || `/${locale}/account?auth=success`;
  const res = NextResponse.redirect(new URL(path, req.url));
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
