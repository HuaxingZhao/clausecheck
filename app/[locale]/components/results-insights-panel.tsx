"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import { truncatePreview } from "./results-expandable-section";

interface ResultsInsightsPanelProps {
  result: ScanResult;
}

const TOP_NEGO = 3;
const TOP_ACTIONS = 2;
const TOP_STRENGTHS = 2;

export default function ResultsInsightsPanel({ result }: ResultsInsightsPanelProps) {
  const t = useTranslations("results");
  const [expanded, setExpanded] = useState(false);

  const negotiations = result.negotiations ?? [];
  const topNego = negotiations.slice(0, TOP_NEGO);
  const restNego = negotiations.slice(TOP_NEGO);

  const missing = result.missingClauses ?? [];
  const actions = result.actionItems ?? [];
  const topActions = actions.slice(0, TOP_ACTIONS);
  const restActions = actions.slice(TOP_ACTIONS);

  const strengths = result.strengths ?? [];
  const topStrengths = strengths.slice(0, TOP_STRENGTHS);
  const restStrengths = strengths.slice(TOP_STRENGTHS);

  const hasGlance =
    !!result.worstCase?.trim() ||
    topNego.length > 0 ||
    missing.length > 0 ||
    topActions.length > 0 ||
    topStrengths.length > 0;

  const hasDetails =
    restNego.length > 0 ||
    restActions.length > 0 ||
    restStrengths.length > 0 ||
    !!result.summary?.trim() ||
    missing.some((c) => c.importance || c.suggestion);

  if (!hasGlance && !hasDetails) return null;

  const extraCount =
    restNego.length + restActions.length + (result.summary?.trim() ? 1 : 0);

  return (
    <div className="results-insights mb-6">
      <h3 className="results-insights-heading">{t("insightsTitle")}</h3>
      <p className="results-insights-sub">{t("insightsSubtitle")}</p>

      <div className="results-insights-body">
        {result.worstCase?.trim() && (
          <section className="results-insights-block results-insights-block--warn">
            <h4 className="results-insights-label">{t("worstCaseTitle")}</h4>
            <p className="results-insights-worst">{truncatePreview(result.worstCase, 160)}</p>
          </section>
        )}

        {topNego.length > 0 && (
          <section className="results-insights-block">
            <h4 className="results-insights-label">{t("insightsNegotiateTop")}</h4>
            <ol className="results-insights-nego">
              {topNego.map((n) => (
                <li key={n.priority} className="results-insights-nego-item">
                  <span className="results-insights-nego-rank">{n.priority}</span>
                  <div className="min-w-0">
                    <p className="results-insights-nego-clause">{n.clause}</p>
                    {n.suggested?.trim() && (
                      <p className="results-insights-nego-suggest">
                        {truncatePreview(n.suggested, 100)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {restNego.length > 0 && !expanded && (
              <p className="results-insights-more-hint">
                {t("insightsMoreNegotiations", { count: restNego.length })}
              </p>
            )}
          </section>
        )}

        {missing.length > 0 && (
          <section className="results-insights-block">
            <h4 className="results-insights-label">{t("insightsMissingLabel")}</h4>
            <div className="results-insights-chips">
              {missing.map((c, i) => (
                <span key={i} className="results-insights-chip results-insights-chip--missing">
                  {c.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {topActions.length > 0 && (
          <section className="results-insights-block">
            <h4 className="results-insights-label">{t("insightsNextSteps")}</h4>
            <ul className="results-insights-actions">
              {topActions.map((item, i) => (
                <li key={i}>{truncatePreview(item, 120)}</li>
              ))}
            </ul>
          </section>
        )}

        {topStrengths.length > 0 && (
          <section className="results-insights-block results-insights-block--muted">
            <h4 className="results-insights-label">{t("strengthsTitle")}</h4>
            <ul className="results-insights-strengths">
              {topStrengths.map((s, i) => (
                <li key={i}>{truncatePreview(s, 100)}</li>
              ))}
            </ul>
          </section>
        )}

        {expanded && (
          <div className="results-insights-details">
            {restNego.length > 0 && (
              <section className="results-insights-block">
                <h4 className="results-insights-label">{t("negotiationsTitle")}</h4>
                <div className="negotiations-list negotiations-list--compact">
                  {restNego.map((n) => (
                    <div key={n.priority} className="nego-item nego-item--compact">
                      <div className="nego-priority">{n.priority}</div>
                      <div className="nego-body">
                        <div className="nego-clause">{n.clause}</div>
                        {n.suggested?.trim() && (
                          <p className="text-sm text-accent-dark mt-1">{n.suggested}</p>
                        )}
                        {n.reason?.trim() && (
                          <p className="text-xs text-ink-muted mt-1">{n.reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {restActions.length > 0 && (
              <section className="results-insights-block">
                <h4 className="results-insights-label">{t("actionItemsTitle")}</h4>
                <ol className="action-list action-list--compact">
                  {restActions.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </section>
            )}

            {restStrengths.length > 0 && (
              <section className="results-insights-block">
                <h4 className="results-insights-label">{t("strengthsTitle")}</h4>
                <ul className="results-compact-list">
                  {restStrengths.map((s, i) => (
                    <li key={i} className="strength-item">{s}</li>
                  ))}
                </ul>
              </section>
            )}

            {missing.some((c) => c.importance || c.suggestion) && (
              <section className="results-insights-block">
                <h4 className="results-insights-label">{t("missingClausesTitle")}</h4>
                <div className="missing-clauses-compact">
                  {missing.map((c, i) => (
                    <div key={i} className="missing-clause-item missing-clause-item--compact">
                      <div className="font-sans font-semibold text-sm text-ink mb-1">{c.name}</div>
                      {c.importance && (
                        <p className="text-sm text-ink mb-1">{c.importance}</p>
                      )}
                      {c.suggestion && (
                        <p className="text-sm text-accent-dark">{c.suggestion}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {result.summary?.trim() && (
              <section className="results-insights-block">
                <h4 className="results-insights-label">{t("overallAssessment")}</h4>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                  {result.summary}
                </p>
              </section>
            )}
          </div>
        )}

        {hasDetails && (
          <button
            type="button"
            className="results-insights-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded
              ? t("insightsCollapse")
              : extraCount > 0
                ? t("insightsExpandWithCount", { count: extraCount })
                : t("insightsExpand")}
            <span aria-hidden>{expanded ? " ▴" : " ▾"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
