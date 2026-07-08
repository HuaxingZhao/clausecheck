"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatPlanPrice } from "@/lib/pricing/currency";
import type { BillingCycle, Currency, PlanId } from "@/lib/pricing.config";

export interface PlanCardProps {
  planId: Exclude<PlanId, "enterprise">;
  currency: Currency;
  billingCycle: BillingCycle;
  locale: string;
  featured?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onSelect: (planId: "pro" | "team" | "trial") => void;
}

export default function PlanCard({
  planId,
  currency,
  billingCycle,
  locale,
  featured = false,
  disabled = false,
  loading = false,
  onSelect,
}: PlanCardProps) {
  const t = useTranslations("pricing");
  const planKey = planId as "trial" | "pro" | "team";
  const highlights = t.raw(`${planKey}.highlights`) as string[];

  const price =
    planId === "trial"
      ? { main: currency === "USD" ? "$0" : "¥0", period: "" }
      : formatPlanPrice(planId, currency, billingCycle, locale === "zh" ? "zh-CN" : "en-US");

  return (
    <div
      className={`pricing-card pricing-card-v2 flex flex-col ${featured ? "featured" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-xl">{t(`${planKey}.name`)}</h3>
        {planId === "pro" && (
          <span className="pricing-badge">{t("pro.badge")}</span>
        )}
      </div>
      <p className="text-xs text-ink-muted mb-3 font-sans">{t(`${planKey}.audience`)}</p>
      <div className="text-4xl font-light font-sans mb-0">
        {price.main}
        {price.period && (
          <span className="text-lg text-ink-muted">{price.period}</span>
        )}
      </div>
      {"sub" in price && price.sub && (
        <p className="text-xs text-ink-muted font-sans mb-3">{price.sub}</p>
      )}
      <p className="text-sm text-ink-light font-sans mb-4">{t(`${planKey}.quota`)}</p>
      <ul className="space-y-2 text-sm text-ink-light font-sans mb-6 flex-1">
        {highlights.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
      <Button
        variant={featured ? "default" : "outline"}
        className="w-full"
        disabled={disabled || loading}
        onClick={() => onSelect(planId === "trial" ? "trial" : planId)}
      >
        {loading ? t("processing") : t(`${planKey}.cta`)}
      </Button>
    </div>
  );
}
