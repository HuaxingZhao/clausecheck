import { NextRequest, NextResponse } from "next/server";
import { getAppleAuthUrl, isAppleOAuthConfigured } from "@/lib/auth/apple";
import { getOAuthBaseUrl, signOAuthState } from "@/lib/auth/oauth";

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";

  if (!isAppleOAuthConfigured()) {
    return NextResponse.redirect(new URL(`/${locale}?auth=oauth_unavailable`, req.url));
  }

  const base = getOAuthBaseUrl(req.nextUrl.origin);
  const redirectUri = `${base}/api/auth/apple/callback`;
  const state = await signOAuthState(locale, "apple");
  const url = getAppleAuthUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
