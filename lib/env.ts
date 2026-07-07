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
