"use client";

import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import ContractReviewView from "./contract-review-view";

interface ContractReviewSectionProps {
  result: ScanResult;
  contractText: string | null;
  locale: string;
  isPro: boolean;
  refining?: boolean;
  sourceFile: File | null;
  onUpgrade?: () => void;
  onBackToAnalysis?: () => void;
}

export default function ContractReviewSection({
  result,
  contractText,
  locale,
  isPro,
  refining = false,
  sourceFile,
  onUpgrade,
  onBackToAnalysis,
}: ContractReviewSectionProps) {
  const t = useTranslations("review");
  const tProgress = useTranslations("progress");
  const hasReviewData =
    (result.contractReview?.source?.trim() && (result.contractReview?.stats.total ?? 0) > 0) ||
    !!contractText?.trim();
  const count =
    result.contractReview?.stats.total ??
    (result.flags.length +
      (result.negotiations?.length ?? 0) +
      (result.missingClauses?.length ?? 0));

  if (!hasReviewData || count === 0) return null;

  return (
    <section
      className="contract-review-section"
      id="contract-review"
      aria-labelledby="contract-review-heading"
    >
      <header className="contract-review-hero">
        <div className="contract-review-hero-inner">
          <div className="contract-review-hero-badge">{t("stepLabel")}</div>
          <h2 id="contract-review-heading" className="contract-review-hero-title">
            {t("sectionTitle")}
          </h2>
          <p className="contract-review-hero-purpose">{t("sectionPurpose")}</p>
          <p className="contract-review-hero-meta">{t("sectionSubtitle")}</p>
        </div>
        <div className="contract-review-hero-stat" aria-hidden>
          <span className="contract-review-hero-stat-num">{count}</span>
          <span className="contract-review-hero-stat-label">{t("itemsLabel")}</span>
        </div>
      </header>

      <div className="relative">
        {refining && (
          <div className="contract-review-refining-overlay" role="status">
            <span className="results-refining-spinner" aria-hidden />
            <p className="text-sm font-sans font-medium text-ink">{tProgress("refining")}</p>
          </div>
        )}
        <ContractReviewView
          result={result}
          contractText={contractText}
          locale={locale}
          isPro={isPro}
          sourceFile={sourceFile}
          onUpgrade={onUpgrade}
          onBackToAnalysis={onBackToAnalysis}
        />
      </div>
    </section>
  );
}
