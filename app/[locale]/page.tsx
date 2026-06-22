"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import type { ScanResult, ScanError } from "@/lib/types";

export default function Home() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "en";

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [scanCount, setScanCount] = useState<number | null>(null);
  const [scanStage, setScanStage] = useState(0); // 0=idle, 1=extracting, 2=analyzing, 3=generating
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch("/api/scan-count")
      .then(r => r.json())
      .then((d) => setScanCount(d.count))
      .catch(() => setScanCount(331));
  }, []);

  // ---- Language switching ----
  function switchLang() {
    const newLocale = locale === "zh" ? "en" : "zh";
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.replace(pathname, { locale: newLocale });  

  }

  // ---- File handling ----
  function handleFile(f: File) {
    const valid = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (!valid.includes(f.type) && !f.name.match(/\.(pdf|docx?|txt)$/i)) {
      setError(t("upload.errorFormat"));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(t("upload.errorSize"));
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setScanStage(1); // Extracting text

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("locale", locale);

      // Simulate stage transitions
      const stageTimer = setTimeout(() => setScanStage(2), 800); // AI analyzing
      const stageTimer2 = setTimeout(() => setScanStage(3), 2500); // Generating report

      const res = await fetch("/api/scan", { method: "POST", body: form });
      const data = (await res.json()) as ScanResult | ScanError;

      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);

      if (!res.ok) throw new Error((data as ScanError).error || "Scan failed");
      setResult(data as ScanResult);

      // Increment global scan counter
      fetch("/api/scan-count", { method: "POST" }).catch(() => {});

      setScanStage(3); // Ensure we show "generating" briefly
      useEffect(() => {
        if (result) {
          setTimeout(() => {
            resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [result]);
         
    } catch (err: any) {
      setError(err.message || "Scan failed, please retry");
      setScanStage(0);
    } finally {
      setLoading(false);
    }
  }

  // ---- Navigation ----
  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  // ---- Helpers ----
  const scoreCls = (scoreText: string) => {
    if (scoreText === t("results.scoreHigh") || scoreText === "高风险") return "high";
    if (scoreText === t("results.scoreLow") || scoreText === "低风险") return "low";
    return "medium";
  };

  const riskCls = result ? scoreCls(result.scoreText) : "";

  const stripeLink =
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://stripe.com";

  return (
    <main>
      {/* ====== NAV ====== */}
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <a href="#" className="font-sans font-semibold text-lg tracking-tight">
            {t("nav.brand")}
          </a>
          <div className="flex items-center gap-6 text-sm font-sans text-ink-light">
            <button onClick={() => scrollTo("how")} className="hover:text-ink transition-colors">
              {t("nav.how")}
            </button>
            <button onClick={() => scrollTo("pricing")} className="hover:text-ink transition-colors">
              {t("nav.pricing")}
            </button>
            <button onClick={() => scrollTo("faq")} className="hover:text-ink transition-colors">
              {t("nav.faq")}
            </button>
            <button
              onClick={switchLang}
              className="hover:text-ink transition-colors text-xs border border-border rounded px-2 py-1"
              title={t("langSwitch.to")}
            >
              {locale === "zh" ? "EN" : "中文"}
            </button>
            <button onClick={() => scrollTo("upload")} className="btn btn-primary text-xs">
              {t("nav.startScan")}
            </button>
          </div>
        </div>
      </nav>

      {/* ====== HERO ====== */}
      <section className="py-24 md:py-32 text-center px-6">
        <div className="max-w-3xl mx-auto">
          <div className="hero-badge mx-auto w-fit mb-6">
            <span className="dot-pulse" />
            {t("hero.badge", { count: scanCount != null ? scanCount.toLocaleString() : "..." })}
          </div>
          <h1 className="mb-6">
            {t("hero.title1")}
            <br />
            {t("hero.title2")}
          </h1>
          <p className="text-lg md:text-xl text-ink-light mb-8 leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <button onClick={() => scrollTo("upload")} className="btn btn-primary btn-lg">
            {t("hero.cta")}
          </button>
          <p className="text-xs text-ink-muted mt-4 font-sans">{t("hero.trust")}</p>
        </div>
      </section>

      {/* ====== HOW ====== */}
      <section id="how" className="py-20 bg-paper-dark">
        <div className="max-w-6xl mx-auto px-6">
          <div className="section-label">{t("how.label")}</div>
          <h2 className="mb-4">{t("how.title")}</h2>
          <div className="steps">
            {(["step1", "step2", "step3"] as const).map((step) => (
              <div key={step} className="step">
                <div className="step-num">{t(`how.${step}.num`)}</div>
                <h3>{t(`how.${step}.title`)}</h3>
                <p>{t(`how.${step}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== UPLOAD ====== */}
      <section id="upload" className="py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="section-label">{t("upload.label")}</div>
          <h2 className="mb-2">{t("upload.title")}</h2>
          <p className="text-ink-light mb-8">{t("upload.subtitle")}</p>

          <form onSubmit={handleSubmit}>
            <label
              className={`upload-zone ${file ? "has-file" : ""} ${dragOver ? "border-accent" : ""}`}
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
                className="hidden"
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              {file ? (
                <div>
                  <div className="upload-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <p className="font-sans text-ink font-semibold">{file.name}</p>
                  <p className="text-xs text-ink-muted mt-1 font-sans">
                    {(file.size / 1024).toFixed(1)} KB · {t("upload.reselect")}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="upload-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="font-sans text-ink-light font-medium">{t("upload.dropzone")}</p>
                </div>
              )}
            </label>

            <button
              type="submit"
              disabled={!file || loading}
              className={`btn btn-primary w-full mt-6 btn-lg ${
                !file || loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? t("upload.scanning") : t("upload.scanButton")}
            </button>

            {error && (
              <p className="text-red-600 text-sm mt-4 text-center font-sans">{error}</p>
            )}
          </form>

          {/* Staged progress bar */}
          {loading && (
            <div className="mt-8">
              <div className="progress-stages">
                <ProgressStage
                  label={t("progress.extracting")}
                  active={scanStage >= 1}
                  done={scanStage > 1}
                />
                <ProgressStage
                  label={t("progress.analyzing")}
                  active={scanStage >= 2}
                  done={scanStage > 2}
                />
                <ProgressStage
                  label={t("progress.generating")}
                  active={scanStage >= 3}
                  done={false}
                />
              </div>
              <div className="scanning-text mt-4">{t("upload.scanningText")}</div>
            </div>
          )}

          {/* Re-scan button */}
          {result && (
            <div className="text-center mt-6">
              <button
                className="btn btn-outline text-sm"
                onClick={() => { setFile(null); setResult(null); setError(null); }}
              >
                {t("upload.rescan")}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ====== RESULTS ====== */}
      {result && (
        <section ref={resultsRef} id="results" className="py-20 bg-paper-dark">
          <div className="max-w-5xl mx-auto px-6">
            <div className="section-label">{t("results.label")}</div>
            <h2 className="mb-10">{t("results.title")}</h2>
            <div className="results-grid">
              {/* Risk Score */}
              <div className="result-card">
                <div className="risk-score">
                  <div className={`risk-ring ${riskCls}`}>
                    <span>{result.scoreNum}</span>
                  </div>
                  <div>
                    <h4 className="mb-0.5">{t("results.riskScore")}</h4>
                    <span className="risk-label">{result.scoreText}</span>
                  </div>
                </div>
                <p className="text-sm text-ink-light">{t("results.scoreDesc")}</p>
              </div>

              {/* Flags */}
              <div className="result-card">
                <h4 className="mb-4">
                  {t("results.flagsFound", { count: result.flags.length })}
                </h4>
                {result.flags.map((f, i) => (
                  <div key={i} className="flag-item">
                    <span className="flag-icon">{f.icon}</span>
                    <span className="flag-text">{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="summary-card">
                <h4 className="mb-3">{t("results.overallAssessment")}</h4>
                <p className="text-ink-light leading-relaxed">{result.summary}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <a
                href={stripeLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
              >
                {t("results.upgradeCta")}
              </a>
              <p className="text-xs text-ink-muted mt-3 font-sans">
                {t("results.upgradeHint")}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ====== PRICING ====== */}
      <PricingSection t={t} locale={locale} scrollTo={scrollTo} stripeLink={stripeLink} />

      {/* ====== FAQ ====== */}
      <section id="faq" className="py-20 bg-paper-dark">
        <div className="max-w-2xl mx-auto px-6">
          <div className="section-label text-center">{t("faq.label")}</div>
          <h2 className="text-center mb-10">{t("faq.title")}</h2>
          {(t as any).raw("faq.items").map((item: { q: string; a: string }, i: number) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer>
        <div className="max-w-6xl mx-auto px-6">
          <p>
            {t("footer.text", { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </main>
  );
}

/* ––––– Progress stage indicator ––––– */
function ProgressStage({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`progress-stage ${active ? "active" : ""} ${done ? "done" : ""}`}>
      <span className="stage-dot">{done ? "✓" : active ? "●" : "○"}</span>
      <span className="stage-label">{label}</span>
    </div>
  );
}

/* ––––– FAQ client component ––––– */
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button className="faq-q" onClick={() => setOpen(!open)}>
        <span className="font-medium">{q}</span>
        <span className={`text-ink-muted transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      <div className="faq-a">
        <p className="text-sm text-ink-light leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ––––– Pricing section (locale-aware currency) ––––– */
function PricingSection({
  t,
  locale,
  scrollTo,
  stripeLink,
}: {
  t: any;
  locale: string;
  scrollTo: (id: string) => void;
  stripeLink: string;
}) {
  const [cur, setCur] = useState<"usd" | "sgd">("usd");

  const freePrice =
    locale === "zh"
      ? t("pricing.free.price")
      : t(`pricing.currencies.${cur}.free.price`);
  const freePeriod =
    locale === "zh"
      ? t("pricing.free.period")
      : t(`pricing.currencies.${cur}.free.period`);
  const proPrice =
    locale === "zh"
      ? t("pricing.pro.price")
      : t(`pricing.currencies.${cur}.pro.price`);
  const proPeriod =
    locale === "zh"
      ? t("pricing.pro.period")
      : t(`pricing.currencies.${cur}.pro.period`);

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="section-label text-center">{t("pricing.label")}</div>
        <h2 className="text-center mb-4">{t("pricing.title")}</h2>
        <p className="text-center text-ink-light mb-6">{t("pricing.subtitle")}</p>

        {/* Currency switcher (English only) */}
        {locale === "en" && (
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="text-xs text-ink-muted font-sans">{t("pricing.currencyLabel")}:</span>
            {(["usd", "sgd"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCur(c)}
                className={`text-xs font-sans px-3 py-1 rounded-full border transition-colors ${
                  cur === c
                    ? "bg-accent text-white border-accent"
                    : "border-border text-ink-light hover:border-accent"
                }`}
              >
                {t(`pricing.currencies.${c}.label`)}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="pricing-card">
            <h3 className="text-xl mb-1">{t("pricing.free.name")}</h3>
            <div className="text-4xl font-light font-sans mb-4">
              {freePrice}<span className="text-lg text-ink-muted">{freePeriod}</span>
            </div>
            <ul className="space-y-3 mb-6 text-sm text-ink-light">
              {(t as any).raw("pricing.free.features").map((feat: string, i: number) => (
                <li key={i}>{feat}</li>
              ))}
            </ul>
            <button onClick={() => scrollTo("upload")} className="btn btn-outline w-full">
              {t("pricing.free.cta")}
            </button>
          </div>
          {/* Pro */}
          <div className="pricing-card featured">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl">{t("pricing.pro.name")}</h3>
              <span className="text-xs bg-accent/20 text-accent-dark px-2 py-0.5 rounded-full font-sans">
                {t("pricing.pro.badge")}
              </span>
            </div>
            <div className="text-4xl font-light font-sans mb-4">
              {proPrice}<span className="text-lg text-ink-muted">{proPeriod}</span>
            </div>
            <ul className="space-y-3 mb-6 text-sm text-ink-light">
              {(t as any).raw("pricing.pro.features").map((feat: string, i: number) => (
                <li key={i}>{feat}</li>
              ))}
            </ul>
            <a
              href={stripeLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full"
            >
              {t("pricing.pro.cta")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
