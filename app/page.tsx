"use client";

import { useState, useRef, useEffect, type FormEvent, type ChangeEvent } from "react";
import type { ScanResult, ScanError, RiskFlag } from "@/lib/types";
import { getDemoResult } from "@/lib/demo";
import { checkQuota, recordScan, setPro, isPro, UserTier } from "@/lib/quota";

/* ––––– 币种配置 ––––– */
type CurrencyKey = "cny" | "usd" | "sgd";

interface CurrencyDef {
  key: CurrencyKey;
  label: string;
  flag: string;
  proMonthly: { symbol: string; amount: string };
  payPerUse: { symbol: string; amount: string };
}

const CURRENCIES: CurrencyDef[] = [
  { key: "cny", label: "CNY ¥", flag: "🇨🇳", proMonthly: { symbol: "¥", amount: "49" }, payPerUse: { symbol: "¥", amount: "19" } },
  { key: "usd", label: "USD $", flag: "🇺🇸", proMonthly: { symbol: "$", amount: "6.9" }, payPerUse: { symbol: "$", amount: "2.9" } },
  { key: "sgd", label: "SGD S$", flag: "🇸🇬", proMonthly: { symbol: "S$", amount: "8.9" }, payPerUse: { symbol: "S$", amount: "3.9" } },
];

/* ––––– tiny time‑term icon map ––––– */
const timeIcons: Record<string, string> = {
  auto_renewal: "🔄",
  deadline: "⏰",
  expiration: "📅",
  notice_period: "📬",
};

