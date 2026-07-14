import type { Metadata } from "next";
import { localizedPath } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const c = content[locale as "en" | "zh"] ?? content.zh;
  return {
    title: c.metaTitle,
    description: c.metaDesc,
  };
}

// ── Content data ──

type ListSection = { heading: string; items: string[] };
type Section = { heading: string; body: string | string[] } | { heading: string; items: string[]; footer?: string };

const content: Record<"en" | "zh", {
  back: string;
  title: string;
  updated: string;
  metaTitle: string;
  metaDesc: string;
  sections: Section[];
}> = {
  zh: {
    back: "← 返回首页",
    title: "用户协议",
    updated: "最后更新：2026 年 6 月",
    metaTitle: "用户协议 — ClauseCheck",
    metaDesc: "ClauseCheck 的用户协议，了解使用条款、免责声明和权利义务。",
    sections: [
      {
        heading: "1. 接受条款",
        body: `使用 ClauseCheck（下称「本服务」），即表示你同意本用户协议的所有条款。如果你不同意任何条款，请停止使用本服务。`,
      },
      {
        heading: "2. 服务说明",
        body: [
          "ClauseCheck 提供基于 AI 的合同文本风险分析服务。用户上传合同文件后，AI 自动识别风险条款并生成分析报告。本服务提供以下层级：",
          "免费版：有限次数和字数的基本扫描",
          "专业版：按月订阅，无限扫描 + 深度分析",
          "按次付费：单次购买，获得完整报告",
          "我们保留随时修改、暂停或终止服务的权利，但会提前通知付费用户。",
        ],
      },
      {
        heading: "3. 免责声明（重要）",
        body: [
          "⚠️ ClauseCheck 提供的 AI 分析仅供参考，不构成法律意见。",
          "AI 分析结果可能存在错误、遗漏或不准确之处。",
          "本服务不能替代持牌律师的专业意见。",
          "涉及重大利益（如大额交易、诉讼风险、人身权益）的合同，你应当在签署前咨询持牌律师。",
          "依赖 AI 分析结果做出的任何决定，风险由你自行承担。",
          "我们不对因使用或依赖本服务而产生的任何直接或间接损失承担责任。",
        ],
      },
      {
        heading: "4. 用户义务",
        body: [
          "使用本服务时，你同意：",
          "不上传包含恶意软件、病毒或任何非法内容的文件",
          "不上传包含他人敏感个人信息（身份证号、银行账户等）的合同（如必须上传，请先行脱敏）",
          "不尝试反向工程、破解或滥用本服务的 API 和系统",
          "不为非法目的使用本服务",
          "遵守所有适用的法律法规",
          "违反上述义务可能导致立即终止服务，且不予退款。",
        ],
      },
      {
        heading: "5. 知识产权",
        body: "ClauseCheck 的名称、Logo、网站设计、代码和 AI prompt 设计均为我们的知识产权。你上传的合同内容的所有权和知识产权归你或原始权利人所有。AI 生成的报告内容——分析评分、修改建议、风险标注——你可以在个人使用范围内自由使用，但不得将其作为单独产品转售。",
      },
      {
        heading: "6. 付费与退款",
        body: [
          "专业版按月订阅，费用在每个计费周期开始时收取。你可以随时在 Stripe 后台取消订阅，取消后当前周期内仍可正常使用，不会产生后续费用。我们不支持已使用服务的退款，但如果你在付费后 24 小时内没有使用且要求退款，我们将个案处理。",
          "按次付费一次生效，扫描完成后不支持退款。如果因系统故障导致扫描无法完成，请与我们联系解决。",
        ],
      },
      {
        heading: "7. 服务可用性",
        body: "我们将尽商业上合理的努力保持服务的可用性和稳定性，但不保证服务不中断或无错误。以下情况可能导致服务不可用：定期维护、第三方服务故障（如 OpenAI API 或云基础设施）、不可抗力事件。对于付费用户，如因我们可控原因导致长时间不可用，可按受影响天数顺延订阅期。",
      },
      {
        heading: "8. 隐私与数据",
        body: "我们对数据隐私的承诺详见隐私政策。简而言之：合同文件在分析完成后立即删除，不用于 AI 模型训练，不分享给第三方（除必要的技术服务提供商外）。",
      },
      {
        heading: "9. 责任限制",
        body: [
          "在法律允许的最大范围内，ClauseCheck 及其运营方对以下情况不承担责任：",
          "因使用或无法使用本服务导致的任何间接、附带、特殊或后果性损失",
          "因 AI 分析不准确导致的合同决策损失",
          "因第三方服务（OpenAI、Stripe、Vercel 等）故障导致的服务中断",
          "因用户未咨询专业律师而导致的合同纠纷或法律后果",
          "如果因我们无法免责的重大过失导致你的直接损失，我们的总赔偿责任以你过去 12 个月内向 ClauseCheck 支付的费用总额为上限。",
        ],
      },
      {
        heading: "10. 终止",
        body: "你可以随时停止使用本服务。我们保留因违反本协议、非法使用或其他合理原因终止或暂停你访问本服务的权利。终止后，你使用本服务的权利立即失效。已收取的费用不予退还（法律另有规定的除外）。",
      },
      {
        heading: "11. 协议修改",
        body: "我们可能会不时修改本用户协议。修改后的条款将在网站上发布时生效。重大修改将通过网站通知或邮件通知付费用户。继续使用本服务即表示接受修改后的条款。",
      },
      {
        heading: "12. 联系我们",
        body: ["如果你对用户协议有任何疑问，请通过以下方式联系：", "📧 legal@clausecheck.com"],
      },
    ],
  },
  en: {
    back: "← Back to Home",
    title: "Terms of Service",
    updated: "Last updated: June 2026",
    metaTitle: "Terms of Service — ClauseCheck",
    metaDesc: "ClauseCheck's Terms of Service — understand usage terms, disclaimers, and your rights and obligations.",
    sections: [
      {
        heading: "1. Acceptance of Terms",
        body: 'By using ClauseCheck ("the Service"), you agree to all terms of this Agreement. If you do not agree with any term, please discontinue use of the Service.',
      },
      {
        heading: "2. Service Description",
        body: [
          "ClauseCheck provides AI-powered contract risk analysis. After uploading a contract file, the AI automatically identifies risky clauses and generates an analysis report. The Service offers the following tiers:",
          "Free: limited scans per month with basic assessment",
          "Pro: monthly subscription, unlimited scans + deep analysis",
          "Pay-per-use: one-time purchase for a full report",
          "We reserve the right to modify, suspend, or terminate the Service at any time, but will notify paid users in advance.",
        ],
      },
      {
        heading: "3. Disclaimer (Important)",
        body: [
          "⚠️ The AI analysis provided by ClauseCheck is for reference only and does not constitute legal advice.",
          "AI analysis results may contain errors, omissions, or inaccuracies.",
          "This Service cannot replace the professional opinion of a licensed attorney.",
          "For contracts involving significant interests (such as large transactions, litigation risks, or personal rights), you should consult a licensed attorney before signing.",
          "Any decisions made in reliance on AI analysis results are at your own risk.",
          "We are not liable for any direct or indirect losses arising from the use of or reliance on this Service.",
        ],
      },
      {
        heading: "4. User Obligations",
        body: [
          "By using the Service, you agree to:",
          "Not upload files containing malware, viruses, or any illegal content",
          "Not upload contracts containing others' sensitive personal information (ID numbers, bank accounts, etc.) — if necessary, redact such information first",
          "Not attempt to reverse engineer, hack, or abuse the Service's API and systems",
          "Not use the Service for illegal purposes",
          "Comply with all applicable laws and regulations",
          "Violation of the above obligations may result in immediate termination of service without refund.",
        ],
      },
      {
        heading: "5. Intellectual Property",
        body: "The name ClauseCheck, logo, website design, code, and AI prompt designs are our intellectual property. Ownership and intellectual property rights of the contract content you upload belong to you or the original rights holder. AI-generated report content — analysis scores, revision suggestions, risk annotations — may be freely used by you for personal purposes but may not be resold as a standalone product.",
      },
      {
        heading: "6. Payment and Refunds",
        body: [
          "Pro subscriptions are billed monthly, with fees charged at the start of each billing cycle. You may cancel your subscription at any time through the Stripe dashboard; after cancellation, you retain access for the remainder of the current cycle and will not incur further charges. We do not offer refunds for used services, but if you request a refund within 24 hours of payment without having used the service, we will handle it on a case-by-case basis.",
          "Pay-per-use is effective once and non-refundable after scanning is completed. If a scan cannot be completed due to a system failure, please contact us for resolution.",
        ],
      },
      {
        heading: "7. Service Availability",
        body: "We will make commercially reasonable efforts to maintain the availability and stability of the Service, but do not guarantee uninterrupted or error-free operation. The Service may be unavailable due to: scheduled maintenance, third-party service failures (such as OpenAI API or cloud infrastructure), or force majeure events. For paid users, if extended unavailability is caused by factors within our control, the subscription period may be extended by the number of affected days.",
      },
      {
        heading: "8. Privacy and Data",
        body: "Our commitment to data privacy is detailed in the Privacy Policy. In short: contract files are deleted immediately after analysis, are not used for AI model training, and are not shared with third parties (except necessary technical service providers).",
      },
      {
        heading: "9. Limitation of Liability",
        body: [
          "To the maximum extent permitted by law, ClauseCheck and its operators are not liable for:",
          "Any indirect, incidental, special, or consequential losses arising from the use of or inability to use the Service",
          "Contract decision losses due to inaccurate AI analysis",
          "Service interruptions caused by third-party service failures (OpenAI, Stripe, Vercel, etc.)",
          "Contract disputes or legal consequences arising from users' failure to consult a professional attorney",
          "If direct losses are caused by our gross negligence for which we cannot disclaim liability, our total liability is capped at the total fees you have paid to ClauseCheck in the preceding 12 months.",
        ],
      },
      {
        heading: "10. Termination",
        body: "You may stop using the Service at any time. We reserve the right to terminate or suspend your access to the Service for violations of this Agreement, illegal use, or other reasonable grounds. Upon termination, your right to use the Service immediately ceases. Fees already paid are non-refundable (except as otherwise required by law).",
      },
      {
        heading: "11. Changes to Terms",
        body: "We may modify these Terms of Service from time to time. Modified terms take effect upon posting on the website. Material changes will be notified via the website or by email to paid users. Continued use of the Service constitutes acceptance of the modified terms.",
      },
      {
        heading: "12. Contact Us",
        body: ["If you have any questions about these Terms of Service, please contact us at:", "📧 legal@clausecheck.com"],
      },
    ],
  },
};

// ── Page component ──

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = content[locale as "en" | "zh"] ?? content.zh;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <a href={localizedPath("/", locale)} className="text-sm text-ink-muted hover:text-ink mb-8 inline-block font-sans">
          {c.back}
        </a>
        <h1 className="text-3xl font-bold mb-2">{c.title}</h1>
        <p className="text-sm text-ink-muted mb-10 font-sans">{c.updated}</p>

        <div className="prose prose-sm max-w-none space-y-8">
          {c.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-ink mb-3">{s.heading}</h2>
              {"items" in s ? (
                <>
                  <ul className="list-disc pl-5 space-y-1">
                    {s.items.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                  {s.footer && <p className="mt-2">{s.footer}</p>}
                </>
              ) : Array.isArray(s.body) ? (
                s.body.map((p, j) => <p key={j} className={j > 0 ? "mt-2" : ""}>{p}</p>)
              ) : (
                <p>{s.body}</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
