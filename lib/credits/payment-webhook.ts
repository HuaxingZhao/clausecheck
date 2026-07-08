import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

export const paymentWebhookPayloadSchema = z.object({
  order_id: z.string().uuid(),
  provider_trade_no: z.string().min(1).max(128),
  status: z.enum(["success", "paid"]),
  amount_cents: z.number().int().positive(),
  timestamp: z.number().int().optional(),
});

export type PaymentWebhookPayload = z.infer<typeof paymentWebhookPayloadSchema>;

export function verifyPaymentWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getPaymentWebhookSecret(): string {
  return process.env.PAYMENT_WEBHOOK_SECRET || "";
}
