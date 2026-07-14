/**
 * Shared Resend send helper — all product emails should go through here
 * so unreliable EMAIL_FROM is rejected consistently in production.
 */
import { getEmailFrom, getResendApiKey, isEmailFromUnreliable, isProduction } from "@/lib/env";

export interface ResendAttachment {
  filename: string;
  content: string; // base64
}

export async function sendResendEmail(opts: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: ResendAttachment[];
  replyTo?: string;
  purpose: string;
  /** When false, skip send in prod if From is unreliable (return false). Default: throw. */
  softFailUnreliableFrom?: boolean;
}): Promise<{ delivered: boolean }> {
  const apiKey = getResendApiKey();
  const from = getEmailFrom();
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];

  if (!apiKey) {
    if (isProduction()) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.log(`\n--- ${opts.purpose} (dev — set RESEND_API_KEY to send email) ---`);
    console.log(`To: ${to.join(", ")}`);
    console.log(`Subject: ${opts.subject}\n`);
    return { delivered: false };
  }

  if (isEmailFromUnreliable(from)) {
    const msg =
      "EMAIL_FROM is missing or still a placeholder. Set EMAIL_FROM to a Resend-verified domain sender (e.g. ClauseCheck <noreply@clausecheck.cc>).";
    if (isProduction() && !opts.softFailUnreliableFrom) {
      throw new Error(msg);
    }
    console.error(`[${opts.purpose}] skip send:`, msg, { from });
    return { delivered: false };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      reply_to: opts.replyTo,
      attachments: opts.attachments,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend ${opts.purpose} error:`, err, { from });
    throw new Error(`Email send failed: ${err}`);
  }

  return { delivered: true };
}
