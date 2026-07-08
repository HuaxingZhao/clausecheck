"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePricingStore, canPurchaseAddOn } from "@/stores/pricingStore";
import { usePricingQuotaSync } from "@/hooks/use-pricing-quota-sync";
import { useSubscriptionCheckout } from "@/hooks/use-subscription-checkout";
import { formatAddOnPrice, formatPlanPrice } from "@/lib/pricing/currency";
import type { Currency } from "@/lib/pricing/plans";
import ContactSalesForm from "./contact-sales-form";

interface PricingSectionProps {
  locale: string;
  scrollTo?: (id: string) => void;
  compact?: boolean;
  onAddOn?: () => void;
  onRequireAuth?: () => void;
  payingPlan?: "pro" | "team" | "boost" | null;
}

export default function PricingSection({
  locale,
  scrollTo,
  compact = false,
  onAddOn,
  onRequireAuth,
  payingPlan = null,
}: PricingSectionProps) {
  const router = useRouter();
  const t = useTranslations("pricing");
  usePricingQuotaSync(locale);

  const billingCycle = usePricingStore((s) => s.billingCycle);
  const currency = usePricingStore((s) => s.currency);
  const usedQuota = usePricingStore((s) => s.usedQuota);
  const quotaLimit = usePricingStore((s) => s.quotaLimit);
  const setBillingCycle = usePricingStore((s) => s.setBillingCycle);
  const setCurrency = usePricingStore((s) => s.setCurrency);
  const setSelectedPlan = usePricingStore((s) => s.setSelectedPlan);

  const checkout = useSubscriptionCheckout(locale);
  const showAddOn = canPurchaseAddOn({ usedQuota, quotaLimit });

  const proPrice = formatPlanPrice("pro", currency, billingCycle);
  const teamPrice = formatPlanPrice("team", currency, billingCycle);

  async function handleSubscribe(plan: "pro" | "team") {
    setSelectedPlan(plan);
    try {
      await checkout(plan, billingCycle, currency);
    } catch {
      onRequireAuth?.();
    }
  }

  function handleTrial() {
    setSelectedPlan("trial");
    if (scrollTo) scrollTo("upload");
    else router.push(`/${locale}#upload`);
  }

  function handleAddOn() {
    if (!showAddOn) return;
    if (quotaLimit > usedQuota) return;
    onAddOn?.();
  }

  return (
    <section id="pricing" className="py-20 bg-paper-dark/40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="section-label">{t("label")}</div>
          <h2 className="mb-3">{t("title")}</h2>
          <p className="text-ink-light mb-4">{t("subtitle")}</p>
          {!compact && (
            <p className="text-sm text-ink-muted font-sans leading-relaxed">{t("disclaimer")}</p>
          )}
        </div>

        {/* Billing + currency controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 font-sans">
          <div className="currency-switcher" role="group" aria-label={t("billingToggle")}>
            <button
              type="button"
              className={`currency-btn ${billingCycle === "annual" ? "active" : ""}`}
              onClick={() => setBillingCycle("annual")}
            >
              {t("annual")} <span className="text-accent text-xs ml-1">-15%</span>
            </button>
            <button
              type="button"
              className={`currency-btn ${billingCycle === "monthly" ? "active" : ""}`}
              onClick={() => setBillingCycle("monthly")}
            >
              {t("monthly")}
            </button>
          </div>
          <div className="currency-switcher" role="group" aria-label={t("currencyToggle")}>
            {(["USD", "CNY"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`currency-btn ${currency === c ? "active" : ""}`}
                onClick={() => setCurrency(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-ink-muted font-sans mb-8">{t("resetNote")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* Trial */}
          <div className="pricing-card pricing-card-v2">
            <h3 className="text-xl mb-1">{t("trial.name")}</h3>
            <p className="text-xs text-ink-muted mb-3 font-sans">{t("trial.audience")}</p>
            <div className="text-4xl font-light font-sans mb-1">
              {currency === "USD" ? "$0" : "¥0"}
            </div>
            <p className="text-sm text-ink-light font-sans mb-4">{t("trial.quota")}</p>
            <ul className="space-y-2 text-sm text-ink-light font-sans mb-6 flex-1">
              {(t.raw("trial.highlights") as string[]).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <button type="button" className="btn btn-outline w-full" onClick={handleTrial}>
              {t("trial.cta")}
            </button>
          </div>

          {/* Pro */}
          <div className="pricing-card pricing-card-v2 featured">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-xl">{t("pro.name")}</h3>
              <span className="pricing-badge">{t("pro.badge")}</span>
            </div>
            <p className="text-xs text-ink-muted mb-3 font-sans">{t("pro.audience")}</p>
            <div className="text-4xl font-light font-sans mb-0">
              {proPrice.main}
              <span className="text-lg text-ink-muted">{proPrice.period}</span>
            </div>
            {proPrice.sub && (
              <p className="text-xs text-ink-muted font-sans mb-3">{proPrice.sub}</p>
            )}
            <p className="text-sm text-ink-light font-sans mb-4">{t("pro.quota")}</p>
            <ul className="space-y-2 text-sm text-ink-light font-sans mb-6 flex-1">
              {(t.raw("pro.highlights") as string[]).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-primary w-full"
              disabled={payingPlan === "pro"}
              onClick={() => void handleSubscribe("pro")}
            >
              {payingPlan === "pro" ? t("processing") : t("pro.cta")}
            </button>
          </div>

          {/* Team */}
          <div className="pricing-card pricing-card-v2">
            <h3 className="text-xl mb-1">{t("team.name")}</h3>
            <p className="text-xs text-ink-muted mb-3 font-sans">{t("team.audience")}</p>
            <div className="text-4xl font-light font-sans mb-0">
              {teamPrice.main}
              <span className="text-lg text-ink-muted">{teamPrice.period}</span>
            </div>
            {teamPrice.sub && (
              <p className="text-xs text-ink-muted font-sans mb-3">{teamPrice.sub}</p>
            )}
            <p className="text-sm text-ink-light font-sans mb-4">{t("team.quota")}</p>
            <ul className="space-y-2 text-sm text-ink-light font-sans mb-6 flex-1">
              {(t.raw("team.highlights") as string[]).map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <button
              type="button"
              className="btn btn-outline w-full"
              disabled={payingPlan === "team"}
              onClick={() => void handleSubscribe("team")}
            >
              {payingPlan === "team" ? t("processing") : t("team.cta")}
            </button>
          </div>

          {/* Enterprise — contact only */}
          <div className="pricing-card pricing-card-v2 xl:col-span-1">
            <h3 className="text-xl mb-1">{t("enterprise.name")}</h3>
            <p className="text-xs text-ink-muted mb-3 font-sans">{t("enterprise.audience")}</p>
            <p className="text-sm text-ink-light font-sans mb-4 flex-1">{t("enterprise.note")}</p>
            <ContactSalesForm />
          </div>
        </div>

        {/* Add-on — only when quota exhausted */}
        {showAddOn && (
          <div className="pricing-card pricing-card-boost max-w-xl mx-auto text-center">
            <span className="pricing-badge pricing-badge-boost mb-2 inline-block">
              {t("addOn.badge")}
            </span>
            <h3 className="text-lg font-sans font-semibold mb-1">{t("addOn.name")}</h3>
            <p className="text-sm text-ink-light font-sans mb-3">{t("addOn.note")}</p>
            <p className="text-3xl font-light font-sans mb-4">{formatAddOnPrice(currency)}</p>
            <button
              type="button"
              className="btn btn-primary w-full sm:w-auto"
              disabled={payingPlan === "boost" || !onAddOn}
              onClick={handleAddOn}
            >
              {payingPlan === "boost" ? t("processing") : t("addOn.cta")}
            </button>
          </div>
        )}

        {!showAddOn && quotaLimit > 0 && usedQuota < quotaLimit && (
          <p className="text-center text-xs text-ink-muted font-sans mt-4">{t("addOn.hidden")}</p>
        )}

        <p className="text-xs text-center text-ink-muted font-sans leading-relaxed max-w-3xl mx-auto mt-8">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}
