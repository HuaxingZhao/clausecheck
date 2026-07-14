import { sendMagicLinkEmail } from "@/lib/auth/email";
import { sendResendEmail } from "@/lib/email/resend";

export async function sendReportEmail(input: {
  to: string;
  locale: "zh" | "en";
  pdfBytes: Uint8Array;
  reportsLink: string;
  scoreNum: number;
}): Promise<{ delivered: boolean }> {
  const { to, locale, pdfBytes, reportsLink, scoreNum } = input;

  const subject =
    locale === "zh"
      ? `您的 ClauseCheck 合同风险报告（评分 ${scoreNum}）`
      : `Your ClauseCheck risk report (score ${scoreNum})`;

  const html =
    locale === "zh"
      ? `<p>您的合同风险报告已生成（综合评分 ${scoreNum}/100）。</p>
         <p>PDF 报告见附件。您也可以在 <a href="${reportsLink}">报告历史</a> 中随时查看。</p>
         <p>本报告由 AI 生成，仅供参考，不构成法律意见。</p>`
      : `<p>Your contract risk report is ready (score ${scoreNum}/100).</p>
         <p>The PDF is attached. You can also view it anytime in <a href="${reportsLink}">report history</a>.</p>
         <p>AI-generated for reference only — not legal advice.</p>`;

  const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
  const filename =
    locale === "zh" ? "ClauseCheck-合同风险报告.pdf" : "ClauseCheck-Risk-Report.pdf";

  return sendResendEmail({
    to,
    purpose: "report-email",
    subject,
    html,
    attachments: [{ filename, content: pdfBase64 }],
  });
}

/** Re-export for magic link — keeps email module cohesive */
export { sendMagicLinkEmail };
