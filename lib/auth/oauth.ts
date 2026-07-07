import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "../env";

export type OAuthProvider = "google";

function secret(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export function getOAuthBaseUrl(origin?: string): string {
  return process.env.NEXT_PUBLIC_URL || origin || "http://localhost:3000";
}

export async function signOAuthState(locale: string, provider: OAuthProvider): Promise<string> {
  return new SignJWT({ locale, provider })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(secret());
}

export async function verifyOAuthState(
  state: string
): Promise<{ locale: string; provider: OAuthProvider } | null> {
  try {
    const { payload } = await jwtVerify(state, secret());
    const locale = payload.locale === "en" ? "en" : "zh";
    if (payload.provider !== "google") return null;
    return { locale, provider: "google" };
  } catch {
    return null;
  }
}

export function isGoogleOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID not configured");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{ email: string; name?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) throw new Error("Google token missing access_token");

  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error("Google userinfo failed");

  const user = (await userRes.json()) as { email?: string; name?: string };
  if (!user.email) throw new Error("Google account has no email");
  return { email: user.email.trim().toLowerCase(), name: user.name };
}
