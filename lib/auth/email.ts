import { sendResendEmail } from "@/lib/email/resend";

export async function sendMagicLinkEmail(
  email: string,
  link: string,
  locale: "zh" | "en" = "en"
): Promise<void> {
  const isZh = locale === "zh";
  await sendResendEmail({
    to: email,
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
  await sendResendEmail({
    to: email,
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
