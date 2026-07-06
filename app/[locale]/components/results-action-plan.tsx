"use client";

import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import { truncatePreview } from "./results-expandable-section";

interface ResultsActionPlanProps {
  result: ScanResult;
}

const TOP_NEGO = 3;
const TOP_ACTIONS = 3;

export default function ResultsActionPlan({ result }: ResultsActionPlanProps) {
  const t = useTranslations("results");

  const negotiations = (result.negotiations ?? []).slice(0, TOP_NEGO);
  const missing = result.missingClauses ?? [];
  const actions = (result.actionItems ?? []).slice(0, TOP_ACTIONS);
  const worstCase = result.worstCase?.trim();

  const hasContent =
    worstCase || negotiations.length > 0 || missing.length > 0 || actions.length > 0;

  if (!hasContent) return null;

  return (
    <div className="report-action-plan mb-6">
      <h3 className="report-action-plan-title">{t("actionPlanTitle")}</h3>
      <p className="report-action-plan-sub">{t("actionPlanSubtitle")}</p>

      <div className="report-action-plan-grid">
        {worstCase && (
          <div className="report-action-plan-card report-action-plan-card--warn">
            <h4 className="report-action-plan-label">{t("worstCaseTitle")}</h4>
            <p className="report-action-plan-text">{truncatePreview(worstCase, 180)}</p>
          </div>
        )}

        {negotiations.length > 0 && (
          <div className="report-action-plan-card">
            <h4 className="report-action-plan-label">{t("insightsNegotiateTop")}</h4>
            <ol className="report-action-plan-nego">
              {negotiations.map((n) => (
                <li key={n.priority}>
                  <span className="report-action-plan-nego-rank">{n.priority}</span>
                  <span className="report-action-plan-nego-text">{n.clause}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {missing.length > 0 && (
          <div className="report-action-plan-card">
            <h4 className="report-action-plan-label">{t("insightsMissingLabel")}</h4>
            <div className="results-insights-chips">
              {missing.map((c, i) => (
                <span key={i} className="results-insights-chip results-insights-chip--missing">
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="report-action-plan-card">
            <h4 className="report-action-plan-label">{t("insightsNextSteps")}</h4>
            <ul className="results-insights-actions">
              {actions.map((item, i) => (
                <li key={i}>{truncatePreview(item, 100)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
