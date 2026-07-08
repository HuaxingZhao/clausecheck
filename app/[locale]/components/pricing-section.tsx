"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePricingStore, canPurchaseAddOn } from "@/stores/usePricingStore";
import { usePricingQuotaSync } from "@/hooks/use-pricing-quota-sync";
import PricingToggle from "./pricing/PricingToggle";
import CurrencySelector from "./pricing/CurrencySelector";
import PlanCard from "./pricing/PlanCard";
import QuotaMeter from "./pricing/QuotaMeter";
import AddOnModal from "./pricing/AddOnModal";
import ContactSalesForm from "./pricing/ContactSalesForm";
import PaymentGateway from "./pricing/PaymentGateway";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PaidPlanId } from "@/lib/pricing.config";

export interface PricingSectionProps {
  locale: string;
  scrollTo?: (id: string) => void;
  compact?: boolean;
  onRequireAuth?: () => void;
  payingPlan?: "pro" | "team" | "boost" | null;
  /** Parent can register a function to open the add-on modal (e.g. from results page). */
  registerAddOnOpener?: (open: () => void) => void;
}

export default function PricingSection({
  locale,
  scrollTo,
  compact = false,
  onRequireAuth,
  payingPlan = null,
  registerAddOnOpener,
}: PricingSectionProps) {
  const router = useRouter();
  const t = useTranslations("pricing");
  usePricingQuotaSync(locale);

  const billingCycle = usePricingStore((s) => s.billingCycle);
  const currency = usePricingStore((s) => s.currency);
  const usedQuota = usePricingStore((s) => s.usedQuota);
  const quotaLimit = usePricingStore((s) => s.quotaLimit);
  const resetDate = usePricingStore((s) => s.resetDate);
  const setBillingCycle = usePricingStore((s) => s.setBillingCycle);
  const setCurrency = usePricingStore((s) => s.setCurrency);
  const setSelectedPlan = usePricingStore((s) => s.setSelectedPlan);

  const [addOnOpen, setAddOnOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlanId | null>(null);

  const showAddOnEntry = canPurchaseAddOn({ usedQuota, quotaLimit });

  const handleAddOnOpen = useCallback(() => {
    if (!showAddOnEntry) return;
    setAddOnOpen(true);
  }, [showAddOnEntry]);

  useEffect(() => {
    registerAddOnOpener?.(handleAddOnOpen);
  }, [registerAddOnOpener, handleAddOnOpen]);

  function handleTrial() {
    setSelectedPlan("trial");
    if (scrollTo) scrollTo("upload");
    else router.push(`/${locale}#upload`);
  }

  function handleSubscribe(plan: "pro" | "team" | "trial") {
    if (plan === "trial") {
      handleTrial();
      return;
    }
    setSelectedPlan(plan);
    setCheckoutPlan(plan);
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

        <div className="flex flex-col lg:flex-row items-center justify-center gap-6 mb-8">
          <PricingToggle
            billingCycle={billingCycle}
            onBillingCycleChange={setBillingCycle}
          />
          <CurrencySelector
            currency={currency}
            billingCycle={billingCycle}
            onCurrencyChange={setCurrency}
            onBillingCycleChange={setBillingCycle}
          />
        </div>

        <div className="max-w-md mx-auto mb-8">
          <QuotaMeter
            usedQuota={usedQuota}
            quotaLimit={quotaLimit}
            resetDate={resetDate}
            onAddOnRequest={showAddOnEntry ? handleAddOnOpen : undefined}
          />
        </div>

        <p className="text-center text-xs text-ink-muted font-sans mb-8">{t("resetNote")}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <PlanCard
            planId="trial"
            currency={currency}
            billingCycle={billingCycle}
            locale={locale}
            onSelect={handleSubscribe}
          />
          <PlanCard
            planId="pro"
            currency={currency}
            billingCycle={billingCycle}
            locale={locale}
            featured
            loading={payingPlan === "pro"}
            disabled={!!checkoutPlan}
            onSelect={handleSubscribe}
          />
          <PlanCard
            planId="team"
            currency={currency}
            billingCycle={billingCycle}
            locale={locale}
            loading={payingPlan === "team"}
            disabled={!!checkoutPlan}
            onSelect={handleSubscribe}
          />
          <div className="pricing-card pricing-card-v2 flex flex-col">
            <h3 className="text-xl mb-1">{t("enterprise.name")}</h3>
            <p className="text-xs text-ink-muted mb-3 font-sans">{t("enterprise.audience")}</p>
            <p className="text-sm text-ink-light font-sans mb-4 flex-1">{t("enterprise.note")}</p>
            <ContactSalesForm />
          </div>
        </div>

        {showAddOnEntry && (
          <div className="text-center mb-4">
            <button
              type="button"
              className="btn btn-primary"
              disabled={payingPlan === "boost"}
              onClick={handleAddOnOpen}
            >
              {payingPlan === "boost" ? t("processing") : t("addOn.cta")}
            </button>
          </div>
        )}

        {!showAddOnEntry && quotaLimit > 0 && usedQuota < quotaLimit && (
          <p className="text-center text-xs text-ink-muted font-sans mt-4">{t("addOn.hidden")}</p>
        )}

        <p className="text-xs text-center text-ink-muted font-sans leading-relaxed max-w-3xl mx-auto mt-8">
          {t("footnote")}
        </p>
      </div>

      <AddOnModal
        open={addOnOpen}
        onOpenChange={setAddOnOpen}
        currency={currency}
        locale={locale}
        onRequireAuth={onRequireAuth}
      />

      <Dialog open={!!checkoutPlan} onOpenChange={(open) => !open && setCheckoutPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {checkoutPlan ? t(`${checkoutPlan}.name`) : t("title")}
            </DialogTitle>
          </DialogHeader>
          {checkoutPlan && (
            <PaymentGateway
              purchaseType="subscription"
              plan={checkoutPlan}
              currency={currency}
              billingCycle={billingCycle}
              locale={locale}
              onSuccess={() => setCheckoutPlan(null)}
              onRequireAuth={() => {
                setCheckoutPlan(null);
                onRequireAuth?.();
              }}
              onCancel={() => setCheckoutPlan(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
