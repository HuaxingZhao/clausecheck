import { NextRequest, NextResponse } from "next/server";
import { consumeMagicToken, findUserByEmail, upsertUser } from "@/lib/db/store";
import { loginUserRedirect } from "@/lib/auth/login-redirect";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}?auth=invalid`, req.url));
  }

  const email = await consumeMagicToken(token);
  if (!email) {
    return NextResponse.redirect(new URL(`/${locale}?auth=expired`, req.url));
  }

  let user = await findUserByEmail(email);
  if (!user) {
    user = await upsertUser(email, {});
  }

  if (!user.email) {
    return NextResponse.redirect(new URL(`/${locale}?auth=invalid`, req.url));
  }

  return loginUserRedirect(user.email, locale, req);
}
