"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { ANNUAL_SAVINGS_PERCENT } from "@/lib/pricing.config";
import type { BillingCycle } from "@/lib/pricing.config";

export interface PricingToggleProps {
  billingCycle: BillingCycle;
  onBillingCycleChange: (cycle: BillingCycle) => void;
  className?: string;
}

export default function PricingToggle({
  billingCycle,
  onBillingCycleChange,
  className,
}: PricingToggleProps) {
  const t = useTranslations("pricing");
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
