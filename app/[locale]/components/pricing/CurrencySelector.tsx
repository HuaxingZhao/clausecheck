"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import type { BillingCycle, Currency } from "@/lib/pricing.config";
import CnyPayChannelCta from "./CnyPayChannelCta";

export interface CurrencySelectorProps {
  currency: Currency;
  billingCycle: BillingCycle;
  onCurrencyChange: (currency: Currency) => void;
  onBillingCycleChange?: (cycle: BillingCycle) => void;
  /** Opens RMB / enterprise contact when WeChat UI is off. */
  onCnyPayContact?: () => void;
  className?: string;
}

export default function CurrencySelector({
  currency,
  onCurrencyChange,
  onCnyPayContact,
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
        <CnyPayChannelCta onContact={onCnyPayContact} />
      )}
    </div>
  );
}
