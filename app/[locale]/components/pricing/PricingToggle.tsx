"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import {
  ANNUAL_SAVINGS_PERCENT,
  QUARTERLY_SAVINGS_PERCENT,
  SEMI_ANNUAL_SAVINGS_PERCENT,
  type BillingCycle,
  type Currency,
} from "@/lib/pricing.config";

export interface PricingToggleProps {
  billingCycle: BillingCycle;
  currency: Currency;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  className?: string;
}

const CNY_CYCLES: BillingCycle[] = ["monthly", "quarterly", "semi_annual", "annual"];

export default function PricingToggle({
  billingCycle,
  currency,
  onBillingCycleChange,
  className,
}: PricingToggleProps) {
  const t = useTranslations("pricing");

  if (currency === "CNY") {
    return (
      <div
        className={`flex flex-col items-center gap-2 font-sans ${className ?? ""}`}
        role="group"
        aria-label={t("billingToggle")}
      >
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CNY_CYCLES.map((cycle) => {
            const active = billingCycle === cycle;
            const badge =
              cycle === "quarterly"
                ? t("savingsBadge", { percent: QUARTERLY_SAVINGS_PERCENT })
                : cycle === "semi_annual"
                  ? t("savingsBadge", { percent: SEMI_ANNUAL_SAVINGS_PERCENT })
                  : cycle === "annual"
                    ? t("savingsBadge", { percent: ANNUAL_SAVINGS_PERCENT })
                    : null;
            return (
              <button
                key={cycle}
                type="button"
                onClick={() => onBillingCycleChange(cycle)}
                className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-white text-ink-muted border-ink/15 hover:border-ink/40"
                }`}
                aria-pressed={active}
              >
                {t(cycle)}
                {badge && (
                  <span
                    className={`ml-1.5 text-[10px] font-semibold ${
                      active ? "text-white/90" : "text-accent"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-ink-muted text-center max-w-md leading-relaxed">
          {t("cnyCycleHint")}
        </p>
      </div>
    );
  }

  const isAnnual = billingCycle === "annual";

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-center gap-3 font-sans ${className ?? ""}`}
      role="group"
      aria-label={t("billingToggle")}
    >
      <span
        className={`text-sm ${!isAnnual ? "text-ink font-medium" : "text-ink-muted"}`}
      >
        {t("monthly")}
      </span>
      <Switch
        checked={isAnnual}
        onCheckedChange={(checked) =>
          onBillingCycleChange(checked ? "annual" : "monthly")
        }
        aria-label={t("billingToggle")}
      />
      <span className={`text-sm flex items-center gap-2 ${isAnnual ? "text-ink font-medium" : "text-ink-muted"}`}>
        {t("annual")}
        <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
          {t("savingsBadge", { percent: ANNUAL_SAVINGS_PERCENT })}
        </span>
      </span>
    </div>
  );
}
