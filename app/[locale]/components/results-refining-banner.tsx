"use client";

import { useTranslations } from "next-intl";

export default function ResultsRefiningBanner() {
  const t = useTranslations("progress");

  return (
    <div className="results-refining-banner" role="status" aria-live="polite">
      <span className="results-refining-spinner" aria-hidden />
      <div>
        <p className="results-refining-title">{t("refining")}</p>
        <p className="results-refining-hint">{t("refiningHint")}</p>
      </div>
    </div>
  );
}
