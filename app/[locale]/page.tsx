"use client";

import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { checkQuota, recordScan, setPro, isPro, syncProFromServer, saveProEmail, getProEmail, applyServerQuota, type ServerQuotaStatus } from "@/lib/quota";
import { trackEvent } from "@/lib/analytics";
import type { ScanResult, ScanError } from "@/lib/types";
import type { ContractScenarioId } from "@/lib/contract-scenarios";
import { DEFAULT_SCENARIO_ID } from "@/lib/contract-scenarios";
import ResultsSection from "./components/results-section";
import PricingSection from "./components/pricing-section";
import SiteNav from "./components/site-nav";
import AuthPanel from "./components/auth-panel";
import ScenarioPicker from "./components/scenario-picker";
import WordLimitModal from "./components/word-limit-modal";
import CreditsRemainingBadge from "./components/credits-remaining-badge";
import WechatPayModal from "./components/wechat-pay-modal";
import { useCredits } from "@/hooks/use-credits";
import { useTopupPayment } from "@/hooks/use-topup-payment";
import { usePricingStore } from "@/stores/pricingStore";
import { stripeCurrencyKey } from "@/lib/pricing/plans";
import { stashPendingInviteCode } from "@/lib/invite/client-fingerprint";

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [contractText, setContractText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [scanCount, setScanCount] = useState<number | null>(null);
  const [scanStage, setScanStage] = useState(0);
  const [refining, setRefining] = useState(false);
  const [pro, setProState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ email: string; pro: boolean } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [scenario, setScenario] = useState<ContractScenarioId>(DEFAULT_SCENARIO_ID);
  const [quotaHint, setQuotaHint] = useState<string | null>(null);
  const [wordLimitOpen, setWordLimitOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const { invalidate: invalidateCredits } = useCredits();

  const [payingPlan, setPayingPlan] = useState<"pro" | "team" | "boost" | null>(null);
  const currency = usePricingStore((s) => s.currency);

  const payment = useTopupPayment({
    locale,
    onRequireAuth: () => setAuthOpen(true),
  });

  const handleAddOn = useCallback(async () => {
    setPayingPlan("boost");
    try {
      if (currency === "CNY") {
        await payment.startPayment("boost");
        return;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: "pay_per_use",
          currency: stripeCurrencyKey(currency),
          successUrl: `${window.location.origin}/${locale}/account?checkout=success`,
          cancelUrl: window.location.href,
        }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setPayingPlan(null);
    }
  }, [currency, locale, payment]);

  const refreshServerQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/quota", { credentials: "include" });
      if (!res.ok) return checkQuota();
      const status = (await res.json()) as ServerQuotaStatus;
      const quota = applyServerQuota(status);
      if (quota.tier === "pro" || quota.remaining === -1) {
        setQuotaHint(null);
      } else if (quota.tier === "pay_per_use") {
        setQuotaHint(
          quota.remaining > 0
            ? t("quota.payPerUseRemaining", { count: quota.remaining })
            : t("quota.limitReached")
        );
      } else if (status.inTrialPeriod) {
        setQuotaHint(t("quota.trialActive"));
      } else if (quota.remaining > 0) {
        setQuotaHint(t("quota.freeRemaining", { count: quota.remaining }));
      } else {
        setQuotaHint(t("quota.limitReached"));
      }
      return quota;
    } catch {
      return checkQuota();
    }
  }, [t]);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data.authenticated) {
        setAuthUser({ email: data.email, pro: data.pro });
        saveProEmail(data.email);
        syncProFromServer(!!data.pro);
        setProState(!!data.pro);
      } else {
        setAuthUser(null);
        // Pro badge from localStorage may still allow scans; user must sign in for history
        setProState(isPro());
      }
    } catch {
      setProState(isPro());
    }
  }, []);

  const saveReportToHistory = useCallback(
    async (scanResult: ScanResult, sourceFileName?: string | null) => {
      if (!pro && !authUser?.pro) return;
      if (!authUser) {
        setToast(t("auth.signInToSave"));
        return;
      }
      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            result: scanResult,
            locale,
            fileName: sourceFileName ?? file?.name ?? null,
          }),
        });
        if (res.ok) {
          setToast(t("reports.saved"));
        }
      } catch {
        /* non-blocking */
      }
    },
    [authUser, locale, file?.name, pro, t]
  );

  useEffect(() => {
    setProState(isPro());
    refreshAuth();
    refreshServerQuota();

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

      const inviteCode = params.get("invite");
      if (inviteCode) {
        stashPendingInviteCode(inviteCode);
        window.history.replaceState({}, "", window.location.pathname);
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
                trackEvent("checkout_completed", { type: "pro" });
                if (data.email) {
                  setAuthUser({ email: data.email, pro: true });
                  saveProEmail(data.email);
                }
              } else if (data.payPerUse) {
                setToast(t("quota.payPerUseSuccess"));
                trackEvent("checkout_completed", { type: "pay_per_use" });
                if (data.email) {
                  setAuthUser({ email: data.email, pro: false });
                }
              }
            } catch {
              setToast(t("quota.checkoutError"));
            }
          } else {
            setPro();
            setProState(true);
            setToast(t("quota.checkoutSuccess"));
          }
          await refreshAuth();
          await refreshServerQuota();
          window.history.replaceState({}, "", window.location.pathname);
        };
        finishCheckout();
      }

      const authParam = params.get("auth");
      if (authParam === "expired") {
        setToast(t("auth.expired"));
        setAuthOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      } else if (authParam === "invalid") {
        setToast(t("auth.invalid"));
        setAuthOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      } else if (authParam === "success") {
        setToast(t("auth.success"));
        refreshAuth();
        window.history.replaceState({}, "", window.location.pathname);
      } else if (authParam === "oauth_failed") {
        setToast(t("auth.oauth_failed"));
        setAuthOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      } else if (authParam === "oauth_unavailable") {
        setToast(t("auth.oauth_unavailable"));
        setAuthOpen(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [t, refreshAuth, refreshServerQuota]);

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
    setContractText(null);
    setRefining(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;

    const quota = await refreshServerQuota();
    if (!quota.allowed) {
      setError(t("quota.limitReached"));
      trackEvent("scan_quota_blocked", { tier: quota.tier });
      return;
    }

    trackEvent("scan_started", { scenario, locale });
    setLoading(true);
    setError(null);
    setScanStage(1);

    const stageTimer = setTimeout(() => setScanStage(2), 900);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("locale", locale);
      form.append("scenario", scenario);

      const res = await fetch("/api/scan", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as
        | (ScanResult & { contractText?: string; refineNeeded?: boolean })
        | ScanError;

      if (!res.ok) {
        const errData = data as ScanError & {
          code?: string;
          error?: string;
          message?: string;
        };
        if (res.status === 413 && errData.error === "WORD_LIMIT_EXCEEDED") {
          setWordLimitOpen(true);
          setScanStage(0);
          setLoading(false);
          clearTimeout(stageTimer);
          return;
        }
        if (errData.code === "QUOTA_EXCEEDED") {
          trackEvent("scan_quota_blocked", { tier: "free" });
          await refreshServerQuota();
        }
        if (res.status === 402 && errData.error === "INSUFFICIENT_CREDITS") {
          await invalidateCredits();
        }
        throw new Error(errData.error || errData.message || "Scan failed");
      }

      const {
        contractText: extractedText,
        refineNeeded,
        ...scanResult
      } = data as ScanResult & { contractText?: string; refineNeeded?: boolean };

      if (extractedText) setContractText(extractedText);
      setResult(scanResult as ScanResult);
      recordScan();
      setScanCount((c) => (typeof c === "number" ? c + 1 : c));
      setScanStage(3);
      setLoading(false);
      trackEvent("scan_completed", { scenario, flags: scanResult.flags?.length ?? 0 });
      saveReportToHistory(scanResult, file.name);
      await refreshServerQuota();
      await invalidateCredits();

      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);

      if (refineNeeded && extractedText) {
        setRefining(true);
        setScanStage(4);
        try {
          const refineRes = await fetch("/api/scan/refine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              result: scanResult,
              contractText: extractedText,
              locale,
              scenarioId: scenario,
            }),
          });
          const refined = (await refineRes.json()) as ScanResult & { error?: string };
          if (!refineRes.ok) throw new Error(refined.error || "Refine failed");
          setResult(refined);
          trackEvent("scan_refine_completed", { scenario });
          saveReportToHistory(refined, file.name);
        } catch (refineErr: unknown) {
          const msg =
            refineErr instanceof Error ? refineErr.message : "Refine failed";
          setToast(
            locale === "zh"
              ? `深度优化未完成（${msg}），当前为初版分析结果`
              : `Deep refine incomplete (${msg}); showing first-pass results`
          );
          window.setTimeout(() => setToast(null), 6000);
        } finally {
          setRefining(false);
          setScanStage(0);
        }
      } else {
        setScanStage(0);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Scan failed, please retry";
      setError(message);
      setScanStage(0);
    } finally {
      clearTimeout(stageTimer);
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!result) return;
    trackEvent("report_pdf_download", { locale });
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
    trackEvent("checkout_started", { priceId, currency });
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
  const isProUser = !!(authUser?.pro || (pro && !authUser) || pro);
  const showProBadge = authUser?.pro || pro;

  return (
    <>
      <SiteNav
        locale={locale}
        authUser={authUser}
        showProBadge={showProBadge}
        onSignIn={() => setAuthOpen(true)}
        onLogout={handleLogout}
      />

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
          <Link
            href={`/${locale}/sample-report`}
            className="inline-block mt-3 text-sm text-accent hover:underline font-sans"
          >
            {t("hero.sampleReport")} →
          </Link>
          {locale === "zh" && (
            <p className="text-xs text-ink-muted mt-2 font-sans">{t("hero.zhNote")}</p>
          )}
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
          <p className="text-ink-light mb-2">{t("upload.subtitle")}</p>
          {quotaHint && !isProUser && (
            <p className="text-sm text-ink-muted font-sans mb-6">{quotaHint}</p>
          )}
          {!quotaHint && <div className="mb-8" />}

          <ScenarioPicker
            value={scenario}
            onChange={setScenario}
            disabled={loading}
          />

          <form onSubmit={handleSubmit} className="mt-8">
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
              <CreditsRemainingBadge />
              <button
                type="submit"
                disabled={!file || loading}
                className={`btn btn-primary w-full sm:w-auto sm:min-w-[200px] btn-lg ${
                  !file || loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {loading ? t("upload.scanning") : t("upload.scanButton")}
              </button>
            </div>

            {error && (
              <p className="text-red-600 text-sm mt-4 text-center font-sans">{error}</p>
            )}
          </form>

          {(loading || refining) && (
            <div className="mt-8">
              <div className="progress-stages">
                <ProgressStage
                  label={t("progress.extracting")}
                  active={scanStage >= 1}
                  done={scanStage > 1}
                />
                <ProgressStage
                  label={t("progress.firstPass")}
                  active={scanStage >= 2}
                  done={scanStage > 2}
                />
                <ProgressStage
                  label={t("progress.reportReady")}
                  active={scanStage >= 3}
                  done={scanStage > 3 || refining}
                />
                <ProgressStage
                  label={t("progress.refiningDeep")}
                  active={refining || scanStage >= 4}
                  done={!refining && scanStage === 0 && !!result}
                />
              </div>
              <div className="scanning-text mt-4">
                {refining ? t("progress.refiningHint") : t("upload.scanningText")}
              </div>
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
                  setRefining(false);
                  setScanStage(0);
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
          contractText={contractText}
          sourceFile={file}
          riskCls={riskCls}
          isPro={isProUser}
          locale={locale}
          refining={refining}
          onDownload={handleDownloadPdf}
          scrollTo={scrollTo}
          onUpgradePro={() => scrollTo("pricing")}
          onPayPerUse={() => void handleAddOn()}
          sectionRef={resultsRef}
        />
      )}

      <PricingSection
        locale={locale}
        scrollTo={scrollTo}
        onAddOn={() => void handleAddOn()}
        onRequireAuth={() => setAuthOpen(true)}
        payingPlan={payingPlan ?? payment.payingPlan}
      />

      <WechatPayModal
        open={payment.modalOpen}
        plan={payment.activePlan ?? payment.pendingPlan}
        status={payment.modalStatus}
        qrCodeUrl={payment.qrCodeUrl}
        orderId={payment.orderId}
        errorMessage={payment.errorMessage}
        onClose={payment.closeModal}
        onRetry={payment.retryPayment}
      />

      <WordLimitModal
        open={wordLimitOpen}
        locale={locale}
        onClose={() => setWordLimitOpen(false)}
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
          <span>{payment.toast ?? toast}</span>
        </div>
      )}

      <AuthPanel
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        locale={locale}
        initialEmail={authUser?.email || getProEmail() || ""}
        onSuccess={() => {
          setAuthOpen(false);
          void refreshAuth();
          if (payment.pendingPlan) {
            void payment.startPayment(payment.pendingPlan);
          }
        }}
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
