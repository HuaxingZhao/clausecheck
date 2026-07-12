"use client";

import { useTranslations } from "next-intl";
import type { ScanResult, SigningRecommendation } from "@/lib/types";
import { getScenario } from "@/lib/contract-scenarios";
import ReviewFeedbackButtons from "./review-feedback-buttons";
import { useReviewFeedback } from "./review-feedback-provider";

interface ResultsReportHeroProps {
  result: ScanResult;
  riskCls: string;
  refining?: boolean;
  onStartReview: () => void;
  onDownload: () => void;
}

function signingLabel(
  rec: SigningRecommendation,
  t: ReturnType<typeof useTranslations<"decision">>
): string {
  if (rec === "sign") return t("signingSign");
  if (rec === "sign_with_changes") return t("signingSignWithChanges");
  return t("signingDoNotSign");
}

function localizeScoreText(
  text: string,
  t: ReturnType<typeof useTranslations<"results">>
): string {
  const map: Record<string, string> = {
    高风险: t("scoreHigh"),
    中风险: t("scoreMedium"),
    低风险: t("scoreLow"),
    "High Risk": t("scoreHigh"),
    "Medium Risk": t("scoreMedium"),
    "Low Risk": t("scoreLow"),
  };
  return map[text] || text;
}

export default function ResultsReportHero({
  result,
  riskCls,
  refining = false,
  onStartReview,
  onDownload,
}: ResultsReportHeroProps) {
  const t = useTranslations("results");
  const tDecision = useTranslations("decision");
  const tScenarios = useTranslations("scenarios");
  const tQuality = useTranslations("quality");
  const fb = useReviewFeedback();

  const scenario = result.scenarioId ? getScenario(result.scenarioId) : null;
  const stats = result.qualityStats;
  const highCount = result.flags.filter((f) => f.level === "high").length;
  const medCount = result.flags.filter((f) => f.level === "medium").length;
  const lowCount = result.flags.filter((f) => f.level === "low").length;

  const summaryLine =
    result.signingRationale?.trim() ||
    result.executiveSummary?.trim() ||
    "";

  return (
    <div className="report-hero mb-6">
      <div className="report-hero-top">
        <div className="report-hero-verdict-col">
          {result.signingRecommendation ? (
            <div
              className={`report-hero-verdict report-hero-verdict--${result.signingRecommendation}`}
            >
              <span className="report-hero-verdict-label">{tDecision("verdict")}</span>
              <span className="report-hero-verdict-value">
                {signingLabel(result.signingRecommendation, tDecision)}
              </span>
            </div>
          ) : (
            <div className="report-hero-verdict report-hero-verdict--sign_with_changes">
              <span className="report-hero-verdict-label">{t("riskScore")}</span>
              <span className="report-hero-verdict-value">
                {localizeScoreText(result.scoreText, t)}
              </span>
            </div>
          )}

          {summaryLine && (
            <p className="report-hero-summary">{summaryLine}</p>
          )}

          <div className="report-hero-meta">
            {result.contractType && (
              <span className="report-hero-meta-chip">{result.contractType}</span>
            )}
            {scenario && scenario.id !== "general" && (
              <span className="report-hero-meta-chip report-hero-meta-chip--scenario">
                {scenario.icon} {tScenarios(`${scenario.id}.name` as "general.name")}
              </span>
            )}
            <span className="report-hero-meta-chip">
              {t("heroFlagBreakdown", { high: highCount, medium: medCount, low: lowCount })}
            </span>
          </div>

          {stats && (
            <p className="report-hero-quality">
              {tQuality("highConfidence", {
                count: stats.highConfidence,
                total: stats.totalFlags,
              })}
              {stats.needsReview > 0 && (
                <span className="report-hero-quality-warn">
                  {" · "}
                  {tQuality("needsReview", { count: stats.needsReview })}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="report-hero-score-col">
          <div className={`risk-ring risk-ring--hero ${riskCls}`}>
            <span>{result.scoreNum}</span>
          </div>
          <p className="report-hero-score-label">
            {localizeScoreText(result.scoreText, t)}
          </p>
          {result.dimensions && (
            <div className="report-hero-dim-mini">
              <DimMini label={t("dimensionFairnessShort")} value={result.dimensions.fairness} />
              <DimMini label={t("dimensionComplianceShort")} value={result.dimensions.compliance} />
              <DimMini label={t("dimensionFinancialShort")} value={result.dimensions.financial} />
            </div>
          )}
        </div>
      </div>

      <div className="report-hero-actions">
        <div className="report-hero-actions-buttons">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onStartReview}
            disabled={refining}
          >
            {tDecision("startReview")}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-lg"
            onClick={onDownload}
            disabled={refining}
          >
            {t("downloadReport")}
          </button>
        </div>
        <p className="report-hero-actions-hint">
          {refining ? t("heroActionsHintRefining") : t("heroActionsHint")}
        </p>
      </div>

      <ReviewFeedbackButtons
        contractHash={fb.contractHash}
        feedbackMeta={fb.feedbackMeta}
        isAuthenticated={fb.isAuthenticated}
        onToast={fb.onToast}
        targetType="summary"
        targetId="report-summary"
      />
    </div>
  );
}

function DimMini({ label, value }: { label: string; value: number }) {
  return (
    <div className="report-hero-dim-mini-item" title={label}>
      <span className="report-hero-dim-mini-label">{label}</span>
      <div className="report-hero-dim-mini-bar">
        <div className="report-hero-dim-mini-fill" style={{ width: `${value}%` }} />
      </div>
      <span className="report-hero-dim-mini-val">{value}</span>
    </div>
  );
}
