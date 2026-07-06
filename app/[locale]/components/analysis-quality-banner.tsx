"use client";

import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";

interface AnalysisQualityBannerProps {
  result: ScanResult;
}

export default function AnalysisQualityBanner({ result }: AnalysisQualityBannerProps) {
  const t = useTranslations("quality");
  const stats = result.qualityStats;
  if (!stats) return null;

  return (
    <div className="analysis-quality-banner">
      <p className="text-sm font-sans font-medium text-ink mb-1">{t("title")}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-sans text-ink-light">
        <span>
          {t("highConfidence", { count: stats.highConfidence, total: stats.totalFlags })}
        </span>
        {stats.needsReview > 0 && (
          <span className="text-amber-800">{t("needsReview", { count: stats.needsReview })}</span>
        )}
        <span>{t("clauseReady", { count: stats.clauseReadySuggestions })}</span>
      </div>
      {result.refineNotes && (
        <p className="text-xs text-ink-muted font-sans mt-2 leading-relaxed border-t border-border/30 pt-2">
          {t("refineNotes")}: {result.refineNotes}
        </p>
      )}
      <p className="text-[11px] text-ink-muted font-sans mt-2">{t("hint")}</p>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
  t,
}: {
  confidence?: string;
  t: ReturnType<typeof useTranslations<"quality">>;
}) {
  if (!confidence) return null;
  const cls =
    confidence === "high"
      ? "confidence-badge--high"
      : confidence === "low"
        ? "confidence-badge--low"
        : "confidence-badge--medium";
  return (
    <span className={`confidence-badge ${cls}`}>
      {t(`confidence_${confidence as "high" | "medium" | "low"}`)}
    </span>
  );
}

export { ConfidenceBadge };
