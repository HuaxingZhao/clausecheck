import { ensureSchema, getSql, usePostgres } from "./pg";

export type AuditAction =
  | "auth.login"
  | "auth.register"
  | "auth.phone_send"
  | "auth.phone_verify"
  | "auth.logout"
  | "quota.consume"
  | "quota.refund"
  | "quota.sync_subscription"
  | "quota.addon_grant"
  | "payment.subscription_created"
  | "payment.invoice_succeeded"
  | "payment.addon_succeeded"
  | "payment.pro_prepaid"
  | "billing.pro_renewal_reminder";

export async function writeAuditLog(input: {
  userId?: string | null;
  action: AuditAction | string;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  if (!usePostgres()) return;
  try {
    await ensureSchema();
    const db = getSql();
    await db`
      INSERT INTO public.audit_log (user_id, action, meta, ip, user_agent)
      VALUES (
        ${input.userId ?? null},
        ${input.action},
        ${JSON.stringify(input.meta ?? {})}::jsonb,
        ${input.ip ?? null},
        ${input.userAgent ?? null}
      )`;
  } catch (err) {
    console.warn("audit_log write failed:", err);
  }
}
