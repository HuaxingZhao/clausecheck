"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { checkQuota, recordScan, setPro, isPro, syncProFromServer } from "@/lib/quota";
import type { ScanResult, ScanError } from "@/lib/types";
import ResultsSection from "./components/results-section";
import PricingSection from "./components/pricing-section";
import LangSwitch from "./components/lang-switch";
import AuthPanel from "./components/auth-panel";

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [scanCount, setScanCount] = useState<number | null>(null);
  const [scanStage, setScanStage] = useState(0);
  const [pro, setProState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ email: string; pro: boolean } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated) {
        setAuthUser({ email: data.email, pro: data.pro });
        if (data.pro) {
          syncProFromServer(true);
          setProState(true);
        }
      } else {
        setAuthUser(null);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveReportToHistory = useCallback(
    async (scanResult: ScanResult, sourceFileName?: string | null) => {
      if (!pro && !authUser?.pro) return;
      try {
        await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            result: scanResult,
            locale,
            fileName: sourceFileName ?? file?.name ?? null,
          }),
        });
      } catch {
        /* non-blocking */
      }
    },
    [authUser?.pro, locale, file?.name, pro]
  );

  useEffect(() => {
    setProState(isPro());
    refreshAuth();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const reportId = params.get("reportId");

      if (reportId) {
        fetch(`/api/reports/${reportId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.result) {
              setResult(data.result as ScanResult);
              window.history.replaceState({}, "", window.location.pathname);
            }
          })
          .catch(() => {});
      }

      if (params.get("checkout") === "success") {
        const sessionId = params.get("session_id");
        const finishCheckout = async () => {
          if (sessionId) {
            try {
              const res = await fetch("/api/checkout/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId }),
              });
              const data = await res.json();
              if (data.pro) {
                setPro();
                setProState(true);
                setToast(t("quota.checkoutSuccess"));
                if (data.email) {
                  setAuthUser({ email: data.email, pro: true });
                }
              }
            } catch {
              setPro();
              setProState(true);
              setToast(t("quota.checkoutSuccess"));
            }
          } else {
            setPro();
            setProState(true);
            setToast(t("quota.checkoutSuccess"));
          }
          await refreshAuth();
          window.history.replaceState({}, "", window.location.pathname);
        };
        finishCheckout();
      }

      const authParam = params.get("auth");
      if (authParam === "expired") {
        setToast(t("auth.expired"));
        window.history.replaceState({}, "", window.location.pathname);
      } else if (authParam === "invalid") {
        setToast(t("auth.invalid"));
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [t, refreshAuth]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (result) {
      setScanStage(0);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [result]);

  useEffect(() => {
    fetch("/api/scan-count")
      .then((r) => r.json())
      .then((d) => setScanCount(d.count))
      .catch(() => setScanCount(331));
  }, []);

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

    const quota = checkQuota();
    if (!quota.allowed) {
      setError(t("quota.limitReached"));
      return;
    }

    setLoading(true);
    setError(null);
    setScanStage(1);

    const stageTimer = setTimeout(() => setScanStage(2), 800);
    const stageTimer2 = setTimeout(() => setScanStage(3), 2500);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("locale", locale);

      const res = await fetch("/api/scan", {
        method: "POST",
        body: form,
        headers: { "x-user-tier": quota.tier },
      });
      const data = (await res.json()) as ScanResult | ScanError;

      if (!res.ok) throw new Error((data as ScanError).error || "Scan failed");

      setResult(data as ScanResult);
      recordScan();
      fetch("/api/scan-count", { method: "POST" }).catch(() => {});
      setScanStage(3);
      saveReportToHistory(data as ScanResult, file.name);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scan failed, please retry";
      setError(message);
      setScanStage(0);
    } finally {
      clearTimeout(stageTimer);
      clearTimeout(stageTimer2);
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!result) return;
    try {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, locale }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        locale === "zh" ? "ClauseCheck-合同风险报告.pdf" : "ClauseCheck-Risk-Report.pdf";
      a.click();
      URL.revokeObjectURL(url);
      saveReportToHistory(result, file?.name ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      setError(message);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setToast(t("auth.loggedOut"));
  }

  async function handleCheckout(
    priceId: "pro_monthly" | "pay_per_use",
    currency: "cny" | "usd" | "sgd"
  ) {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          currency,
          successUrl: `${window.location.origin}${window.location.pathname}?checkout=success`,
          cancelUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || t("quota.checkoutError"));
      }
    } catch {
      setError(t("quota.checkoutError"));
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const scoreCls = (scoreText: string) => {
    if (scoreText === t("results.scoreHigh") || scoreText === "高风险") return "high";
    if (scoreText === t("results.scoreLow") || scoreText === "低风险") return "low";
    return "medium";
  };

  const riskCls = result ? scoreCls(result.scoreText) : "";

  return (
    <>
      <nav className="border-b border-border bg-paper/80 backdrop-blur sticky top-0 z-40">
        <div className="nav-inner">
          <a href="#" className="font-sans font-semibold text-lg tracking-tight">
            {t("nav.brand")}
            {pro && (
              <span className="ml-2.5 inline-flex items-center gap-1 text-xs bg-accent/15 text-[#8B3A0E] px-2 py-0.5 rounded-full font-sans font-semibold align-middle">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("nav.proBadge")}
              </span>
            )}
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
            {authUser?.pro && (
              <Link href={`/${locale}/reports`} className="hover:text-ink transition-colors">
                {t("nav.reports")}
              </Link>
            )}
            <LangSwitch />
            {authUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs text-ink-muted max-w-[120px] truncate">
                  {authUser.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs hover:text-ink transition-colors"
                >
                  {t("auth.logout")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="text-xs hover:text-ink transition-colors"
              >
                {t("auth.signIn")}
              </button>
            )}
            <button onClick={() => scrollTo("upload")} className="btn btn-primary text-xs">
              {t("nav.startScan")}
            </button>
          </div>
        </div>
      </nav>

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

      <section id="upload" className="py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="section-label">{t("upload.label")}</div>
          <h2 className="mb-2">{t("upload.title")}</h2>
          <p className="text-ink-light mb-8">{t("upload.subtitle")}</p>

          <form onSubmit={handleSubmit}>
            <label
              className={`upload-zone ${file ? "has-file" : ""} ${dragOver ? "border-accent" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
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
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
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
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
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
                {t("upload.rescan")}
              </button>
            </div>
          )}
        </div>
      </section>

      {result && (
        <ResultsSection
          result={result}
          riskCls={riskCls}
          isPro={pro || !!authUser?.pro}
          onDownload={handleDownloadPdf}
          scrollTo={scrollTo}
          sectionRef={resultsRef}
        />
      )}

      <PricingSection
        locale={locale}
        isPro={pro || !!authUser?.pro}
        scrollTo={scrollTo}
        onCheckout={handleCheckout}
      />

      <section id="faq" className="py-20 bg-paper-dark">
        <div className="max-w-2xl mx-auto px-6">
          <div className="section-label text-center">{t("faq.label")}</div>
          <h2 className="text-center mb-10">{t("faq.title")}</h2>
          {(t.raw("faq.items") as { q: string; a: string }[]).map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {toast && (
        <div className="toast">
          <span>{toast}</span>
        </div>
      )}

      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        locale={locale}
        initialEmail={authUser?.email || ""}
      />
    </>
  );
}

function ProgressStage({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`progress-stage ${active ? "active" : ""} ${done ? "done" : ""}`}>
      <span className="stage-dot">{done ? "✓" : active ? "●" : "○"}</span>
      <span className="stage-label">{label}</span>
    </div>
  );
}

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
