"use client";

import { useTranslations } from "next-intl";
import type { RiskFlag, ScanResult, SigningRecommendation } from "@/lib/types";
import { getScenario } from "@/lib/contract-scenarios";

interface DecisionSummaryProps {
  result: ScanResult;
  locale: string;
  onStartReview: () => void;
}

function signingLabel(
  rec: SigningRecommendation,
  t: ReturnType<typeof useTranslations<"decision">>
): string {
  if (rec === "sign") return t("signingSign");
  if (rec === "sign_with_changes") return t("signingSignWithChanges");
  return t("signingDoNotSign");
}

export default function DecisionSummary({ result, onStartReview }: DecisionSummaryProps) {
  const t = useTranslations("decision");
  const tScenarios = useTranslations("scenarios");

  const mustFix = result.flags
    .filter((f) => f.level === "high" && f.confidence !== "low")
    .sort((a, b) => {
      if (a.confidence === "high" && b.confidence !== "high") return -1;
      if (b.confidence === "high" && a.confidence !== "high") return 1;
      return 0;
    })
    .slice(0, 3);
  const scenario = result.scenarioId ? getScenario(result.scenarioId) : null;

  return (
    <div className="decision-summary mb-8">
      <div className="decision-summary-header">
        <div>
          <p className="text-xs font-sans font-semibold uppercase tracking-wide text-ink-muted mb-1">
            {t("label")}
          </p>
          <h3 className="text-xl font-serif text-ink">{t("title")}</h3>
        </div>
        {scenario && scenario.id !== "general" && (
          <span className="scenario-result-badge">
            {scenario.icon}{" "}
            {tScenarios(`${scenario.id}.name` as "general.name")}
          </span>
        )}
      </div>

      {result.signingRecommendation && (
        <div className={`decision-verdict decision-verdict--${result.signingRecommendation}`}>
          <span className="decision-verdict-label">{t("verdict")}</span>
          <span className="decision-verdict-value">
            {signingLabel(result.signingRecommendation, t)}
          </span>
          {result.signingRationale && (
            <p className="decision-verdict-rationale">{result.signingRationale}</p>
          )}
        </div>
      )}

      {result.executiveSummary && (
        <p className="decision-executive text-sm text-ink-light leading-relaxed mt-4">
          {result.executiveSummary}
        </p>
      )}

      {mustFix.length > 0 && (
        <div className="decision-mustfix mt-5">
          <h4 className="text-sm font-sans font-semibold text-ink mb-3">{t("mustFixTitle")}</h4>
          <ol className="decision-mustfix-list">
            {mustFix.map((flag: RiskFlag, i: number) => (
              <li key={i} className="decision-mustfix-item">
                <span className="decision-mustfix-num">{i + 1}</span>
                <div>
                  <p className="text-sm font-sans font-medium text-ink">{flag.text}</p>
                  {flag.impact && (
                    <p className="text-xs text-ink-muted mt-0.5">{flag.impact}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="decision-actions mt-6 flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={onStartReview}>
          {t("startReview")}
        </button>
        <p className="text-xs text-ink-muted font-sans self-center">{t("startReviewHint")}</p>
      </div>
    </div>
  );
}
