/** Production environment guards — fail closed when misconfigured. */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

const DEV_AUTH_SECRET = "dev-only-change-me-in-production";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (isProduction()) {
    if (!secret || secret === DEV_AUTH_SECRET) {
      throw new Error("AUTH_SECRET must be set to a strong random value in production");
    }
    return secret;
  }
  return secret || DEV_AUTH_SECRET;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (isProduction() && !secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required in production");
  }
  return secret || "";
}

export function assertDatabaseConfigured(): void {
  if (isProduction() && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production");
  }
}

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (isProduction() && !key) {
    throw new Error("RESEND_API_KEY is required in production to send login emails");
  }
  return key || "";
}

/**
 * Resend From header. Prefer EMAIL_FROM; also accept legacy Email_From
 * (mistyped on some Vercel projects — Node env keys are case-sensitive).
 */
export function getEmailFrom(): string {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    process.env.Email_From?.trim() ||
    "";
  return raw || "ClauseCheck <onboarding@resend.dev>";
}

/** True when From is sandbox/placeholder and will not deliver to arbitrary inboxes. */
export function isEmailFromUnreliable(from: string = getEmailFrom()): boolean {
  const lower = from.toLowerCase();
  return (
    lower.includes("onboarding@resend.dev") ||
    lower.includes("yourdomain.com") ||
    lower.includes("example.com")
  );
}
