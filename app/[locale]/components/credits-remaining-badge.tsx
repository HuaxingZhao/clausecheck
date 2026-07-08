"use client";

import { useTranslations } from "next-intl";
import { useCredits } from "@/hooks/use-credits";

export default function CreditsRemainingBadge() {
  const t = useTranslations("upload");
  const { balance, loading, authenticated } = useCredits();

  if (loading) {
    return (
      <span className="credits-remaining-badge credits-remaining-loading">
        {t("creditsLoading")}
      </span>
    );
  }

  if (!authenticated || balance == null) {
    return (
      <span className="credits-remaining-badge credits-remaining-muted">
        {t("creditsLogin")}
      </span>
    );
  }

  return (
    <span className="credits-remaining-badge">
      {t("creditsRemaining", { count: balance })}
    </span>
  );
}
