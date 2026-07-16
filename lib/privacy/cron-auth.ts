import type { NextRequest } from "next/server";

/**
 * Authorize Vercel Cron / manual ops calls.
 * Production requires CRON_SECRET; Authorization: Bearer <secret>.
 */
export function authorizeCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Refuse in production when unset — misconfigured cron must not be open.
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Vercel may also send x-vercel-cron: 1 — still require Bearer when secret is set.
  return false;
}
