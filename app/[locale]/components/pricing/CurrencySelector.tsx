"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import type { BillingCycle, Currency } from "@/lib/pricing.config";

export interface CurrencySelectorProps {
  currency: Currency;
  billingCycle: BillingCycle;
  onCurrencyChange: (currency: Currency) => void;
  onBillingCycleChange?: (cycle: BillingCycle) => void;
  /** Kept for callers; CNY now shows prepaid note (Stripe WeChat path). */
  onCnyPayContact?: () => void;
  className?: string;
}

export default function CurrencySelector({
  currency,
  onCurrencyChange,
  className,
}: CurrencySelectorProps) {
  const t = useTranslations("pricing");

  return (
    <div className={`flex flex-col items-center gap-2 font-sans ${className ?? ""}`}>
      <Select<Currency>
        value={currency}
        onValueChange={onCurrencyChange}
        aria-label={t("currencyToggle")}
        options={[
          { value: "USD", label: "USD ($)" },
          { value: "CNY", label: "CNY (¥)" },
        ]}
      />
      {currency === "CNY" && (
        <p className="text-xs text-ink-muted text-center max-w-sm leading-relaxed">
          {t("cnyPrepaidNote")}
        </p>
      )}
    </div>
  );
}
