"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ScanResult } from "@/lib/types";
import ReviewFeedbackButtons from "./review-feedback-buttons";
import { useReviewFeedback } from "./review-feedback-provider";
import GenerateDpaCta from "./generate-dpa-cta";
import { isDpaMissingClause } from "@/lib/dpa/detect-dpa";

interface ResultsSupplementaryPanelProps {
  result: ScanResult;
  onGenerateDpa?: () => void;
}

export default function ResultsSupplementaryPanel({
  result,
  onGenerateDpa,
}: ResultsSupplementaryPanelProps) {
  const t = useTranslations("results");
  const [open, setOpen] = useState(false);
  const fb = useReviewFeedback();

  const negotiations = result.negotiations ?? [];
  const restNego = negotiations.slice(3);
  const strengths = result.strengths ?? [];
  const missing = result.missingClauses ?? [];
  const actions = result.actionItems ?? [];
  const restActions = actions.slice(3);
  const hasDpaMissing = missing.some(isDpaMissingClause);

  const hasContent =
    strengths.length > 0 ||
    restNego.length > 0 ||
    restActions.length > 0 ||
    !!result.summary?.trim() ||
    missing.some((c) => c.importance || c.suggestion) ||
    !!result.refineNotes?.trim();

  if (!hasContent) return null;

  const itemCount =
    strengths.length +
    restNego.length +
    restActions.length +
    (result.summary?.trim() ? 1 : 0) +
    (result.refineNotes ? 1 : 0);

  return (
    <div className="report-supplementary mb-6">
      <button
        type="button"
        className="report-supplementary-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? t("supplementaryCollapse") : t("supplementaryExpand", { count: itemCount })}
        <span aria-hidden>{open ? " ▴" : " ▾"}</span>
      </button>

      {hasDpaMissing && onGenerateDpa && (
        <div className="dpa-inline-banner mt-3">
          <p className="dpa-inline-banner-text font-sans text-sm text-ink">
            {t("missingClausesTitle")}: DPA
          </p>
          <GenerateDpaCta onClick={onGenerateDpa} />
        </div>
      )}

      {open && (
        <div className="report-supplementary-body">
          {strengths.length > 0 && (
            <section>
              <h4 className="report-supplementary-label">{t("strengthsTitle")}</h4>
              <ul className="results-compact-list">
                {strengths.map((s, i) => (
                  <li key={i} className="strength-item">{s}</li>
                ))}
              </ul>
            </section>
          )}

          {restNego.length > 0 && (
            <section>
              <h4 className="report-supplementary-label">{t("negotiationsTitle")}</h4>
              <div className="negotiations-list negotiations-list--compact">
                {restNego.map((n) => (
                  <div key={n.priority} className="nego-item nego-item--compact">
                    <div className="nego-priority">{n.priority}</div>
                    <div className="nego-body">
                      <div className="nego-clause">{n.clause}</div>
                      {n.suggested?.trim() && (
                        <p className="text-sm text-accent-dark mt-1">{n.suggested}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {missing.some((c) => c.importance || c.suggestion) && (
            <section>
              <h4 className="report-supplementary-label">{t("missingClausesTitle")}</h4>
              <div className="missing-clauses-compact">
                {missing.map((c, i) => (
                  <div key={i} className="missing-clause-item missing-clause-item--compact">
                    <div className="font-sans font-semibold text-sm text-ink mb-1">{c.name}</div>
                    {c.importance && <p className="text-sm text-ink mb-1">{c.importance}</p>}
                    {c.suggestion && <p className="text-sm text-accent-dark">{c.suggestion}</p>}
                    {onGenerateDpa && isDpaMissingClause(c) && (
                      <div className="mt-2">
                        <GenerateDpaCta onClick={onGenerateDpa} compact />
                      </div>
                    )}
                    <ReviewFeedbackButtons
                      contractHash={fb.contractHash}
                      feedbackMeta={fb.feedbackMeta}
                      isAuthenticated={fb.isAuthenticated}
                      onToast={fb.onToast}
                      targetType="missingClause"
                      targetId={`missing-${i}-${c.name.slice(0, 40)}`}
                      compact
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {restActions.length > 0 && (
            <section>
              <h4 className="report-supplementary-label">{t("actionItemsTitle")}</h4>
              <ol className="action-list action-list--compact">
                {restActions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </section>
          )}

          {result.summary?.trim() && (
            <section>
              <h4 className="report-supplementary-label">{t("overallAssessment")}</h4>
              <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
                {result.summary}
              </p>
            </section>
          )}

          {result.refineNotes?.trim() && (
            <section>
              <h4 className="report-supplementary-label">{t("refineNotesTitle")}</h4>
              <p className="text-sm text-ink-light leading-relaxed">{result.refineNotes}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
