import type { ReportLocale } from "@/lib/pdf-export";
import { suggestionsFilenames } from "@/lib/contract-export";
import { sendResendEmail } from "@/lib/email/resend";

export async function sendSuggestionsEmail(input: {
  to: string;
  locale: ReportLocale;
  pdfBytes: Uint8Array;
  docxBytes: Uint8Array;
}): Promise<{ delivered: boolean }> {
  const { to, locale, pdfBytes, docxBytes } = input;
  const names = suggestionsFilenames(locale);

  const subject =
    locale === "zh"
      ? "您的 ClauseCheck 合同修订建议清单（PDF + Word）"
      : "Your ClauseCheck contract revision suggestions (PDF + Word)";

  const html =
    locale === "zh"
      ? `<p>这是您选定的合同修订建议清单。</p>
         <p>每条建议以红线形式标注：<span style="color:#b91c1c;text-decoration:line-through;">删除的原文</span> 与 <span style="color:#15803d;">建议新增的内容</span>。</p>
         <p>附件包含：</p>
         <ul>
           <li><strong>PDF</strong> — 便于阅读与存档</li>
           <li><strong>Word (.docx)</strong> — 可在 Word / WPS 中继续编辑</li>
         </ul>
         <p>本清单由 AI 生成，仅供参考，不构成法律意见。</p>`
      : `<p>Here is your selected list of contract revision suggestions.</p>
         <p>Each suggestion is shown as a redline: <span style="color:#b91c1c;text-decoration:line-through;">removed text</span> and <span style="color:#15803d;">added text</span>.</p>
         <p>Attachments:</p>
         <ul>
           <li><strong>PDF</strong> — for reading and archiving</li>
           <li><strong>Word (.docx)</strong> — edit further in Word or Google Docs</li>
         </ul>
         <p>AI-generated for reference only — not legal advice.</p>`;

  return sendResendEmail({
    to,
    purpose: "suggestions-email",
    subject,
    html,
    attachments: [
      { filename: names.pdf, content: Buffer.from(pdfBytes).toString("base64") },
      { filename: names.docx, content: Buffer.from(docxBytes).toString("base64") },
    ],
  });
}
