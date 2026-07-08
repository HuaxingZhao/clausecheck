"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { allowsWechatAlipay } from "@/lib/pricing.config";
import type { BillingCycle, Currency } from "@/lib/pricing.config";

export interface CurrencySelectorProps {
  currency: Currency;
  billingCycle: BillingCycle;
  onCurrencyChange: (currency: Currency) => void;
  onBillingCycleChange?: (cycle: BillingCycle) => void;
  className?: string;
}

export default function CurrencySelector({
  currency,
  billingCycle,
  onCurrencyChange,
  onBillingCycleChange,
  className,
}: CurrencySelectorProps) {
  const t = useTranslations("pricing");

  function handleCurrencyChange(next: Currency) {
    onCurrencyChange(next);
    if (
      next === "CNY" &&
      billingCycle === "monthly" &&
      onBillingCycleChange &&
      !allowsWechatAlipay(next, billingCycle, "subscription")
    ) {
      // WeChat/Alipay note is shown; monthly CNY still works with card only
    }
  }

  const showWalletNote = currency === "CNY";

  return (
    <div className={`flex flex-col items-center gap-2 font-sans ${className ?? ""}`}>
      <Select<Currency>
        value={currency}
        onValueChange={handleCurrencyChange}
        aria-label={t("currencyToggle")}
        options={[
          { value: "USD", label: "USD ($)" },
          { value: "CNY", label: "CNY (¥)" },
        ]}
      />
      {showWalletNote && (
        <p className="text-xs text-ink-muted text-center max-w-xs leading-relaxed">
          {t("cnyWalletNote")}
        </p>
      )}
    </div>
  );
}
