import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户协议 — ClauseCheck",
  description: "ClauseCheck 用户协议，了解使用我们服务的条款和条件。",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <a
          href="/"
          className="text-sm text-ink-muted hover:text-ink mb-8 inline-block font-sans"
        >
          ← 返回首页
        </a>
        <h1 className="text-3xl font-bold mb-2">用户协议</h1>
        <p className="text-sm text-ink-muted mb-10 font-sans">
          最后更新：2026 年 6 月
        </p>

        <div className="space-y-8 text-ink-light leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              1. 接受条款
            </h2>
            <p>
              使用 ClauseCheck（下称"本服务"），即表示你同意本用户协议的所有条款。如果你不同意任何条款，请停止使用本服务。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              2. 服务说明
            </h2>
            <p>
              ClauseCheck 提供基于 AI
              的合同文本风险分析服务。用户上传合同文件后，AI
              自动识别风险条款并生成分析报告。本服务提供以下层级：
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>免费版</strong>：有限次数和字数的基本扫描
              </li>
              <li>
                <strong>专业版</strong>：按月订阅，无限扫描 + 深度分析
              </li>
              <li>
                <strong>按次付费</strong>：单次购买，获得完整报告
              </li>
            </ul>
            <p className="mt-2">
              我们保留随时修改、暂停或终止服务的权利，但会提前通知付费用户。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              3. 免责声明（重要）
            </h2>
            <div className="p-4 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <p>
                <strong>
                  ⚠️ ClauseCheck 提供的 AI 分析仅供参考，不构成法律意见。
                </strong>
              </p>
            </div>
            <ul className="list-disc pl-5 space-y-1 mt-3">
              <li>AI 分析结果可能存在错误、遗漏或不准确之处。</li>
              <li>本服务不能替代持牌律师的专业意见。</li>
              <li>
                涉及重大利益（如大额交易、诉讼风险、人身权益）的合同，你应当在签署前咨询持牌律师。
              </li>
              <li>依赖 AI 分析结果做出的任何决定，风险由你自行承担。</li>
              <li>
                我们不对因使用或依赖本服务而产生的任何直接或间接损失承担责任。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              4. 用户义务
            </h2>
            <p>使用本服务时，你同意：</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>不上传包含恶意软件、病毒或任何非法内容的文件</li>
              <li>
                不上传包含他人敏感个人信息（身份证号、银行账户等）的合同（如必须上传，请先行脱敏）
              </li>
              <li>不尝试反向工程、破解或滥用本服务的 API 和系统</li>
              <li>不为非法目的使用本服务</li>
              <li>遵守所有适用的法律法规</li>
            </ul>
            <p className="mt-2">违反上述义务可能导致立即终止服务，且不予退款。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              5. 知识产权
            </h2>
            <p>
              ClauseCheck 的名称、Logo、网站设计、代码和 AI prompt
              设计均为我们的知识产权。你上传的合同内容的所有权和知识产权归你或原始权利人所有。AI
              生成的报告内容——分析评分、修改建议、风险标注——你可以在个人使用范围内自由使用，但不得将其作为单独产品转售。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              6. 付费与退款
            </h2>
            <p>
              专业版按月订阅，费用在每个计费周期开始时收取。你可以随时在 Stripe
              后台取消订阅，取消后当前周期内仍可正常使用，不会产生后续费用。我们不支持已使用服务的退款，但如果你在付费后
              24 小时内没有使用且要求退款，我们将个案处理。
            </p>
            <p className="mt-2">
              按次付费一次生效，扫描完成后不支持退款。如果因系统故障导致扫描无法完成，请与我们联系解决。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              7. 服务可用性
            </h2>
            <p>
              我们将尽商业上合理的努力保持服务的可用性和稳定性，但不保证服务不中断或无错误。以下情况可能导致服务不可用：定期维护、第三方服务故障（如
              OpenAI API 或云基础设施）、不可抗力事件。对于付费用户，如因我们可控原因导致长时间不可用，可按受影响天数顺延订阅期。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              8. 隐私与数据
            </h2>
            <p>
              我们对数据隐私的承诺详见{" "}
              <a href="/privacy" className="text-accent underline">
                隐私政策
              </a>
              。简而言之：合同文件在分析完成后立即删除，不用于 AI
              模型训练，不分享给第三方（除必要的技术服务提供商外）。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              9. 责任限制
            </h2>
            <p>
              在法律允许的最大范围内，ClauseCheck 及其运营方对以下情况不承担责任：
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                因使用或无法使用本服务导致的任何间接、附带、特殊或后果性损失
              </li>
              <li>因 AI 分析不准确导致的合同决策损失</li>
              <li>
                因第三方服务（OpenAI、Stripe、Vercel 等）故障导致的服务中断
              </li>
              <li>因用户未咨询专业律师而导致的合同纠纷或法律后果</li>
            </ul>
            <p className="mt-2">
              如果因我们无法免责的重大过失导致你的直接损失，我们的总赔偿责任以你过去
              12 个月内向 ClauseCheck 支付的费用总额为上限。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              10. 争议解决
            </h2>
            <p>
              本协议受中华人民共和国法律管辖。因本协议产生的任何争议，双方应首先友好协商解决；协商不成的，任何一方可向服务提供方所在地有管辖权的人民法院提起诉讼。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              11. 协议修改
            </h2>
            <p>
              我们可能会不时修改本用户协议。修改后的条款将在网站上发布时生效。重大修改将通过网站通知或邮件通知付费用户。继续使用本服务即表示接受修改后的条款。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-ink mb-3">
              12. 联系我们
            </h2>
            <p>如果你对用户协议有任何疑问，请通过以下方式联系：</p>
            <p className="mt-2">📧 legal@clausecheck.cc</p>
          </section>
        </div>
      </div>
    </main>
  );
}
