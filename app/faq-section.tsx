"use client";

import { useState } from "react";

/* ––––– FAQ client component ––––– */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button
        className="faq-q"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-medium">{q}</span>
        <span
          className={`text-ink-muted transition-transform ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <div className="faq-a">
        <p className="text-sm text-ink-light leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

const FAQ_DATA = [
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
];

export default function FaqSection() {
  return (
    <section id="faq" className="py-20 bg-paper-dark">
      <div className="max-w-2xl mx-auto px-6">
        <div className="section-label text-center">常见问题</div>
        <h2 className="text-center mb-10">你可能想问</h2>
        {FAQ_DATA.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </section>
  );
}
