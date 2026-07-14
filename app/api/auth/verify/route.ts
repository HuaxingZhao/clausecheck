import { NextRequest, NextResponse } from "next/server";
import { consumeMagicToken, findUserByEmail, upsertUser } from "@/lib/db/store";
import { loginUserRedirect } from "@/lib/auth/login-redirect";
import { localizedPath } from "@/i18n/routing";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";

  if (!token) {
    return NextResponse.redirect(new URL(localizedPath("/?auth=invalid", locale), req.url));
  }

  const email = await consumeMagicToken(token, "login");
  if (!email) {
    return NextResponse.redirect(new URL(localizedPath("/?auth=expired", locale), req.url));
  }

  let user = await findUserByEmail(email);
  if (!user) {
    user = await upsertUser(email, {});
  }

  if (!user.email) {
    return NextResponse.redirect(new URL(localizedPath("/?auth=invalid", locale), req.url));
  }

  return loginUserRedirect(user.email, locale, req);
}
