import type { Metadata } from "next";

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

type Section = { heading: string; body: string | string[] };

const content: Record<"en" | "zh", { back: string; title: string; updated: string; sections: Section[] }> = {
  zh: {
    back: "← 返回首页",
    title: "隐私政策",
    updated: "最后更新：2026 年 6 月",
    metaTitle: "隐私政策 — ClauseCheck",
    metaDesc: "ClauseCheck 的隐私政策，了解我们如何收集、使用和保护你的个人信息。",
    sections: [
      {
        heading: "1. 我们收集哪些信息",
        body: [
          "ClauseCheck 是一个极简工具。你上传的合同文件仅在前端选中后、通过 HTTPS 加密传输至我们的服务器进行 AI 分析，分析完成后立即永久删除。我们不会存储你的合同原文、分析结果摘要或任何可识别的合同内容。",
          "我们可能自动收集以下技术信息：浏览器类型、设备类型、访问时间、来源页面 URL 等，这些信息仅用于改善服务，不直接关联到你的个人身份。",
          "如果你选择订阅专业版或购买按次服务，支付由 Stripe 处理。我们不会存储你的信用卡号或完整支付信息——这些数据直接由 Stripe 加密处理。我们会保留你的邮箱（如有提供）用于发送收据和服务通知。",
        ],
      },
      {
        heading: "2. 信息如何使用",
        body: [
          "我们收集的信息仅用于以下目的：提供合同扫描和风险分析服务；处理支付和订阅管理；改善产品体验和修复 bug；发送与服务相关的通知（如账单提醒、重大更新）；遵守法律法规要求。",
          "我们不会将你的合同内容用于训练 AI 模型。所有 AI 分析均通过 OpenAI API 完成，OpenAI 也不会将 API 调用数据用于模型训练（见 OpenAI API 数据使用政策）。",
        ],
      },
      {
        heading: "3. Cookie 和类似技术",
        body: "ClauseCheck 使用必要的 Cookie 来维持会话状态和记住你的付费状态（localStorage）。我们不使用第三方追踪 Cookie、广告 Cookie 或跨站追踪技术。你可以在浏览器设置中禁用 Cookie，但可能影响某些功能的正常使用。",
      },
      {
        heading: "4. 数据存储与安全",
        body: "我们的服务部署在安全云基础设施上，数据传输全程使用 HTTPS/TLS 加密。合同文件在分析完成后立即从服务器文件系统中删除，不留任何副本。我们不维护合同数据库或长期存储用户上传内容。我们采取行业标准的技术和管理措施保护你的信息安全，但没有任何互联网传输或电子存储是 100% 安全的。如果你对数据安全有特殊顾虑，欢迎联系我们。",
      },
      {
        heading: "5. 第三方服务",
        body: [
          "我们依赖以下第三方服务交付核心功能：",
          "OpenAI：提供 AI 文本分析能力。你的合同内容会发送至 OpenAI API 进行处理，OpenAI 承诺不会用 API 数据训练模型。",
          "Stripe：处理支付和订阅。你的支付信息由 Stripe 直接收集和处理。详见 Stripe 隐私政策。",
          "Vercel：托管我们的应用。Vercel 可能会收集访问日志等基础设施级别的数据。",
          "我们不会将你的信息出售、出租或与非上述服务提供商的第三方分享。",
        ],
      },
      {
        heading: "6. 你的权利",
        body: [
          "根据适用法律（包括《中华人民共和国个人信息保护法》），你有权：",
          "访问、更正或删除我们持有的你的个人信息",
          "撤回同意（但可能影响后续服务）",
          "要求我们限制或停止处理你的个人信息",
          "向我们提出投诉",
          "由于我们不长期存储合同内容和用户个人信息，大部分权利请求实际上自动满足。如需行使权利，请联系下方邮箱。",
        ],
      },
      {
        heading: "7. 儿童隐私",
        body: "ClauseCheck 不面向 18 岁以下未成年人。如果我们发现无意中收集了未成年人的个人信息，将立即删除。",
      },
      {
        heading: "8. 政策更新",
        body: "我们可能会不时更新本隐私政策。重大变更将在网站上显著通知，或在变更生效前通过邮件通知（如有提供邮箱）。建议定期查看本页面。",
      },
      {
        heading: "9. 联系我们",
        body: ["如果你对隐私政策有任何疑问或顾虑，请通过以下方式联系：", "📧 privacy@clausecheck.com"],
      },
    ],
  },
  en: {
    back: "← Back to Home",
    title: "Privacy Policy",
    updated: "Last updated: June 2026",
    sections: [
      {
        heading: "1. What Information We Collect",
        body: [
          "ClauseCheck is a minimalist tool. Contract files you upload are transmitted to our servers via HTTPS encryption solely for AI analysis, and are permanently deleted immediately after analysis is complete. We do not store your original contracts, analysis summaries, or any identifiable contract content.",
          "We may automatically collect the following technical information: browser type, device type, access time, referring page URL, etc. This information is used solely to improve our service and is not directly linked to your personal identity.",
          "If you choose to subscribe to Pro or purchase pay-per-use services, payments are processed by Stripe. We do not store your credit card numbers or full payment information — this data is handled directly by Stripe with encryption. We retain your email address (if provided) for sending receipts and service notifications.",
        ],
      },
      {
        heading: "2. How We Use Information",
        body: [
          "The information we collect is used solely for the following purposes: providing contract scanning and risk analysis services; processing payments and subscription management; improving product experience and fixing bugs; sending service-related notifications (such as billing reminders and major updates); and complying with legal and regulatory requirements.",
          "We do not use your contract content to train AI models. All AI analysis is conducted via the OpenAI API, and OpenAI likewise does not use API call data for model training (see the OpenAI API Data Usage Policy).",
        ],
      },
      {
        heading: "3. Cookies and Similar Technologies",
        body: "ClauseCheck uses necessary cookies to maintain session state and remember your payment status (localStorage). We do not use third-party tracking cookies, advertising cookies, or cross-site tracking technologies. You may disable cookies in your browser settings, though this may affect the functionality of certain features.",
      },
      {
        heading: "4. Data Storage and Security",
        body: "Our service is deployed on secure cloud infrastructure, and all data transmission is encrypted via HTTPS/TLS. Contract files are deleted from our server filesystem immediately after analysis, leaving no copies. We do not maintain a contract database or long-term storage of user-uploaded content. We implement industry-standard technical and administrative measures to protect your information, though no internet transmission or electronic storage is 100% secure. If you have specific data security concerns, please contact us.",
      },
      {
        heading: "5. Third-Party Services",
        body: [
          "We rely on the following third-party services to deliver core functionality:",
          "OpenAI: provides AI text analysis capabilities. Your contract content is sent to the OpenAI API for processing. OpenAI commits to not using API data for model training.",
          "Stripe: handles payments and subscriptions. Your payment information is collected and processed directly by Stripe. See Stripe's Privacy Policy for details.",
          "Vercel: hosts our application. Vercel may collect infrastructure-level data such as access logs.",
          "We do not sell, rent, or share your information with third parties other than the service providers listed above.",
        ],
      },
      {
        heading: "6. Your Rights",
        body: [
          "Under applicable laws (including GDPR where applicable), you have the right to:",
          "Access, correct, or delete the personal information we hold about you",
          "Withdraw consent (which may affect subsequent services)",
          "Request that we restrict or cease processing your personal information",
          "Lodge a complaint with us",
          "Since we do not store contract content or user personal information long-term, most rights requests are automatically satisfied. To exercise your rights, please contact us at the email below.",
        ],
      },
      {
        heading: "7. Children's Privacy",
        body: "ClauseCheck is not intended for individuals under the age of 18. If we become aware that we have inadvertently collected personal information from a minor, we will delete it immediately.",
      },
      {
        heading: "8. Policy Updates",
        body: "We may update this Privacy Policy from time to time. Material changes will be prominently notified on the website or, if you have provided your email, via email before the changes take effect. We recommend checking this page periodically.",
      },
      {
        heading: "9. Contact Us",
        body: ["If you have any questions or concerns about this Privacy Policy, please contact us at:", "📧 privacy@clausecheck.com"],
      },
    ],
  },
};

// ── Page component ──

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const c = content[locale as "en" | "zh"] ?? content.zh;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <a href={`/${locale}`} className="text-sm text-ink-muted hover:text-ink mb-8 inline-block font-sans">
          {c.back}
        </a>
        <h1 className="text-3xl font-bold mb-2">{c.title}</h1>
        <p className="text-sm text-ink-muted mb-10 font-sans">{c.updated}</p>

        <div className="prose prose-sm max-w-none space-y-8">
          {c.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-ink mb-3">{s.heading}</h2>
              {Array.isArray(s.body) ? (
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
