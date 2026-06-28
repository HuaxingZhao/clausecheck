"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ScanResult, ReviseResult, ContractChange } from "@/lib/types";

interface ReviseSectionProps {
  result: ScanResult;
  contractText: string | null;
  isPro: boolean;
  locale: string;
  onUpgradePro?: () => void;
  onPayPerUse?: () => void;
}

export default function ReviseSection({
  result,
  contractText,
  isPro,
  locale,
  onUpgradePro,
  onPayPerUse,
}: ReviseSectionProps) {
  const t = useTranslations("revise");

  const flagIndices = useMemo(
    () =>
      result.flags
        .map((f, i) => (f.suggestion ? i : -1))
        .filter((i) => i >= 0),
    [result.flags]
  );

  const negoIndices = useMemo(
    () => (result.negotiations || []).map((_, i) => i),
    [result.negotiations]
  );

  const missingIndices = useMemo(
    () => (result.missingClauses || []).map((_, i) => i),
    [result.missingClauses]
  );

  const [selectedFlags, setSelectedFlags] = useState<Set<number>>(
    () => new Set(flagIndices)
  );
  const [selectedNegos, setSelectedNegos] = useState<Set<number>>(
    () => new Set(negoIndices)
  );
  const [selectedMissing, setSelectedMissing] = useState<Set<number>>(
    () => new Set(missingIndices)
  );

  const [revising, setRevising] = useState(false);
  const [reviseResult, setReviseResult] = useState<ReviseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewGate, setShowPreviewGate] = useState(false);

  const totalSelected =
    selectedFlags.size + selectedNegos.size + selectedMissing.size;

  const hasSuggestions =
    flagIndices.length > 0 || negoIndices.length > 0 || missingIndices.length > 0;

  if (!hasSuggestions) return null;

  function toggleSet(set: Set<number>, index: number, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(index);
    else next.delete(index);
    return next;
  }

  async function handleGenerate() {
    if (!contractText) {
      setError(t("noContractText"));
      return;
    }
    if (totalSelected === 0) {
      setError(t("selectAtLeastOne"));
      return;
    }
    if (!isPro) {
      setShowPreviewGate(true);
      return;
    }

    setRevising(true);
    setError(null);
    setReviseResult(null);

    try {
      const res = await fetch("/api/revise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-tier": isPro ? "pro" : "free",
        },
        body: JSON.stringify({
          contractText,
          result,
          locale,
          acceptedFlags: Array.from(selectedFlags),
          acceptedNegotiations: Array.from(selectedNegos),
          acceptedMissingClauses: Array.from(selectedMissing),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("failed"));
      }
      setReviseResult(data as ReviseResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("failed");
      setError(message);
    } finally {
      setRevising(false);
    }
  }

  return (
    <div className="summary-card mb-6 mt-8 border-l-4 border-accent">
      <div className="text-xs font-sans font-semibold uppercase tracking-wide text-ink-muted mb-2">
        {t("stepLabel")}
      </div>
      <h4 className="mb-2">{t("title")}</h4>
      <p className="text-sm text-ink-light mb-5 leading-relaxed">{t("subtitle")}</p>

      {!contractText && (
        <p className="text-sm text-amber-700 bg-amber-50/80 rounded-lg p-3 mb-4 font-sans">
          {t("noContractText")}
        </p>
      )}

      <div className="space-y-4 mb-6">
        {flagIndices.length > 0 && (
          <RevisionGroup
            title={t("flagsGroup")}
            count={selectedFlags.size}
            total={flagIndices.length}
          >
            {flagIndices.map((i) => {
              const f = result.flags[i];
              return (
                <RevisionItem
                  key={`flag-${i}`}
                  checked={selectedFlags.has(i)}
                  onChange={(checked) =>
                    setSelectedFlags(toggleSet(selectedFlags, i, checked))
                  }
                  label={f.text}
                  detail={f.suggestion}
                  quote={f.quote}
                />
              );
            })}
          </RevisionGroup>
        )}

        {negoIndices.length > 0 && result.negotiations && (
          <RevisionGroup
            title={t("negotiationsGroup")}
            count={selectedNegos.size}
            total={negoIndices.length}
          >
            {negoIndices.map((i) => {
              const n = result.negotiations![i];
              return (
                <RevisionItem
                  key={`nego-${i}`}
                  checked={selectedNegos.has(i)}
                  onChange={(checked) =>
                    setSelectedNegos(toggleSet(selectedNegos, i, checked))
                  }
                  label={n.clause}
                  detail={n.suggested}
                  quote={n.current}
                />
              );
            })}
          </RevisionGroup>
        )}

        {missingIndices.length > 0 && result.missingClauses && (
          <RevisionGroup
            title={t("missingGroup")}
            count={selectedMissing.size}
            total={missingIndices.length}
          >
            {missingIndices.map((i) => {
              const c = result.missingClauses![i];
              return (
                <RevisionItem
                  key={`missing-${i}`}
                  checked={selectedMissing.has(i)}
                  onChange={(checked) =>
                    setSelectedMissing(toggleSet(selectedMissing, i, checked))
                  }
                  label={c.name}
                  detail={c.suggestion}
                />
              );
            })}
          </RevisionGroup>
        )}
      </div>

      {showPreviewGate && !isPro && (
        <div className="upgrade-banner mb-4">
          <div className="upgrade-banner-inner">
            <div>
              <p className="font-sans font-semibold text-ink mb-1">{t("proGateTitle")}</p>
              <p className="text-sm text-ink-light leading-relaxed">{t("proGateBody")}</p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {onUpgradePro && (
                <button type="button" onClick={onUpgradePro} className="btn btn-primary">
                  {t("proGateCta")}
                </button>
              )}
              {onPayPerUse && (
                <button type="button" onClick={onPayPerUse} className="btn btn-outline text-sm">
                  {t("proGateOnce")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mb-4 text-center font-sans">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={revising || !contractText || totalSelected === 0}
          className={`btn btn-primary ${revising ? "opacity-60 cursor-wait" : ""}`}
        >
          {revising ? t("generating") : t("generateButton")}
        </button>
        <span className="text-xs text-ink-muted font-sans">
          {t("selectedCount", { count: totalSelected })}
        </span>
      </div>

      {reviseResult && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <h4 className="mb-4">{t("revisedTitle")}</h4>

          {reviseResult.changes.length > 0 && (
            <div className="space-y-4 mb-6">
              <p className="text-xs text-ink-muted font-sans mb-3">{t("diffLegend")}</p>
              {reviseResult.changes.map((change, i) => (
                <div key={i} className="diff-block">
                  {change.section && (
                    <div className="diff-section-label">{change.section}</div>
                  )}
                  {change.original && (
                    <div className="diff-old">
                      <span className="diff-label">{t("diffRemoved")}</span>
                      {change.original}
                    </div>
                  )}
                  <div className="diff-new">
                    <span className="diff-label">{t("diffAdded")}</span>
                    {change.revised}
                  </div>
                  {change.reason && (
                    <p className="diff-reason px-4 py-2 text-xs text-ink-muted font-sans italic border-t border-border/20">
                      {change.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <SuggestionsDelivery
            changes={reviseResult.changes}
            locale={locale}
            isPro={isPro}
          />
        </div>
      )}
    </div>
  );
}

function RevisionGroup({
  title,
  count,
  total,
  children,
}: {
  title: string;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  const t = useTranslations("revise");
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-sans font-semibold text-ink">{title}</span>
        <span className="text-xs text-ink-muted font-sans">
          {t("groupCount", { selected: count, total })}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RevisionItem({
  checked,
  onChange,
  label,
  detail,
  quote,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  detail?: string;
  quote?: string;
}) {
  return (
    <label className="revision-item">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="revision-checkbox"
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-sans font-medium text-ink">{label}</span>
        {quote && (
          <span className="block text-xs text-ink-muted mt-0.5 font-sans">「{quote}」</span>
        )}
        {detail && (
          <span className="block text-xs text-accent-dark mt-1 font-sans leading-relaxed">
            → {detail}
          </span>
        )}
      </div>
    </label>
  );
}

function SuggestionsDelivery({
  changes,
  locale,
  isPro,
}: {
  changes: ContractChange[];
  locale: string;
  isPro: boolean;
}) {
  const t = useTranslations("revise");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);
  const [sent, setSent] = useState(false);
  const [devWarning, setDevWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(format: "pdf" | "docx") {
    setDownloading(format);
    setError(null);
    try {
      const res = await fetch("/api/revise/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-tier": isPro ? "pro" : "free",
        },
        body: JSON.stringify({ format, changes, locale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("downloadFailed"));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const zh = locale === "zh";
      a.download =
        format === "pdf"
          ? zh
            ? "ClauseCheck-修订建议清单.pdf"
            : "ClauseCheck-Suggestions.pdf"
          : zh
            ? "ClauseCheck-修订建议清单.docx"
            : "ClauseCheck-Suggestions.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("downloadFailed"));
    } finally {
      setDownloading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDevWarning(null);
    try {
      const res = await fetch("/api/revise/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-tier": isPro ? "pro" : "free",
        },
        body: JSON.stringify({ email, changes, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("emailFailed"));
      if (data.delivered === false) {
        setDevWarning(data.message || t("emailNotConfigured"));
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("emailFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-border/50">
      <div className="text-xs font-sans font-semibold uppercase tracking-wide text-ink-muted mb-2">
        {t("emailStepLabel")}
      </div>
      <h4 className="mb-2">{t("deliveryTitle")}</h4>
      <p className="text-sm text-ink-light mb-5 leading-relaxed font-sans">{t("deliverySubtitle")}</p>

      {/* Download the suggestions report */}
      <div className="delivery-row">
        <span className="delivery-row-label">{t("rowSuggestions")}</span>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleDownload("pdf")}
            disabled={!!downloading}
            className={`btn btn-primary shrink-0 ${downloading === "pdf" ? "opacity-60 cursor-wait" : ""}`}
          >
            {downloading === "pdf" ? t("downloading") : t("downloadSuggestionsPdf")}
          </button>
          <button
            type="button"
            onClick={() => handleDownload("docx")}
            disabled={!!downloading}
            className={`btn btn-outline shrink-0 ${downloading === "docx" ? "opacity-60 cursor-wait" : ""}`}
          >
            {downloading === "docx" ? t("downloading") : t("downloadSuggestionsDocx")}
          </button>
        </div>
      </div>

      {/* History link */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 text-sm font-sans">
        <Link href={`/${locale}/revisions`} className="link-accent">
          {t("historySuggestions")}
        </Link>
      </div>

      <div className="pt-5 border-t border-border/40">
        <p className="text-sm text-ink-light mb-3 font-sans">{t("emailHint")}</p>

        {sent ? (
          devWarning ? (
            <p className="text-sm text-amber-800 bg-amber-50/80 rounded-lg p-3 font-sans">
              {devWarning}
            </p>
          ) : (
            <p className="text-sm text-green-800 bg-green-50/80 rounded-lg p-3 font-sans">
              {t("emailSent", { email })}
            </p>
          )
        ) : (
          <form onSubmit={handleSubmit} className="email-report-form">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailPlaceholder")}
                className="auth-input flex-1"
              />
              <button type="submit" disabled={loading} className="btn btn-outline shrink-0">
                {loading ? t("emailSending") : t("emailSend")}
              </button>
            </div>
          </form>
        )}
        {error && <p className="text-red-600 text-xs mt-2 font-sans">{error}</p>}
      </div>
    </div>
  );
}
