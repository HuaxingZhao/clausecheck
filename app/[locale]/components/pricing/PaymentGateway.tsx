"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";
import { canPurchaseAddOn, usePricingStore } from "@/stores/usePricingStore";
import { Button } from "@/components/ui/button";
import type { BillingCycle, Currency, PaidPlanId, PurchaseType } from "@/lib/pricing.config";

export interface PaymentGatewayProps {
  purchaseType: PurchaseType;
  currency: Currency;
  billingCycle: BillingCycle;
  locale: string;
  plan?: PaidPlanId;
  packs?: number;
  onSuccess?: () => void;
  onRequireAuth?: () => void;
  onCancel?: () => void;
}

interface IntentResponse {
  clientSecret?: string;
  error?: string;
  paymentMethodTypes?: string[];
}

function PaymentForm({
  purchaseType,
  currency,
  billingCycle,
  locale,
  plan,
  packs,
  onSuccess,
  onCancel,
}: Omit<PaymentGatewayProps, "onRequireAuth">) {
  const t = useTranslations("pricing.payment");
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const usedQuota = usePricingStore((s) => s.usedQuota);
  const quotaLimit = usePricingStore((s) => s.quotaLimit);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (purchaseType === "addon" && !canPurchaseAddOn({ usedQuota, quotaLimit })) {
      setErrorKey("quotaNotExhausted");
      return;
    }

    setSubmitting(true);
    setErrorKey(null);

    const returnUrl = `${window.location.origin}/${locale}/account?checkout=success`;

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    setSubmitting(false);

    if (error) {
      const code = error.decline_code || error.code || "generic";
      if (code.includes("insufficient")) setErrorKey("insufficientFunds");
      else if (code.includes("expired")) setErrorKey("qrExpired");
      else if (error.type === "card_error") setErrorKey("declined");
      else setErrorKey("generic");
      return;
    }

    onSuccess?.();
  }

  const errorMessage = errorKey ? t(`errors.${errorKey}`) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans">
      <div className="w-full [&_.p-PaymentElement]:w-full">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      </div>
      {errorMessage && (
        <p className="text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
      <p className="text-xs text-ink-muted leading-relaxed">{t("disclaimer")}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={!stripe || submitting} className="flex-1">
          {submitting ? t("processing") : t("payNow")}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

export default function PaymentGateway(props: PaymentGatewayProps) {
  const t = useTranslations("pricing.payment");
  const { purchaseType, currency, billingCycle, plan, packs, onRequireAuth } = props;
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    async function createIntent() {
      setLoading(true);
      setFetchError(null);
      try {
        const body =
          purchaseType === "addon"
            ? { purchaseType, currency, packs: packs ?? 1 }
            : {
                purchaseType,
                plan,
                billingCycle,
                currency,
              };

        const res = await fetch("/api/stripe/create-intent", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = (await res.json()) as IntentResponse;

        if (res.status === 401) {
          onRequireAuth?.();
          return;
        }
        if (!res.ok || !data.clientSecret) {
          throw new Error(data.error || "Failed to initialize payment");
        }
        if (!cancelled) setClientSecret(data.clientSecret);
      } catch (err) {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : "Error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void createIntent();
    return () => {
      cancelled = true;
    };
  }, [
    purchaseType,
    currency,
    billingCycle,
    plan,
    packs,
    onRequireAuth,
  ]);

  const stripePromise = useMemo(() => getStripe(), []);

  if (loading) {
    return <p className="text-sm text-ink-muted font-sans">{t("loading")}</p>;
  }

  if (fetchError || !clientSecret) {
    return (
      <p className="text-sm text-red-700 font-sans" role="alert">
        {fetchError ?? t("errors.generic")}
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        locale: props.locale === "zh" ? "zh" : "en",
        appearance: { theme: "stripe", variables: { colorPrimary: "#1A365D" } },
      }}
    >
      <PaymentForm {...props} />
    </Elements>
  );
}
