import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const SESSION_COOKIE_NAME = "cc_session";

function base64Url(data: string | Buffer): string {
  const buf = typeof data === "string" ? Buffer.from(data, "utf8") : data;
  return buf.toString("base64url");
}

function signHs256Jwt(
  payload: Record<string, unknown>,
  secret: string
): string {
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64Url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${sig}`;
}

/** 解析 Cookie 头：支持 `cc_session=…` 或裸 token */
export function normalizeSessionCookie(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("=")) return trimmed;
  return `${SESSION_COOKIE_NAME}=${trimmed}`;
}

async function loadAuthSecret(): Promise<string | null> {
  if (process.env.AUTH_SECRET?.trim()) {
    return process.env.AUTH_SECRET.trim().replace(/^["']|["']$/g, "");
  }
  const root = process.cwd();
  for (const file of [".env.local", ".env"]) {
    try {
      const content = await readFile(path.join(root, file), "utf8");
      const match = content.match(/^AUTH_SECRET=(.+)$/m);
      if (match?.[1]?.trim()) {
        return match[1].trim().replace(/^["']|["']$/g, "");
      }
    } catch {
      /* optional */
    }
  }
  return null;
}

/**
 * 生产：设置 SMOKE_SESSION_COOKIE（完整 Cookie 或裸 JWT）。
 * 本地：用 AUTH_SECRET 签发测试 JWT（SMOKE_USER_ID 须为 UUID）。
 */
export async function resolveSmokeSessionCookie(): Promise<string | null> {
  const fromEnv = process.env.SMOKE_SESSION_COOKIE?.trim();
  if (fromEnv) return normalizeSessionCookie(fromEnv);

  const secret = await loadAuthSecret();
  if (!secret) return null;

  const userId =
    process.env.SMOKE_USER_ID?.trim() || "00000000-0000-4000-8000-000000000001";
  const email = process.env.SMOKE_USER_EMAIL?.trim() || "smoke-e2e@clausecheck.test";
  const now = Math.floor(Date.now() / 1000);

  const token = signHs256Jwt(
    { email, sub: userId, iat: now, exp: now + 3600 },
    secret
  );

  return `${SESSION_COOKIE_NAME}=${token}`;
}

export function cookieHeader(cookie: string): Record<string, string> {
  return { Cookie: cookie };
}
