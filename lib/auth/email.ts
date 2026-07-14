import { getEmailFrom, getResendApiKey, isEmailFromUnreliable, isProduction } from "../env";

async function sendViaResend(opts: {
  email: string;
  subject: string;
  html: string;
  purpose: "magic-link" | "password-reset";
}): Promise<void> {
  const apiKey = getResendApiKey();
  const from = getEmailFrom();

  if (!apiKey) {
    if (isProduction()) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    console.log(`\n--- ${opts.purpose} (dev — set RESEND_API_KEY to send email) ---`);
    console.log(`To: ${opts.email}`);
    console.log(`Subject: ${opts.subject}\n`);
    return;
  }

  if (isProduction() && isEmailFromUnreliable(from)) {
    throw new Error(
      "EMAIL_FROM is missing or still a placeholder. Set EMAIL_FROM to a Resend-verified domain sender (e.g. ClauseCheck <noreply@clausecheck.cc>). Note: Vercel key must be EMAIL_FROM, not Email_From."
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.email],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend ${opts.purpose} error:`, err, { from });
    if (from.includes("resend.dev")) {
      console.error(
        "Resend sandbox: onboarding@resend.dev only delivers to your Resend account email. Use a verified custom domain in EMAIL_FROM for production."
      );
    }
    throw new Error(`Email send failed: ${err}`);
  }
}

export async function sendMagicLinkEmail(
  email: string,
  link: string,
  locale: "zh" | "en" = "en"
): Promise<void> {
  const isZh = locale === "zh";
  await sendViaResend({
    email,
    purpose: "magic-link",
    subject: isZh ? "登录 ClauseCheck" : "Sign in to ClauseCheck",
    html: isZh
      ? `
        <p>请点击下方链接登录 ClauseCheck，查看已保存的报告与专业版功能：</p>
        <p><a href="${link}">${link}</a></p>
        <p>链接 30 分钟内有效。如非本人操作，请忽略此邮件。</p>
      `
      : `
        <p>Click the link below to sign in to ClauseCheck and access your saved reports:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
      `,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  link: string,
  locale: "zh" | "en" = "en"
): Promise<void> {
  const isZh = locale === "zh";
  await sendViaResend({
    email,
    purpose: "password-reset",
    subject: isZh ? "重置 ClauseCheck 密码" : "Reset your ClauseCheck password",
    html: isZh
      ? `
        <p>请点击下方链接重置 ClauseCheck 密码：</p>
        <p><a href="${link}">${link}</a></p>
        <p>链接 30 分钟内有效。如非本人操作，请忽略此邮件。</p>
      `
      : `
        <p>Click the link below to reset your ClauseCheck password:</p>
        <p><a href="${link}">${link}</a></p>
        <p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
      `,
  });
}
