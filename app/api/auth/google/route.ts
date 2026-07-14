import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl, getOAuthBaseUrl, isGoogleOAuthConfigured, signOAuthState } from "@/lib/auth/oauth";
import { localizedPath } from "@/i18n/routing";

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "zh";

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL(localizedPath("/?auth=oauth_unavailable", locale), req.url)
    );
  }

  const base = getOAuthBaseUrl(req.nextUrl.origin);
  const redirectUri = `${base}/api/auth/google/callback`;
  const state = await signOAuthState(locale, "google");
  const url = getGoogleAuthUrl(redirectUri, state);
  return NextResponse.redirect(url);
}
