import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 — ClauseCheck",
  description: "ClauseCheck 的隐私政策，了解我们如何收集、使用和保护你的个人信息。",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <a href="/" className="text-sm text-ink-muted hover:text-ink mb-8 inline-block font-sans">
          ← 返回首页
        </a>
        <h1 className="text-3xl font-bold mb-2">隐私政策</h1>
        <p className="text-sm text-ink-muted mb-10 font-sans">
          最后更新：2025 年 1 月
        </p>

        <div className="prose prose-sm max-w-none space-y-8 text-ink-light leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">1. 我们收集哪些信息</h2>
            <p>
              ClauseCheck 是一个极简工具。你上传的合同文件仅在前端选中后、通过 HTTPS 加密传输至我们的服务器进行 AI 分析，<strong>分析完成后立即永久删除</strong>。我们不会存储你的合同原文、分析结果摘要或任何可识别的合同内容。
            </p>
            <p className="mt-2">
              我们可能自动收集以下技术信息：浏览器类型、设备类型、访问时间、来源页面 URL 等，这些信息仅用于改善服务，不直接关联到你的个人身份。
            </p>
            <p className="mt-2">
              如果你选择订阅专业版或购买按次服务，支付由 Stripe 处理。我们<strong>不会</strong>存储你的信用卡号或完整支付信息——这些数据直接由 Stripe 加密处理。我们会保留你的邮箱（如有提供）用于发送收据和服务通知。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">2. 信息如何使用</h2>
            <p>我们收集的信息仅用于以下目的：</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>提供合同扫描和风险分析服务</li>
              <li>处理支付和订阅管理</li>
              <li>改善产品体验和修复 bug</li>
              <li>发送与服务相关的通知（如账单提醒、重大更新）</li>
              <li>遵守法律法规要求</li>
            </ul>
            <p className="mt-2">
              我们<strong>不会</strong>将你的合同内容用于训练 AI 模型。所有 AI 分析均通过 OpenAI API 完成，OpenAI 也不会将 API 调用数据用于模型训练（见 OpenAI API 数据使用政策）。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">3. Cookie 和类似技术</h2>
            <p>
              ClauseCheck 使用必要的 Cookie 来维持会话状态和记住你的付费状态（localStorage）。我们不使用第三方追踪 Cookie、广告 Cookie 或跨站追踪技术。你可以在浏览器设置中禁用 Cookie，但可能影响某些功能的正常使用。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">4. 数据存储与安全</h2>
            <p>
              我们的服务部署在安全云基础设施上，数据传输全程使用 HTTPS/TLS 加密。合同文件在分析完成后立即从服务器文件系统中删除，不留任何副本。我们不维护合同数据库或长期存储用户上传内容。
            </p>
            <p className="mt-2">
              我们采取行业标准的技术和管理措施保护你的信息安全，但没有任何互联网传输或电子存储是 100% 安全的。如果你对数据安全有特殊顾虑，欢迎联系我们。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">5. 第三方服务</h2>
            <p>我们依赖以下第三方服务交付核心功能：</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>OpenAI</strong>：提供 AI 文本分析能力。你的合同内容会发送至 OpenAI API 进行处理，OpenAI 承诺不会用 API 数据训练模型。</li>
              <li><strong>Stripe</strong>：处理支付和订阅。你的支付信息由 Stripe 直接收集和处理。详见 Stripe 隐私政策。</li>
              <li><strong>Vercel</strong>：托管我们的应用。Vercel 可能会收集访问日志等基础设施级别的数据。</li>
            </ul>
            <p className="mt-2">
              我们不会将你的信息出售、出租或与非上述服务提供商的第三方分享。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">6. 你的权利</h2>
            <p>根据适用法律（包括《中华人民共和国个人信息保护法》），你有权：</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>访问、更正或删除我们持有的你的个人信息</li>
              <li>撤回同意（但可能影响后续服务）</li>
              <li>要求我们限制或停止处理你的个人信息</li>
              <li>向我们提出投诉</li>
            </ul>
            <p className="mt-2">
              由于我们不长期存储合同内容和用户个人信息，大部分权利请求实际上自动满足。如需行使权利，请联系下方邮箱。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">7. 儿童隐私</h2>
            <p>
              ClauseCheck 不面向 18 岁以下未成年人。如果我们发现无意中收集了未成年人的个人信息，将立即删除。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">8. 政策更新</h2>
            <p>
              我们可能会不时更新本隐私政策。重大变更将在网站上显著通知，或在变更生效前通过邮件通知（如有提供邮箱）。建议定期查看本页面。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">9. 联系我们</h2>
            <p>
              如果你对隐私政策有任何疑问或顾虑，请通过以下方式联系：
            </p>
            <p className="mt-2">
              📧 privacy@clausecheck.cc
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
