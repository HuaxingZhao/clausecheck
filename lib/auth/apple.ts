import { SignJWT, importPKCS8, jwtVerify, createRemoteJWKSet } from "jose";

const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

function getApplePrivateKeyPem(): string {
  const raw = process.env.APPLE_PRIVATE_KEY || "";
  return raw.replace(/\\n/g, "\n");
}

export function isAppleOAuthConfigured(): boolean {
  return !!(
    process.env.APPLE_CLIENT_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID &&
    process.env.APPLE_PRIVATE_KEY
  );
}

export function getAppleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new Error("APPLE_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "name email",
    response_mode: "form_post",
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params}`;
}

async function createAppleClientSecret(): Promise<string> {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKeyPem = getApplePrivateKeyPem();

  if (!clientId || !teamId || !keyId || !privateKeyPem) {
    throw new Error("Apple OAuth is not fully configured");
  }

  const privateKey = await importPKCS8(privateKeyPem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

export async function exchangeAppleCode(
  code: string,
  redirectUri: string
): Promise<{ email: string }> {
  const clientId = process.env.APPLE_CLIENT_ID;
  if (!clientId) throw new Error("APPLE_CLIENT_ID not configured");

  const clientSecret = await createAppleClientSecret();

  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Apple token exchange failed: ${err}`);
  }

  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) throw new Error("Apple token missing id_token");

  const { payload } = await jwtVerify(tokens.id_token, APPLE_JWKS, {
    issuer: "https://appleid.apple.com",
    audience: clientId,
  });

  const email = payload.email;
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error(
      "Apple account did not share an email — use email or Google sign-in, or revoke app access in Apple ID settings and try again"
    );
  }

  return { email: email.trim().toLowerCase() };
}