const timeLabels: Record<string, string> = {
  auto_renewal: "自动续约",
  deadline: "硬性截止日",
  expiration: "到期/失效",
  notice_period: "通知期限",
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyKey>("cny");
  const [toast, setToast] = useState<string | null>(null);
  const [pro, setProState] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  /* ---------- checkout success redirect ---------- */
  useEffect(() => {
    setProState(isPro());
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("checkout")) {
      const status = new URLSearchParams(window.location.search).get("checkout");
      if (status === "success") {
        setPro();
        setProState(true);
        setToast("🎉 支付成功！已解锁专业版，无限次扫描 + PDF 导出");
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  /* ---------- toast auto-dismiss ---------- */
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  /* ---------- Stripe checkout ---------- */
  async function handleCheckout(priceId: string) {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          currency,
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "支付跳转失败");
      }
    } catch (err: any) {
      setError("支付系统暂不可用，请稍后再试");
    }
  }

  /* ---------- File handling ---------- */
  function handleFile(f: File) {
    const valid = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (!valid.includes(f.type) && !f.name.match(/\.(pdf|docx?|txt)$/i)) {
      setError("仅支持 PDF / DOCX / TXT 文件");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("文件不能超过 50MB");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    const quota = checkQuota();
    if (!quota.allowed) {
      setQuotaWarning(quota.reason || "额度已用完");
      setError(quota.reason || "本月免费额度已用完");
      return;
    }

    setLoading(true);
    setError(null);
    setQuotaWarning(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const tier = quota.tier;
      const res = await fetch("/api/scan", {
        method: "POST",
        body: form,
        headers: { "x-user-tier": tier },
      });
      const data = (await res.json()) as ScanResult | ScanError;
      if (!res.ok) throw new Error((data as ScanError).error || "扫描失败");
      setResult(data as ScanResult);
      recordScan();
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (err: any) {
      setError(err.message || "扫描失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Navigation ---------- */
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  /* ---------- HTML Report Download ---------- */
  async function handleDownloadHtml() {
    if (!result) return;
    try {
      const res = await fetch("/api/export/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ClauseCheck-Report.html";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "报告导出失败");
    }
  }
  const riskCls =
    result?.scoreText === "高风险" ? "high" : result?.scoreText === "低风险" ? "low" : "medium";

  /* 当前币种数据 */
  const cur = CURRENCIES.find((c) => c.key === currency) ?? CURRENCIES[0];

  return (
    <main>
      {/* ====== NAV ====== */}
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <a href="#" className="font-sans font-semibold text-lg tracking-tight">
            ClauseCheck
            {pro && (
              <span className="ml-2.5 inline-flex items-center gap-1 text-xs bg-accent/15 text-[#8B3A0E] px-2 py-0.5 rounded-full font-sans font-semibold align-middle">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                专业版
              </span>
            )}
          </a>
          <div className="flex items-center gap-6 text-sm font-sans text-ink-light">
            <button onClick={() => scrollTo("how")} className="hover:text-ink transition-colors">
              怎么用
            </button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-ink transition-colors">
              定价
            </button>
            <button onClick={() => scrollTo("faq")} className="hover:text-ink transition-colors">
              FAQ
            </button>
            <button onClick={() => scrollTo("upload")} className="btn btn-primary text-xs">
              开始扫描
            </button>
          </div>
        </div>
      </nav>

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
          <button onClick={() => scrollTo("upload")} className="btn btn-primary btn-lg">
            免费扫描你的合同 →
          </button>
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

      {/* ====== UPLOAD ====== */}
      <section id="upload" className="py-24 md:py-28">
        <div className="upload-section">
          <div className="section-label text-center">提交合同</div>
          <h2 className="text-center mb-3">上传合同，立刻扫描</h2>
          <p className="text-center text-ink-light mb-10">支持 PDF、DOCX，最大 50MB</p>

          <form onSubmit={handleSubmit}>
            <label
              className={`upload-dialog ${file ? "has-file" : ""} ${dragOver ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
            >
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                className="sr-only"
                aria-label="选择合同文件"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <div>
                  <div className="upload-cloud-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <p className="upload-file-name">{file.name}</p>
                  <p className="upload-file-hint">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · 点击重新选择
                  </p>
                </div>
              ) : (
                <div>
                  <div className="upload-cloud-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="text-ink-light font-medium text-lg">拖拽文件到这里，或点击选择</p>
                  <p className="text-xs text-ink-muted mt-2 font-sans">PDF · DOCX · DOC · TXT</p>
                </div>
              )}
            </label>

            <button
              type="submit"
              disabled={!file || loading}
              className="upload-submit-btn"
            >
              {loading ? "AI 正在分析…" : "开始扫描"}
            </button>

            {error && (
              <p className="text-red-600 text-sm mt-4 text-center font-sans">{error}</p>
            )}
          </form>

          {/* Loading indicator */}
          {loading && (
            <div className="mt-6 text-center">
              <div className="loading-bar">
                <div className="loading-bar-fill" />
              </div>
              <div className="scanning-text">AI 正在逐条分析你的合同……</div>
            </div>
          )}

          {/* Re-scan button */}
          {result && (
            <div className="text-center mt-6">
              <button
                className="btn btn-outline text-sm"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 -mt-0.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>重新扫描
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ====== RESULTS ====== */}
      {result && (
        <section ref={resultsRef} id="results" className="py-20 bg-paper-dark fade-section">
          <div className="max-w-6xl mx-auto px-6">
            <div className="section-label">扫描结果</div>
            <h2 className="mb-10">风险报告</h2>

            {/* ── Row 1: Risk Score + Dimension Bars ── */}
            <div className="results-grid mb-6">
              <div className="result-card">
                <div className="risk-score">
                  <div className={`risk-ring ${riskCls} count-animate`}>
                    <span>{result.scoreNum}</span>
                  </div>
                  <div>
                    <h4 className="mb-0.5">综合风险评分</h4>
                    <span className="risk-label">{result.scoreText}</span>
                  </div>
                </div>
                <p className="text-sm text-ink-light mt-2">
                  加权公式：公平性 ×35% + 合规性 ×25% + 财务风险 ×40%
                </p>
              </div>

              {result.dimensions && (
                <div className="result-card lg:col-span-2">
                  <h4 className="mb-5 text-sm font-sans text-ink-light">📊 分维度风险评分</h4>
                  <div className="dimensions-grid">
                    <DimensionBar label="合同公平性" value={result.dimensions.fairness} kind="fairness" />
                    <DimensionBar label="法律合规性" value={result.dimensions.compliance} kind="compliance" />
                    <DimensionBar label="财务风险" value={result.dimensions.financial} kind="financial" />
                  </div>
                  <p className="text-xs text-ink-muted mt-2 font-sans">
                    分数越高 = 该维度风险越大。建议优先关注红色维度。
                  </p>
                </div>
              )}
            </div>

            {/* ── Row 2: Flags + Time Terms ── */}
            <div className="results-grid mb-6">
              <div className="result-card lg:col-span-2">
                <h4 className="mb-4">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 -mt-0.5 text-accent"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  发现 {result.flags.length} 个需关注条款
                </h4>
                {result.flags.map((f, i) => (
                  <div key={i} className={`flag-item ${flagCls(f)}`}>
                    <span className="flag-icon">{f.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="flag-text">{f.text}</span>
                      {f.level && (
                        <span className={`flag-level-badge ${f.level}`}>{levelLabel(f.level)}</span>
                      )}
                      {f.suggestion && (
                        <span className="flag-suggestion">💡 {f.suggestion}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {result.timeTerms && result.timeTerms.length > 0 && (
                <div className="result-card">
                  <h4 className="mb-4 text-sm font-sans text-ink-light">⏱️ 时间敏感条款</h4>
                  <div className="time-terms-grid">
                    {result.timeTerms.map((t, i) => (
                      <div key={i} className="time-term">
                        <span className="time-term-icon">{timeIcons[t.type] || "📌"}</span>
                        <div>
                          <span className="text-xs text-ink-muted font-sans">{timeLabels[t.type] || t.type}</span>
                          <p className="text-sm text-ink-light leading-relaxed mt-0.5">{t.description}</p>
                          <span className={`time-badge ${t.risk}`}>{riskLabelSmall(t.risk)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Row 3: Negotiations ── */}
            {result.negotiations && result.negotiations.length > 0 && (
              <div className="summary-card mb-6">
                <h4 className="mb-5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 -mt-0.5 text-accent"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  谈判优先级
                </h4>
                <div className="negotiations-list">
                  {result.negotiations.map((n) => (
                    <div key={n.priority} className="nego-item">
                      <div className="nego-priority">{n.priority}</div>
                      <div className="nego-body">
                        <div className="nego-clause">{n.clause}</div>
                        <div className="nego-rows">
                          <div className="nego-row">
                            <span className="nego-label">当前表述</span>
                            <span>{n.current}</span>
                          </div>
                          <div className="nego-row">
                            <span className="nego-label">建议改为</span>
                            <span className="text-accent-dark font-medium">{n.suggested}</span>
                          </div>
                        </div>
                        <div className="nego-reason">💬 {n.reason}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Row 4: Summary ── */}
            <div className="summary-card">
              <h4 className="mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-1.5 -mt-0.5 text-ink-light"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                综合评估与行动建议
              </h4>
              <p className="text-ink-light leading-relaxed whitespace-pre-line">{result.summary}</p>
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={handleDownloadHtml}
                  className="btn btn-primary btn-lg"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block mr-2 -mt-0.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  下载报告 (HTML)
                </button>
              </div>
              <p className="text-sm text-ink-light mb-4 font-sans">
                 这是试用期的免费扫描。开通专业版解锁无限使用 &amp; 报告导出。
              </p>
              <a
                href="#pricing"
                className="btn btn-primary btn-lg"
              >
                查看定价 →
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ====== PRICING ====== */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="section-label text-center">定价</div>
          <h2 className="text-center mb-4">简单透明</h2>
          <p className="text-center text-ink-light mb-8">3 天免费试用</p>

          {/* ── Currency Switcher ── */}
          <div className="flex justify-center mb-10">
            <div className="currency-switcher">
              {CURRENCIES.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCurrency(c.key)}
                  className={`currency-btn ${currency === c.key ? "active" : ""}`}
                >
                  <span className="mr-1.5">{c.flag}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ---------- 已订阅状态 ---------- */}
            {pro ? (
              <div className="md:col-span-3 max-w-xl mx-auto w-full">
                <div className="pricing-card featured text-center !scale-100 hover:!scale-[1.02]">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent"><polyline points="20 6 9 17 4 12"/></svg>
                    <h3 className="text-xl">您已订阅专业版</h3>
                  </div>
                  <p className="text-sm text-ink-light mb-5 font-sans leading-relaxed">
                    无限次扫描 · 深度 AI 分析 · 全文无长度限制 · PDF 报告导出 · 批量扫描 · 优先邮件支持
                  </p>
                  <p className="text-xs text-ink-muted font-sans leading-relaxed">
                    需要管理订阅？前往{" "}
                    <a
                      href="https://billing.stripe.com/p/login/dRm3cveQW6Bg6Gz7xh00000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline hover:text-[#8B3A0E] transition-colors"
                    >
                      Stripe 管理后台
                    </a>
                    {" "}查看账单、更新支付方式或取消订阅。
                  </p>
                </div>
              </div>
            ) : (
              <>
            {/* Free */}
            <div className="pricing-card">
              <h3 className="text-xl mb-1">免费版</h3>
              <p className="text-xs text-ink-muted mb-4 font-sans">3 天试用 · 绑定卡 ❌</p>
              <div className="text-4xl font-light font-sans mb-5">
                {cur.proMonthly.symbol}0<span className="text-lg text-ink-muted">/月</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-ink-light">
                <li>✅ 试用期无限扫描</li>
                <li>✅ 完整风险评估</li>
                <li>✅ 逐条修改建议</li>
                <li>✅ 谈判优先级</li>
                <li>⏤ 试用后 3 次/月</li>
                <li>⏤ 不含 PDF 报告导出</li>
              </ul>
              <button onClick={() => scrollTo("upload")} className="btn btn-outline w-full">
                免费开始
              </button>
            </div>
            {/* Pro Monthly */}
            <div className="pricing-card featured">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl">专业版</h3>
                <span className="text-xs bg-accent/20 text-[#8B3A0E] px-2 py-0.5 rounded-full font-sans">
                  推荐
                </span>
              </div>
              <p className="text-xs text-ink-muted mb-4 font-sans">适合法务 &amp; 创业者 · 绑定卡 ✅</p>
              <div className="text-4xl font-light font-sans mb-5">
                {cur.proMonthly.symbol}{cur.proMonthly.amount}<span className="text-lg text-ink-muted">/月</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-ink-light">
                <li>✅ 无限次扫描</li>
                <li>✅ 深度 AI 分析</li>
                <li>✅ 全文无长度限制</li>
                <li>✅ PDF 报告导出</li>
                <li>✅ 批量扫描</li>
                <li>✅ 优先邮件支持</li>
              </ul>
              <button
                onClick={() => handleCheckout("pro_monthly")}
                className="btn btn-primary w-full"
              >
                开始订阅
              </button>
            </div>
            {/* Pay-per-use */}
            <div className="pricing-card">
              <h3 className="text-xl mb-1">按次使用</h3>
              <p className="text-xs text-ink-muted mb-4 font-sans">不订阅，用一次付一次 · 绑定卡 ✅</p>
              <div className="text-4xl font-light font-sans mb-5">
                {cur.payPerUse.symbol}{cur.payPerUse.amount}<span className="text-lg text-ink-muted">/次</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm text-ink-light">
                <li>✅ 单次完整扫描</li>
                <li>✅ 完整风险报告</li>
                <li>✅ 逐条修改建议</li>
                <li>✅ PDF 报告导出</li>
                <li>✅ 无需订阅</li>
                <li>⏤ 不包含批量扫描</li>
              </ul>
              <button
                onClick={() => handleCheckout("pay_per_use")}
                className="btn btn-outline w-full"
              >
                {cur.payPerUse.symbol}{cur.payPerUse.amount} 扫一次
              </button>
            </div>
            </>
          )}
          </div>
        </div>
      </section>

      {/* ====== FAQ ====== */}
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
            <FAQItem key={i} q={item.q} a={item.a} />
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

      {/* ====== TOAST ====== */}
      {toast && (
        <div className="toast">
          <span>{toast}</span>
        </div>
      )}
    </main>
  );
}

/* ––––– Helpers ––––– */

function flagCls(f: RiskFlag): string {
  if (f.level === "high") return "flag-high";
  if (f.level === "medium") return "flag-medium";
  if (f.level === "low") return "flag-low";
  return "";
}

function levelLabel(level: string): string {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  if (level === "low") return "低风险";
  return "";
}

function riskLabelSmall(risk: string): string {
  if (risk === "high") return "高风险";
  if (risk === "medium") return "中风险";
  if (risk === "low") return "低风险";
  return "";
}

/* ––––– Dimension Bar ––––– */
function DimensionBar({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "fairness" | "compliance" | "financial";
}) {
  return (
    <div className="dim-item">
      <div className="dim-label">{label}</div>
      <div className="dim-bar-wrap">
        <div
          className={`dim-bar-fill ${kind}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className={`dim-val ${kind}`}>{value}</div>
    </div>
  );
}

/* ––––– FAQ client component ––––– */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-medium">{q}</span>
        <span className={`text-ink-muted transition-transform ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      <div className="faq-a">
        <p className="text-sm text-ink-light leading-relaxed">{a}</p>
      </div>
    </div>
  );
}
