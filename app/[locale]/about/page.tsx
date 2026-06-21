import Link from "next/link";

export default function AboutPage() {
  return (
    <main>
      {/* ====== NAV ====== */}
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <Link href="/" className="font-sans font-semibold text-lg tracking-tight">
            ClauseCheck
          </Link>
          <div className="flex items-center gap-6 text-sm font-sans text-ink-light">
            <Link href="/" className="hover:text-ink transition-colors">
              首页
            </Link>
            <Link href="/about" className="text-ink font-semibold transition-colors">
              关于
            </Link>
          </div>
        </div>
      </nav>

      {/* ====== HERO ====== */}
      <section className="py-24 md:py-32 text-center px-6">
        <div className="max-w-3xl mx-auto">
          <div className="section-label">about</div>
          <h1 className="mb-6">
            一个人，一个 AI，
            <br />
            让合同不再「看不懂」
          </h1>
          <p className="text-lg md:text-xl text-ink-light leading-relaxed max-w-2xl mx-auto">
            ClauseCheck 是一个独立开发者用 AI 亲手搭建的合同扫描工具。
            没有团队，没有融资，只有一个人想把法律信息差打掉的执念。
          </p>
        </div>
      </section>

      {/* ====== DIVIDER ====== */}
      <div className="max-w-6xl mx-auto px-6">
        <hr className="border-border" />
      </div>

      {/* ====== STORY ====== */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="section-label">背后的故事</div>
          <h2 className="mb-8">为什么要做这个？</h2>

          <div className="space-y-8 text-ink-light leading-relaxed text-base md:text-lg">
            <p>
              签合同这件事，大多数人一生会经历几十次——租房、入职、外包、装修、代理、加盟。
              但每一次，对面拿出来的合同都是律师写的，几十页密密麻麻，普通人的选择只有两个：硬着头皮签，或者花几千块请律师看。
            </p>

            <p>
              几千块不是小钱。何况很多时候只是「感觉哪里不对」但又说不出来，律师看完说「没什么大问题」，几千块就没了。
              这笔钱如果用来吃火锅，能吃二十顿。
            </p>

            <p>
              <strong className="text-ink">我想做一个工具：30 秒，把合同里那些「不对劲」的地方标出来。</strong>
              不是为了替代律师，而是让你在决定要不要请律师之前，先有一个自己的判断。
              就像体检报告一样——不是医生，但让你知道哪里需要重点关注。
            </p>
          </div>
        </div>
      </section>

      {/* ====== PHILOSOPHY ====== */}
      <section className="py-20 bg-paper-dark px-6">
        <div className="max-w-3xl mx-auto">
          <div className="section-label">理念</div>
          <h2 className="mb-8">我信的东西</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="step">
              <div className="step-num">01</div>
              <h3>信息透明是权利</h3>
              <p>
                合同不该只有一方能看懂。每个人都有权知道自己在签什么，
                AI 的使命就是把法律语言翻译成「人话」。
              </p>
            </div>

            {/* Card 2 */}
            <div className="step">
              <div className="step-num">02</div>
              <h3>AI 是拐杖，不是大脑</h3>
              <p>
                ClauseCheck 的每一条分析都会告诉你是「仅供参考，不构成法律意见」。
                最终决定权永远在你手里，AI 只是帮你少踩一个坑。
              </p>
            </div>

            {/* Card 3 */}
            <div className="step">
              <div className="step-num">03</div>
              <h3>一个人也可以做出好东西</h3>
              <p>
                没有团队不是借口。一个人的极致专注 + AI 的开发效率，
                可以在几周内做出过去需要一支团队的产品。独立开发者的时代到了。
              </p>
            </div>

            {/* Card 4 */}
            <div className="step">
              <div className="step-num">04</div>
              <h3>数据安全不是可选项</h3>
              <p>
                每条上传的合同在扫描完成后自动删除。全程传输加密，
                绝不用于模型训练。你的合同是你的，不是我的。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== MAKER ====== */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="section-label">maker</div>
          <h2 className="mb-6">关于我</h2>
          <p className="text-ink-light leading-relaxed text-base md:text-lg max-w-xl mx-auto">
            一个写代码的人。相信好的工具应该小而锋利，不是大而全。
            目前在探索 AI × 独立开发的可能性——一只脚踩在代码里，一只脚踩在现实问题里。
          </p>

          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-ink-muted font-sans">
            <span>📍 Singapore</span>
            <span className="text-border">|</span>
            <span>🛠 独立开发者</span>
            <span className="text-border">|</span>
            <span>🤖 AI 一人公司实验</span>
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="py-16 bg-paper-dark px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="mb-3">来试试看</h2>
          <p className="text-ink-light mb-8 leading-relaxed">
            上传一份合同，看看 AI 能发现什么。
            免费试用，不需要注册。
          </p>
          <Link
            href="/"
            className="btn btn-primary btn-lg inline-flex"
          >
            开始扫描 →
          </Link>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            © {new Date().getFullYear()} ClauseCheck · AI 合同助手 ·
            仅供参考，不构成法律意见
          </p>
          <p className="text-xs text-ink-muted font-sans">
            <Link href="/privacy" className="hover:text-ink transition-colors">隐私政策</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:text-ink transition-colors">用户协议</Link>
          </p>
        </div>
      </footer>
    </main>
  );
}

export const metadata = {
  title: "关于 ClauseCheck — 一个人做的 AI 合同工具",
  description:
    "ClauseCheck 是一个独立开发者用 AI 亲手搭建的合同扫描工具。背后的故事、理念和关于 maker 的一切。",
  openGraph: {
    title: "关于 ClauseCheck — 一个人做的 AI 合同工具",
    description:
      "ClauseCheck 是一个独立开发者用 AI 亲手搭建的合同扫描工具。背后的故事、理念和关于 maker 的一切。",
  },
};
