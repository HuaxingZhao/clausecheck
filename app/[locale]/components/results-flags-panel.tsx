"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { RiskFlag, TimeTerm } from "@/lib/types";
import { ConfidenceBadge } from "./analysis-quality-banner";
import ReviewFeedbackButtons from "./review-feedback-buttons";
import { useReviewFeedback } from "./review-feedback-provider";
import GenerateDpaCta from "./generate-dpa-cta";
import { isDpaMissingFlag } from "@/lib/dpa/detect-dpa";

interface ResultsFlagsPanelProps {
  flags: RiskFlag[];
  timeTerms?: TimeTerm[];
  onGenerateDpa?: () => void;
}

const timeIcons: Record<string, string> = {
  auto_renewal: "🔄",
  deadline: "⏰",
  expiration: "📅",
  notice_period: "📬",
};

function flagCls(f: RiskFlag): string {
  if (f.level === "high") return "flag-high";
  if (f.level === "medium") return "flag-medium";
  if (f.level === "low") return "flag-low";
  return "";
}

function FlagRow({
  flag,
  flagId,
  levelLabel,
  t,
  tQuality,
  compact,
  onGenerateDpa,
}: {
  flag: RiskFlag;
  flagId: string;
  levelLabel: (level: string) => string;
  t: ReturnType<typeof useTranslations<"results">>;
  tQuality: ReturnType<typeof useTranslations<"quality">>;
  compact?: boolean;
  onGenerateDpa?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!(flag.quote || flag.impact || flag.suggestion || flag.legalBasis);
  const fb = useReviewFeedback();
  const showDpa = Boolean(onGenerateDpa && isDpaMissingFlag(flag));

  return (
    <div className={`flag-item flag-item--panel ${flagCls(flag)}`}>
      <button
        type="button"
        className="flag-item-row"
        onClick={() => hasDetail && setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!hasDetail}
      >
        <span className="flag-icon">{flag.icon}</span>
        <div className="flex-1 min-w-0 text-left">
          {flag.category && <span className="flag-category">{flag.category}</span>}
          <span className="flag-text">{flag.text}</span>
        </div>
        {flag.level && (
          <span className={`flag-level-badge ${flag.level}`}>{levelLabel(flag.level)}</span>
        )}
        {hasDetail && (
          <span className="flag-expand-icon" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        )}
      </button>
      {open && hasDetail && (
        <div className="flag-item-detail">
          <ConfidenceBadge confidence={flag.confidence} t={tQuality} />
          {flag.quote && (
            <p className="flag-quote">「{flag.quote}」</p>
          )}
          {flag.impact && (
            <p className="flag-meta">
              <strong>{t("impact")}:</strong> {flag.impact}
            </p>
          )}
          {flag.legalBasis && !compact && (
            <p className="flag-meta">
              <strong>{t("legalBasis")}:</strong> {flag.legalBasis}
            </p>
          )}
          {flag.suggestion && (
            <p className="flag-suggestion">{flag.suggestion}</p>
          )}
        </div>
      )}
      {showDpa && onGenerateDpa && (
        <div className="px-2 pb-1">
          <GenerateDpaCta onClick={onGenerateDpa} compact />
        </div>
      )}
      <ReviewFeedbackButtons
        contractHash={fb.contractHash}
        feedbackMeta={fb.feedbackMeta}
        isAuthenticated={fb.isAuthenticated}
        onToast={fb.onToast}
        targetType="flag"
        targetId={flagId}
        compact
      />
    </div>
  );
}

export default function ResultsFlagsPanel({
  flags,
  timeTerms,
  onGenerateDpa,
}: ResultsFlagsPanelProps) {
  const t = useTranslations("results");
  const tQuality = useTranslations("quality");
  const [showLow, setShowLow] = useState(false);

  function levelLabel(level: string) {
    if (level === "high") return t("riskLevelHigh");
    if (level === "medium") return t("riskLevelMedium");
    if (level === "low") return t("riskLevelLow");
    return "";
  }

  const high = flags.filter((f) => f.level === "high");
  const medium = flags.filter((f) => f.level === "medium");
  const low = flags.filter((f) => f.level === "low");
  const other = flags.filter((f) => !f.level || !["high", "medium", "low"].includes(f.level));

  const urgentTime = (timeTerms ?? []).filter((term) => term.risk === "high" || term.risk === "medium");
  const restTime = (timeTerms ?? []).filter((term) => term.risk === "low");

  return (
    <div className="result-card mb-6 report-flags-panel">
      {urgentTime.length > 0 && (
        <div className="time-terms-compact mb-5">
          <h4 className="time-terms-compact-title">{t("timeTermsTitle")}</h4>
          <div className="time-terms-compact-list">
            {urgentTime.map((term, i) => (
              <div key={i} className="time-term-chip">
                <span className="time-term-chip-icon" aria-hidden>
                  {timeIcons[term.type] || "📌"}
                </span>
                <span className="time-term-chip-type">{t(`timeTerms.${term.type}`)}</span>
                <span className="time-term-chip-desc">
                  {term.description}
                  {term.date ? ` · ${term.date}` : ""}
                </span>
                <span className={`time-badge time-term-chip-badge ${term.risk}`}>
                  {levelLabel(term.risk)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h4 className="report-flags-title mb-3">
        {t("flagsFound", { count: flags.length })}
      </h4>
      <p className="report-flags-hint">{t("flagsPanelHint")}</p>

      {[...high, ...medium, ...other].map((f, i) => (
        <FlagRow
          key={`hm-${i}`}
          flag={f}
          flagId={f.clauseId?.trim() || `flag-${f.level || "x"}-${i}`}
          levelLabel={levelLabel}
          t={t}
          tQuality={tQuality}
          onGenerateDpa={onGenerateDpa}
        />
      ))}

      {low.length > 0 && (
        <>
          {!showLow ? (
            <button
              type="button"
              className="report-flags-low-toggle"
              onClick={() => setShowLow(true)}
            >
              {t("showLowRiskFlags", { count: low.length })}
            </button>
          ) : (
            <>
              {low.map((f, i) => (
                <FlagRow
                  key={`low-${i}`}
                  flag={f}
                  flagId={f.clauseId?.trim() || `flag-low-${i}`}
                  levelLabel={levelLabel}
                  t={t}
                  tQuality={tQuality}
                  compact
                  onGenerateDpa={onGenerateDpa}
                />
              ))}
              <button
                type="button"
                className="report-flags-low-toggle"
                onClick={() => setShowLow(false)}
              >
                {t("hideLowRiskFlags")}
              </button>
            </>
          )}
        </>
      )}

      {flags.length === 0 && (
        <p className="text-sm text-ink-light font-sans py-4">{t("noFlags")}</p>
      )}

      {restTime.length > 0 && (
        <details className="report-time-rest mt-4">
          <summary className="report-time-rest-summary">{t("timeTermsMore")}</summary>
          <div className="time-terms-compact-list mt-2">
            {restTime.map((term, i) => (
              <div key={i} className="time-term-chip">
                <span className="time-term-chip-icon" aria-hidden>
                  {timeIcons[term.type] || "📌"}
                </span>
                <span className="time-term-chip-type">{t(`timeTerms.${term.type}`)}</span>
                <span className="time-term-chip-desc">{term.description}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
