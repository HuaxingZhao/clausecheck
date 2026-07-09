"use client";

import { useTranslations } from "next-intl";
import { useCredits } from "@/hooks/use-credits";

export default function CreditsRemainingBadge() {
  const t = useTranslations("upload");
  const { balance, loading, authenticated } = useCredits();

  if (loading) {
    return (
      <span className="credits-remaining-badge credits-remaining-loading">
        {t("quotaLoading")}
      </span>
    );
  }

  if (!authenticated || balance == null) {
    return (
      <span className="credits-remaining-badge credits-remaining-muted">
        {t("quotaLogin")}
      </span>
    );
  }

  return (
    <span className="credits-remaining-badge">
      {t("quotaRemaining", { count: balance })}
    </span>
  );
}
