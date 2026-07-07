import { NextRequest, NextResponse } from "next/server";
import { exchangeAppleCode } from "@/lib/auth/apple";
import { getOAuthBaseUrl, verifyOAuthState } from "@/lib/auth/oauth";
import { loginUserRedirect } from "@/lib/auth/login-redirect";

export async function POST(req: NextRequest) {
  const localeFallback = "zh";

  try {
    const formData = await req.formData();
    const code = formData.get("code")?.toString();
    const state = formData.get("state")?.toString();
    const oauthError = formData.get("error")?.toString();

    if (oauthError || !code || !state) {
      return NextResponse.redirect(
        new URL(`/${localeFallback}?auth=oauth_failed`, req.url)
      );
    }

    const parsed = await verifyOAuthState(state);
    if (!parsed || parsed.provider !== "apple") {
      return NextResponse.redirect(new URL(`/${localeFallback}?auth=expired`, req.url));
    }

    const base = getOAuthBaseUrl(req.nextUrl.origin);
    const redirectUri = `${base}/api/auth/apple/callback`;
    const profile = await exchangeAppleCode(code, redirectUri);
    return loginUserRedirect(profile.email, parsed.locale, req);
  } catch (err) {
    console.error("Apple OAuth callback error:", err);
    return NextResponse.redirect(new URL(`/${localeFallback}?auth=oauth_failed`, req.url));
  }
}
