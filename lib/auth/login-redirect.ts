import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { upsertUser } from "../db/store";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "./session";
import { creditsSystemEnabled } from "@/lib/credits/user-credits";
import { bootstrapNewUserCredits } from "@/lib/invite/codes";
import { localizedPath } from "@/i18n/routing";

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
  const path = redirectPath || localizedPath("/account?auth=success", locale);
  const res = NextResponse.redirect(new URL(path, req.url));
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
