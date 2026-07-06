"use client";

import { useTranslations } from "next-intl";
import type { ScanResult, RiskFlag } from "@/lib/types";

import UpgradeBanner from "./upgrade-banner";
import ReportDeliverySection from "./report-delivery-section";
import ContractReviewSection from "./contract-review-section";
import ResultsReportHero from "./results-report-hero";
import ResultsActionPlan from "./results-action-plan";
import ResultsFlagsPanel from "./results-flags-panel";
import ResultsSupplementaryPanel from "./results-supplementary-panel";
import ResultsRefiningBanner from "./results-refining-banner";

interface ResultsSectionProps {
  result: ScanResult;
  contractText?: string | null;
  sourceFile?: File | null;
  riskCls: string;
  isPro: boolean;
  locale: string;
  refining?: boolean;
  onDownload: () => void;
  scrollTo: (id: string) => void;
  onUpgradePro?: () => void;
  onPayPerUse?: () => void;
  sectionRef?: React.RefObject<HTMLElement>;
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
}: ResultsSectionProps) {
  const t = useTranslations();

  return (
    <section ref={sectionRef} id="results" className="py-20 bg-paper-dark fade-section">
      <div className="page-content-wide">
        <div className="section-label">{t("results.label")}</div>
        <h2 className="results-page-title mb-6">{t("results.title")}</h2>

        {refining && <ResultsRefiningBanner />}

        {!isPro && onUpgradePro && (
          <UpgradeBanner
            result={result}
            onUpgrade={onUpgradePro}
            onPayPerUse={onPayPerUse}
          />
        )}

        {/* 1. 结论：签不签 + 分数 + 元信息 + 主 CTA */}
        <ResultsReportHero
          result={result}
          riskCls={riskCls}
          refining={refining}
          onStartReview={() => scrollTo("contract-review")}
          onDownload={onDownload}
        />

        {/* 2. 行动：最坏情况 + 谈判 + 缺失 + 下一步 */}
        <ResultsActionPlan result={result} />

        {/* 3. 证据：时间敏感 + 风险条款（高/中默认，低折叠） */}
        <ResultsFlagsPanel flags={result.flags} timeTerms={result.timeTerms} />

        {/* 4. 补充：有利条款、完整谈判、交叉验证等（默认收起） */}
        <ResultsSupplementaryPanel result={result} />

        {/* 5. 导出报告 */}
        <ReportDeliverySection
          result={result}
          locale={locale}
          isPro={isPro}
          refining={refining}
          onDownload={onDownload}
        />

        {/* 6. 合同审阅 */}
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
