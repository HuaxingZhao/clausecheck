import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, getOAuthBaseUrl, isGoogleOAuthConfigured, signOAuthState } from "@/lib/auth/oauth";

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(new URL(`/${locale}?auth=oauth_unavailable`, req.url));
  }

  const base = getOAuthBaseUrl(req.nextUrl.origin);
  const redirectUri = `${base}/api/auth/google/callback`;
  const state = await signOAuthState(locale, "google");
  const url = getGoogleAuthUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
