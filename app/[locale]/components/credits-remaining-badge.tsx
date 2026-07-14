"use client";

import { useTranslations } from "next-intl";
import { useCredits } from "@/hooks/use-credits";

export default function CreditsRemainingBadge() {
  const t = useTranslations("upload");
  const { balance, loading, session } = useCredits();

  if (loading || session === "unavailable") {
    return (
      <span className="credits-remaining-badge credits-remaining-loading">
        {session === "unavailable" ? t("quotaUnavailable") : t("quotaLoading")}
      </span>
    );
  }

  if (session === "guest" || balance == null) {
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
