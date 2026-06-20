import NavBar from "./nav-bar";
import ScannerSection from "./scanner-section";

export default function Home() {
  return (
    <main>
      <NavBar />

      {/* ====== HERO ====== */}
      <section className="py-24 md:py-32 text-center px-6">
        <div className="max-w-3xl mx-auto">
          <div className="hero-badge mx-auto w-fit mb-6">
            <span className="dot-pulse" />
            已扫描 12,847 份合同
          </div>
          <h1 className="mb-6">
            签合同前，
            <br />
            用 AI 扫一遍
          </h1>
          <p className="text-lg md:text-xl text-ink-light mb-8 leading-relaxed">
            上传你的合同，AI 逐条分析风险条款。
            <br className="hidden sm:block" />
            3 分钟出多维报告，拒绝踩坑。
          </p>
          <a href="#upload" className="btn btn-primary btn-lg">
            免费扫描你的合同 →
          </a>
          <p className="text-xs text-ink-muted mt-4 font-sans">无需注册 · 文件加密 · 扫完即删</p>
        </div>
      </section>

      {/* ====== HOW ====== */}
      <section id="how" className="py-20 bg-paper-dark">
        <div className="max-w-6xl mx-auto px-6">
          <div className="section-label">三步完成</div>
          <h2 className="mb-4">比你想的简单</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <h3>上传合同</h3>
              <p>支持 PDF、DOCX。拖进来或点击上传。你的文件全程加密，扫完自动删除。</p>
            </div>
            <div className="step">
              <div className="step-num">02</div>
              <h3>AI 逐条分析</h3>
              <p>
                大模型从公平性、合规性、财务风险三个维度通读全文，标记赔偿条款、竞业限制、自动续约、单方解约权等高风险条款。
              </p>
            </div>
            <div className="step">
              <div className="step-num">03</div>
              <h3>出报告 · 给建议</h3>
              <p>一目了然的风险等级 + 维度评分 + 逐条解释 + 谈判优先级。复制下来发给对方，谈判有底气。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== UPLOAD + RESULTS + PRICING (Client Component) ====== */}
      <ScannerSection />

      {/* ====== FAQ (原生 &lt;details&gt;，零 JS) ====== */}
      <section id="faq" className="py-20 bg-paper-dark">
        <div className="max-w-2xl mx-auto px-6">
          <div className="section-label text-center">常见问题</div>
          <h2 className="text-center mb-10">你可能想问</h2>
          {[
            {
              q: "合同隐私安全吗？我的文件会被存储吗？",
              a: "上传的文件仅用于本次 AI 扫描，扫描完成后立即从服务器删除。全程 HTTPS 加密传输，我们不会存储、查看或二次使用你的任何合同内容。你可以放心上传。",
            },
            {
              q: "AI 分析结果有多准？能替代律师吗？",
              a: "AI 基于大语言模型从公平性、合规性、财务风险三个维度综合评分，覆盖违约金、竞业限制、自动续约、知识产权归属等 10+ 类常见风险点。根据内部测试，高风险条款的检出率超过 90%。但请注意：它不是律师，仅供参考，涉及重大利益的合同仍建议咨询持牌律师。",
            },
            {
              q: "支持什么格式的合同？有字数限制吗？",
              a: "支持 PDF（文字型，非扫描件图片）、DOCX（Word 文档）和 TXT 纯文本。免费版单次最多 12,000 字，专业版支持 80,000 字。暂不支持图片 OCR 和手写合同扫描件。",
            },
            {
              q: "免费版有什么限制？",
              a: "免费版提供 3 天无限制试用，之后每月 3 次扫描，每次最多 12,000 字。支持完整风险评估、逐条修改建议和谈判优先级，但不含 PDF 报告导出和批量扫描。日常小合同完全够用。",
            },
            {
              q: "专业版和按次付费有什么区别？",
              a: "专业版适合频繁使用的法务和创业者，无限次扫描 + 深度 AI 分析 + PDF 导出 + 批量扫描。按次付费不订阅，¥19 扫一次，适合偶尔使用的个人。两者都包含完整报告和 PDF 导出。",
            },
            {
              q: "可以随时取消订阅吗？",
              a: "当然可以。你可以在 Stripe 后台随时取消，取消后当前计费周期内仍可正常使用，不会产生额外费用。没有任何隐藏条款或取消费。",
            },
            {
              q: "支持哪些类型的合同？",
              a: "ClauseCheck 适用于大多数商业合同类型：外包/服务协议、采购合同、租赁合同、NDA 保密协议、劳动合同、合伙协议等。如果你是中文合同用户，效果最佳。未来会支持更多语种。",
            },
            {
              q: "AI 使用什么模型？回答会一直改进吗？",
              a: "我们使用最新的 GPT 大模型进行合同分析，专业版启用两轮交叉验证（两位「AI 律师」独立分析后综合），结果更可靠。模型会持续升级，无需用户做任何操作即可享受改进。",
            },
          ].map((item, i) => (
            <details key={i} className="faq-item">
              <summary className="faq-q">
                <span className="font-medium">{item.q}</span>
                <span className="text-ink-muted">+</span>
              </summary>
              <div className="faq-a">
                <p className="text-sm text-ink-light leading-relaxed">{item.a}</p>
              </div>
            </details>
          ))}
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
            <a href="/about" className="hover:text-ink transition-colors">关于</a>
            <span className="mx-2">·</span>
            <a href="/privacy" className="hover:text-ink transition-colors">隐私政策</a>
            <span className="mx-2">·</span>
            <a href="/terms" className="hover:text-ink transition-colors">用户协议</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
