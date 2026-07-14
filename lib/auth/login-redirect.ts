import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { upsertUser } from "../db/store";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "./session";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { bootstrapNewUserCredits } from "@/lib/invite/codes";

export async function loginUserRedirect(
  email: string,
  locale: string,
  req: NextRequest,
  redirectPath?: string
): Promise<NextResponse> {
  const norm = email.trim().toLowerCase();
  const user = await upsertUser(norm, {});
  if (creditsSystemEnabled()) {
    try {
      await bootstrapNewUserCredits(user.id);
    } catch (err) {
      console.error("bootstrapNewUserCredits after OAuth login:", err);
    }
  }
  const sessionToken = await createSessionToken({
    sub: user.id,
    email: user.email ?? "",
  });
  // localePrefix as-needed: default locale (en) omits the /en prefix
  const path =
    redirectPath ||
    (locale === "en" ? "/account?auth=success" : `/${locale}/account?auth=success`);
  const res = NextResponse.redirect(new URL(path, req.url));
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
