"use client";

import { useTranslations } from "next-intl";

interface ContractReviewPipelineProps {
  clauseCount: number;
  stats: {
    matched: number;
    navigable: number;
    total: number;
    editable: number;
    missing: number;
    unlocated: number;
  };
  locale: string;
}

const STEPS = ["extract", "analyze", "lock", "revise"] as const;

export default function ContractReviewPipeline({
  clauseCount,
  stats,
}: ContractReviewPipelineProps) {
  const t = useTranslations("review.pipeline");

  return (
    <div className="contract-review-pipeline rounded-lg border border-border/30 bg-paper/50 px-4 py-3">
      <p className="text-xs font-sans text-ink mb-3">{t("summary", { clauses: clauseCount })}</p>
      <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="flex items-center gap-2 text-xs font-sans text-ink"
          >
            <span className="contract-review-pipeline-dot contract-review-pipeline-dot--done">
              {i + 1}
            </span>
            <span>{t(step)}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs font-sans text-ink mt-3">
        {t("lockStats", {
          matched: stats.matched,
          navigable: stats.navigable,
          editable: stats.editable,
          missing: stats.missing,
          unlocated: stats.unlocated,
        })}
      </p>
    </div>
  );
}
