import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, getOAuthBaseUrl, verifyOAuthState } from "@/lib/auth/oauth";
import { loginUserRedirect } from "@/lib/auth/login-redirect";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  const localeFallback = "zh";

  if (oauthError || !code || !state) {
    return NextResponse.redirect(
      new URL(`/${localeFallback}?auth=oauth_failed`, req.url)
    );
  }

  const parsed = await verifyOAuthState(state);
  if (!parsed || parsed.provider !== "google") {
    return NextResponse.redirect(new URL(`/${localeFallback}?auth=expired`, req.url));
  }

  try {
    const base = getOAuthBaseUrl(req.nextUrl.origin);
    const redirectUri = `${base}/api/auth/google/callback`;
    const profile = await exchangeGoogleCode(code, redirectUri);
    return loginUserRedirect(profile.email, parsed.locale, req);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      new URL(`/${parsed.locale}?auth=oauth_failed`, req.url)
    );
  }
}
