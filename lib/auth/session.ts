import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getAuthSecret } from "../env";
import { findUserById } from "@/lib/db/store";

export const SESSION_COOKIE = "cc_session";
const SESSION_DAYS = 30;

/** Session JWT expiry does not purge contract rows — see /api/cron/purge-contract-data. */

function getSecret(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export interface SessionPayload {
  sub: string;
  /** Empty string for phone-only accounts. */
  email: string;
  phone?: string;
  /** Must match users.session_version after password reset. */
  sessionVersion?: number;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const sessionVersion = payload.sessionVersion ?? 0;
  return new SignJWT({
    email: payload.email || "",
    sv: sessionVersion,
    ...(payload.phone ? { phone: payload.phone } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    if (typeof sub !== "string") return null;
    const email = typeof payload.email === "string" ? payload.email : "";
    const phone = typeof payload.phone === "string" ? payload.phone : undefined;
    const sessionVersion =
      typeof payload.sv === "number"
        ? payload.sv
        : typeof payload.sv === "string"
          ? Number(payload.sv) || 0
          : 0;
    return { sub, email, phone, sessionVersion };
  } catch {
    return null;
  }
}

/** Verify JWT and reject tokens issued before a password reset (session_version bump). */
export async function verifySessionTokenLive(token: string): Promise<SessionPayload | null> {
  const session = await verifySessionToken(token);
  if (!session) return null;
  try {
    const user = await findUserById(session.sub);
    if (!user) return null;
    if ((session.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) return null;
    return session;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_DAYS * 86400) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionTokenLive(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionTokenLive(token);
}
