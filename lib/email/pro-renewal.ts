import { sendResendEmail } from "@/lib/email/resend";

export type RenewalReminderWindow = "7d" | "1d";

export async function sendProRenewalReminderEmail(input: {
  to: string;
  locale: "zh" | "en";
  proUntilIso: string;
  renewUrl: string;
  window: RenewalReminderWindow;
}): Promise<{ delivered: boolean }> {
  const { to, locale, renewUrl, window } = input;
  const proUntil = new Date(input.proUntilIso);
  const dateLabel =
    locale === "zh"
      ? proUntil.toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Shanghai",
        })
      : proUntil.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        });

  const soon = window === "1d";

  const subject =
    locale === "zh"
      ? soon
        ? "ClauseCheck 专业版即将到期（明天）— 续费链接"
        : "ClauseCheck 专业版即将到期 — 续费提醒"
      : soon
        ? "Your ClauseCheck Pro access expires tomorrow — renew"
        : "Your ClauseCheck Pro access is ending soon — renew";

  const html =
    locale === "zh"
      ? `<p>您好，</p>
<p>您的 ClauseCheck <strong>专业版预付</strong>将于 <strong>${dateLabel}</strong> 到期。</p>
<p>预付<strong>不会自动扣款</strong>。若要继续使用，请点击下方链接按季付 / 半年付 / 年付续费（支持微信支付）：</p>
<p><a href="${renewUrl}">${renewUrl}</a></p>
<p>建议选择<strong>季付或半年付</strong>，单次金额更友好。</p>
<p>如有问题请联系 support@clausecheck.cc</p>
<p style="color:#666;font-size:12px">本邮件为服务提醒，不构成法律意见。</p>`
      : `<p>Hi,</p>
<p>Your ClauseCheck <strong>prepaid Pro</strong> access ends on <strong>${dateLabel}</strong>.</p>
<p>There is <strong>no auto-charge</strong>. To continue, open the link below and renew (quarterly / semi-annual / annual — WeChat Pay available for RMB):</p>
<p><a href="${renewUrl}">${renewUrl}</a></p>
<p>Quarterly or semi-annual is usually easier than paying a full year at once.</p>
<p>Questions? support@clausecheck.cc</p>
<p style="color:#666;font-size:12px">Service reminder only — not legal advice.</p>`;

  return sendResendEmail({
    to,
    purpose: "pro-renewal-reminder",
    subject,
    html,
    softFailUnreliableFrom: true,
  });
}
