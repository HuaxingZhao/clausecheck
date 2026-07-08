"use client";

import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import { quotaUsagePercent } from "@/stores/usePricingStore";

export interface QuotaMeterProps {
  usedQuota: number;
  quotaLimit: number;
  resetDate?: string | null;
  onAddOnRequest?: () => void;
  className?: string;
}

export default function QuotaMeter({
  usedQuota,
  quotaLimit,
  resetDate,
  onAddOnRequest,
  className,
}: QuotaMeterProps) {
  const t = useTranslations("pricing.quota");
  const percent = quotaUsagePercent({ usedQuota, quotaLimit });
  const exhausted = quotaLimit > 0 && usedQuota >= quotaLimit;

  let indicatorClass = "bg-legal-navy";
  if (percent >= 100) indicatorClass = "bg-red-600";
  else if (percent >= 80) indicatorClass = "bg-amber-500";

  const resetLabel =
    resetDate &&
    t("resetsOn", {
      date: new Date(resetDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    });

  return (
    <div className={`rounded-xl border border-border/60 bg-white p-4 font-sans ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-medium text-ink">{t("title")}</span>
        <span className="text-sm text-ink-muted">
          {t("used", { used: usedQuota, limit: quotaLimit })}
        </span>
      </div>
      <Progress value={percent} indicatorClassName={indicatorClass} />
      {resetLabel && (
        <p className="text-xs text-ink-muted mt-2">{resetLabel}</p>
      )}
      {percent >= 80 && !exhausted && (
        <p className="text-xs text-amber-700 mt-2">{t("warning80")}</p>
      )}
      {exhausted && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-sm text-red-700 mb-2">{t("exhausted")}</p>
          {onAddOnRequest && (
            <button
              type="button"
              className="text-sm font-semibold text-legal-navy hover:underline"
              onClick={onAddOnRequest}
            >
              {t("buyAddOn")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
