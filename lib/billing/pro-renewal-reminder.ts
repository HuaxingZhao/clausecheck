import { ensureSchema, getSql, usePostgres } from "@/lib/db/pg";
import { writeAuditLog } from "@/lib/db/audit-log";
import {
  sendProRenewalReminderEmail,
  type RenewalReminderWindow,
} from "@/lib/email/pro-renewal";
import { localizedPath } from "@/i18n/routing";

const MS_DAY = 24 * 60 * 60 * 1000;

export interface ProRenewalCandidate {
  id: string;
  email: string;
  proUntil: string;
}

export function reminderWindowForProUntil(
  proUntilIso: string,
  now: Date = new Date()
): RenewalReminderWindow | null {
  const end = new Date(proUntilIso).getTime();
  const daysLeft = (end - now.getTime()) / MS_DAY;
  if (daysLeft <= 0) return null;
  if (daysLeft <= 1.5) return "1d";
  if (daysLeft <= 7.5) return "7d";
  return null;
}

export function buildRenewUrl(baseUrl: string, locale: "zh" | "en" = "zh"): string {
  const origin = baseUrl.replace(/\/$/, "");
  return `${origin}${localizedPath("/pricing?plan=pro", locale)}`;
}

/** Backfill pro_billing=prepaid for users who already paid via pro_prepaid webhook. */
async function backfillPrepaidBillingFlag(): Promise<number> {
  if (!usePostgres()) return 0;
  try {
    await ensureSchema();
    const rows = await getSql()`
      UPDATE users u
         SET pro_billing = 'prepaid', updated_at = NOW()
       WHERE u.pro_billing IS NULL
         AND u.pro_until IS NOT NULL
         AND u.pro_until > NOW()
         AND EXISTS (
           SELECT 1 FROM public.audit_log a
            WHERE a.user_id = u.id
              AND a.action = 'payment.pro_prepaid'
         )
      RETURNING u.id`;
    return rows.length;
  } catch (err) {
    console.warn("pro_billing backfill skipped:", err);
    return 0;
  }
}

export async function listPrepaidProExpiringSoon(
  withinDays = 7
): Promise<ProRenewalCandidate[]> {
  if (!usePostgres()) return [];
  await ensureSchema();
  await backfillPrepaidBillingFlag();
  const rows = await getSql()`
    SELECT id, email, pro_until
    FROM users
    WHERE pro_billing = 'prepaid'
      AND email IS NOT NULL
      AND email <> ''
      AND pro_until IS NOT NULL
      AND pro_until > NOW()
      AND pro_until <= NOW() + (${withinDays}::text || ' days')::interval
  `;
  return rows
    .filter((r) => typeof r.email === "string" && r.email && r.pro_until)
    .map((r) => ({
      id: r.id as string,
      email: r.email as string,
      proUntil: new Date(r.pro_until as string).toISOString(),
    }));
}

async function alreadySentReminder(
  userId: string,
  proUntilIso: string,
  window: RenewalReminderWindow
): Promise<boolean> {
  if (!usePostgres()) return false;
  try {
    await ensureSchema();
    const rows = await getSql()`
      SELECT 1 FROM public.audit_log
      WHERE user_id = ${userId}
        AND action = 'billing.pro_renewal_reminder'
        AND meta->>'proUntil' = ${proUntilIso}
        AND meta->>'window' = ${window}
      LIMIT 1`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function runProRenewalReminders(opts?: {
  baseUrl?: string;
  now?: Date;
}): Promise<{
  candidates: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const now = opts?.now ?? new Date();
  const baseUrl =
    opts?.baseUrl ||
    process.env.NEXT_PUBLIC_URL?.replace(/\/$/, "") ||
    "https://www.clausecheck.cc";

  const candidates = await listPrepaidProExpiringSoon(7);
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of candidates) {
    const window = reminderWindowForProUntil(user.proUntil, now);
    if (!window) {
      skipped += 1;
      continue;
    }
    if (await alreadySentReminder(user.id, user.proUntil, window)) {
      skipped += 1;
      continue;
    }

    // CNY prepaid path — default Chinese; include pricing deep-link.
    const locale: "zh" | "en" = "zh";
    const renewUrl = buildRenewUrl(baseUrl, locale);

    try {
      const result = await sendProRenewalReminderEmail({
        to: user.email,
        locale,
        proUntilIso: user.proUntil,
        renewUrl,
        window,
      });
      if (!result.delivered) {
        skipped += 1;
        continue;
      }
      await writeAuditLog({
        userId: user.id,
        action: "billing.pro_renewal_reminder",
        meta: {
          proUntil: user.proUntil,
          window,
          email: user.email,
        },
      });
      sent += 1;
    } catch (err) {
      console.error("pro renewal reminder failed:", user.id, err);
      errors += 1;
    }
  }

  return { candidates: candidates.length, sent, skipped, errors };
}
