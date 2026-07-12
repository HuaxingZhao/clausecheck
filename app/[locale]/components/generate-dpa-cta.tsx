"use client";

import { useTranslations } from "next-intl";

interface GenerateDpaCtaProps {
  onClick: () => void;
  compact?: boolean;
}

export default function GenerateDpaCta({ onClick, compact }: GenerateDpaCtaProps) {
  const t = useTranslations("dpa");
  return (
    <button
      type="button"
      className={`dpa-generate-cta${compact ? " dpa-generate-cta--compact" : ""}`}
      onClick={onClick}
    >
      {t("cta")}
    </button>
  );
}
