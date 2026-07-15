"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePricingStore, canPurchaseAddOn } from "@/stores/usePricingStore";
import { usePricingQuotaSync } from "@/hooks/use-pricing-quota-sync";
import PricingToggle from "./pricing/PricingToggle";
import CurrencySelector from "./pricing/CurrencySelector";
import PlanCard from "./pricing/PlanCard";
import QuotaMeter from "./pricing/QuotaMeter";
import AddOnModal from "./pricing/AddOnModal";
import PaymentGateway from "./pricing/PaymentGateway";
import ContactSalesForm from "./pricing/ContactSalesForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "@/i18n/routing";
import type { CheckoutPlanId } from "@/lib/pricing.config";

type PlaceholderPlan = "enterprise" | "cnyPayChannel";

export interface PricingSectionProps {
  locale: string;
  scrollTo?: (id: string) => void;
  compact?: boolean;
  onRequireAuth?: () => void;
  payingPlan?: "pro" | "boost" | null;
  registerAddOnOpener?: (open: () => void) => void;
  /** Lets parent pages open Pro checkout (e.g. `?plan=pro`). */
  registerCheckoutOpener?: (open: (plan: "pro") => void) => void;
}

export default function PricingSection({
  locale,
  scrollTo,
  compact = false,
  onRequireAuth,
  payingPlan = null,
  registerAddOnOpener,
  registerCheckoutOpener,
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
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlanId | null>(null);
  const [placeholderPlan, setPlaceholderPlan] = useState<PlaceholderPlan | null>(null);

  const showAddOnEntry = canPurchaseAddOn({ usedQuota, quotaLimit });

  const handleAddOnOpen = useCallback(() => {
    if (!showAddOnEntry) return;
    setAddOnOpen(true);
  }, [showAddOnEntry]);

  const handleCheckoutOpen = useCallback((plan: "pro") => {
    setSelectedPlan(plan);
    setCheckoutPlan(plan);
  }, [setSelectedPlan]);

  useEffect(() => {
    registerAddOnOpener?.(handleAddOnOpen);
  }, [registerAddOnOpener, handleAddOnOpen]);

  useEffect(() => {
    registerCheckoutOpener?.(handleCheckoutOpen);
  }, [registerCheckoutOpener, handleCheckoutOpen]);

  function handleTrial() {
    setSelectedPlan("trial");
    if (scrollTo) scrollTo("upload");
    else router.push("/#upload");
  }

  function handleSubscribe(plan: "pro" | "trial") {
    if (plan === "trial") {
      handleTrial();
      return;
    }
    handleCheckoutOpen(plan);
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
            onCnyPayContact={() => setPlaceholderPlan("cnyPayChannel")}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          <div className="pricing-card pricing-card-v2 flex flex-col opacity-95">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-xl">{t("enterprise.name")}</h3>
              <span className="pricing-badge pricing-badge-boost text-xs">
                {t("comingSoonBadge")}
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-3 font-sans">{t("enterprise.audience")}</p>
            <p className="text-sm text-ink-light font-sans mb-4 flex-1">
              {t("enterprise.placeholderNote")}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPlaceholderPlan("enterprise")}
            >
              {t("enterprise.comingSoonCta")}
            </Button>
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
        onCnyPayContact={() => setPlaceholderPlan("cnyPayChannel")}
      />

      <Dialog open={!!checkoutPlan} onOpenChange={(open) => !open && setCheckoutPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{checkoutPlan ? t(`${checkoutPlan}.name`) : t("title")}</DialogTitle>
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
              onCnyPayContact={() => {
                setCheckoutPlan(null);
                setPlaceholderPlan("cnyPayChannel");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!placeholderPlan}
        onOpenChange={(open) => !open && setPlaceholderPlan(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {placeholderPlan === "cnyPayChannel"
                ? t("cnyPayChannelTitle")
                : placeholderPlan
                  ? t(`${placeholderPlan}.placeholderTitle`)
                  : ""}
            </DialogTitle>
          </DialogHeader>
          {placeholderPlan === "cnyPayChannel" && (
            <div className="space-y-4 font-sans text-sm text-ink-light">
              <p>{t("cnyPayChannelBody")}</p>
              <ContactSalesForm />
              <p className="text-xs text-ink-muted">
                <a
                  href="mailto:support@clausecheck.cc?subject=人民币支付通道"
                  className="text-accent hover:text-accent-dark"
                >
                  support@clausecheck.cc
                </a>
              </p>
              <Button variant="outline" onClick={() => setPlaceholderPlan(null)}>
                {t("placeholderClose")}
              </Button>
            </div>
          )}
          {placeholderPlan === "enterprise" && (
            <div className="space-y-4 font-sans text-sm text-ink-light">
              <p>{t("enterprise.placeholderBody")}</p>
              <ContactSalesForm />
              <p>
                <a
                  href="mailto:support@clausecheck.cc"
                  className="text-accent hover:text-accent-dark"
                >
                  support@clausecheck.cc
                </a>
              </p>
              <Button variant="outline" onClick={() => setPlaceholderPlan(null)}>
                {t("placeholderClose")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
