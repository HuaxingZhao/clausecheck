"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import { EXPERT_PROMPT_VERSION_BASE } from "@/lib/feedback/prompt-version";
import type { ReviewFeedbackMeta } from "@/lib/feedback/types";
import { isDpaMissingClause, isDpaMissingFlag } from "@/lib/dpa/detect-dpa";

import UpgradeBanner from "./upgrade-banner";
import { trackEvent } from "@/lib/analytics";
import ReportDeliverySection from "./report-delivery-section";
import ContractReviewSection from "./contract-review-section";
import ResultsReportHero from "./results-report-hero";
import ResultsActionPlan from "./results-action-plan";
import ResultsFlagsPanel from "./results-flags-panel";
import ResultsSupplementaryPanel from "./results-supplementary-panel";
import ResultsRefiningBanner from "./results-refining-banner";
import { ReviewFeedbackProvider } from "./review-feedback-provider";
import GenerateDpaModal from "./generate-dpa-modal";

interface ResultsSectionProps {
  result: ScanResult;
  contractText?: string | null;
  sourceFile?: File | null;
  riskCls: string;
  isPro: boolean;
  locale: string;
  refining?: boolean;
  isAuthenticated?: boolean;
  onToast?: (message: string) => void;
  onDownload: () => void;
  scrollTo: (id: string) => void;
  onUpgradePro?: () => void;
  onPayPerUse?: () => void;
  sectionRef?: React.RefObject<HTMLElement>;
}

function resolveFeedbackMeta(result: ScanResult): ReviewFeedbackMeta {
  if (result.feedbackMeta) return result.feedbackMeta;
  return {
    promptVersion: EXPERT_PROMPT_VERSION_BASE,
    jurisdiction: result.detectedJurisdiction || "unknown",
    ragMetadata: {
      packId: "unknown",
      retrievedChunkIds: [],
      degraded: false,
    },
  };
}

export default function ResultsSection({
  result,
  contractText,
  sourceFile = null,
  riskCls,
  isPro,
  locale,
  onDownload,
  scrollTo,
  onUpgradePro,
  onPayPerUse,
  sectionRef,
  refining = false,
  isAuthenticated = false,
  onToast,
}: ResultsSectionProps) {
  const t = useTranslations();
  const feedbackMeta = resolveFeedbackMeta(result);
  const [dpaOpen, setDpaOpen] = useState(false);

  const showDpaCta =
    (result.missingClauses ?? []).some(isDpaMissingClause) ||
    result.flags.some(isDpaMissingFlag);

  return (
    <section ref={sectionRef} id="results" className="py-20 bg-paper-dark fade-section">
      <div className="page-content-wide">
        <div className="section-label">{t("results.label")}</div>
        <h2 className="results-page-title mb-6">{t("results.title")}</h2>

        <ReviewFeedbackProvider
          contractText={contractText}
          feedbackMeta={feedbackMeta}
          isAuthenticated={isAuthenticated}
          onToast={onToast}
        >
          {refining && <ResultsRefiningBanner />}

          {!isPro && onUpgradePro && (
            <UpgradeBanner
              result={result}
              onUpgrade={onUpgradePro}
              onPayPerUse={onPayPerUse}
            />
          )}

          <ResultsReportHero
            result={result}
            riskCls={riskCls}
            refining={refining}
            onStartReview={() => {
              trackEvent("review_opened", { locale });
              scrollTo("contract-review");
            }}
            onDownload={onDownload}
          />

          <ResultsActionPlan result={result} />

          <ResultsFlagsPanel
            flags={result.flags}
            timeTerms={result.timeTerms}
            onGenerateDpa={showDpaCta ? () => setDpaOpen(true) : undefined}
          />

          <ResultsSupplementaryPanel
            result={result}
            onGenerateDpa={showDpaCta ? () => setDpaOpen(true) : undefined}
          />

          <ReportDeliverySection
            result={result}
            locale={locale}
            isPro={isPro}
            refining={refining}
            onDownload={onDownload}
          />

          <ContractReviewSection
            result={result}
            contractText={contractText ?? null}
            locale={locale}
            isPro={isPro}
            refining={refining}
            sourceFile={sourceFile}
            onUpgrade={onUpgradePro}
            onBackToAnalysis={() => scrollTo("results")}
          />
        </ReviewFeedbackProvider>

        {showDpaCta && (
          <GenerateDpaModal
            open={dpaOpen}
            onOpenChange={setDpaOpen}
            result={result}
            locale={locale}
            isPro={isPro}
            onUpgrade={onUpgradePro}
          />
        )}

        {!isPro && (
          <div className="text-center mt-12">
            <p className="text-sm text-ink-light mb-4 font-sans">
              {t("results.trialHint")}
            </p>
            <button
              onClick={() => scrollTo("pricing")}
              className="btn btn-primary btn-lg"
            >
              {t("results.viewPricing")}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
