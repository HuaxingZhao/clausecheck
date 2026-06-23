import { NextRequest, NextResponse } from "next/server";
import { consumeMagicToken, findUserByEmail } from "@/lib/db/store";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session";

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

  const user = await findUserByEmail(email);
  if (!user) {
    return NextResponse.redirect(new URL(`/${locale}?auth=invalid`, req.url));
  }

  const sessionToken = await createSessionToken({ sub: user.id, email: user.email });
  const res = NextResponse.redirect(new URL(`/${locale}/reports`, req.url));
  res.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions());
  return res;
}
