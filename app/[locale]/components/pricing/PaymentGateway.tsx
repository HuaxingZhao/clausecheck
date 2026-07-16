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
import {
  addOnTotalPrice,
  prepaidBilledTotal,
  type BillingCycle,
  type Currency,
  type CheckoutPlanId,
  type PurchaseType,
} from "@/lib/pricing.config";
import { formatMoney } from "@/lib/pricing/currency";
import { localizedPath } from "@/i18n/routing";

export interface PaymentGatewayProps {
  purchaseType: PurchaseType;
  currency: Currency;
  billingCycle: BillingCycle;
  locale: string;
  plan?: CheckoutPlanId;
  packs?: number;
  onSuccess?: () => void;
  onRequireAuth?: () => void;
  onCancel?: () => void;
  /** @deprecated CNY Stripe Element shows prepaid note; consult CTA unused here. */
  onCnyPayContact?: () => void;
}

interface IntentResponse {
  clientSecret?: string;
  error?: string;
  paymentMethodTypes?: string[];
  amount?: number;
  currency?: Currency;
  billingCycle?: BillingCycle;
  prepaid?: boolean;
}

function computeDisplayAmount(
  purchaseType: PurchaseType,
  currency: Currency,
  billingCycle: BillingCycle,
  plan?: CheckoutPlanId,
  packs?: number
): number {
  if (purchaseType === "addon") {
    return addOnTotalPrice(packs ?? 1, currency);
  }
  return prepaidBilledTotal(plan ?? "pro", currency, billingCycle);
}

function CheckoutSummary({
  purchaseType,
  currency,
  billingCycle,
  locale,
  plan,
  packs,
  amount,
  prepaid,
}: {
  purchaseType: PurchaseType;
  currency: Currency;
  billingCycle: BillingCycle;
  locale: string;
  plan?: CheckoutPlanId;
  packs?: number;
  amount: number;
  prepaid: boolean;
}) {
  const t = useTranslations("pricing.payment");
  const tPricing = useTranslations("pricing");
  const fmtLocale = locale === "zh" ? "zh-CN" : "en-US";
  const amountLabel = formatMoney(amount, currency, fmtLocale);
  const planName =
    purchaseType === "addon"
      ? tPricing("addOn.name")
      : tPricing(`${plan ?? "pro"}.name`);
  const cycleName = purchaseType === "addon" ? null : tPricing(billingCycle);

  return (
    <div className="rounded-xl border border-ink/10 bg-paper-dark/40 px-4 py-3 space-y-2 font-sans">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide">
          {t("orderSummary")}
        </p>
        <p className="text-xs text-ink-muted max-w-[55%] text-right leading-snug">
          {t("summaryHint")}
        </p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-ink">
            <span className="text-ink-muted">{t("planLabel")}: </span>
            {planName}
          </p>
          {cycleName && (
            <p className="text-sm text-ink mt-0.5">
              <span className="text-ink-muted">{t("cycleLabel")}: </span>
              {cycleName}
              <span className="text-ink-muted">
                {" · "}
                {prepaid ? t("billingModePrepaid") : t("billingModeSubscription")}
              </span>
            </p>
          )}
          {purchaseType === "addon" && (
            <p className="text-sm text-ink mt-0.5">
              <span className="text-ink-muted">{t("packsLabel")}: </span>
              {packs ?? 1}
              <span className="text-ink-muted"> · {t("addonNote")}</span>
            </p>
          )}
          <p className="text-sm text-ink mt-0.5">
            <span className="text-ink-muted">{t("currencyLabel")}: </span>
            {currency}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-ink-muted">{t("dueNow")}</p>
          <p className="text-2xl font-semibold text-ink tabular-nums">{amountLabel}</p>
        </div>
      </div>
    </div>
  );
}

function PaymentFormSkeleton() {
  const t = useTranslations("pricing.payment");
  return (
    <div className="space-y-3 font-sans" aria-busy="true" aria-live="polite">
      <p className="text-xs text-ink-muted">{t("loading")}</p>
      <div className="h-11 rounded-lg bg-ink/5 animate-pulse" />
      <div className="h-11 rounded-lg bg-ink/5 animate-pulse" />
      <div className="h-24 rounded-lg bg-ink/5 animate-pulse" />
    </div>
  );
}

function PaymentForm({
  purchaseType,
  currency,
  billingCycle,
  locale,
  plan,
  packs,
  amount,
  prepaid,
  onSuccess,
  onCancel,
}: Omit<PaymentGatewayProps, "onRequireAuth"> & {
  amount: number;
  prepaid: boolean;
}) {
  const t = useTranslations("pricing.payment");
  const tPricing = useTranslations("pricing");
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const usedQuota = usePricingStore((s) => s.usedQuota);
  const quotaLimit = usePricingStore((s) => s.quotaLimit);
  const showCnyPrepaidNote =
    currency === "CNY" && purchaseType === "subscription";
  const amountLabel = formatMoney(
    amount,
    currency,
    locale === "zh" ? "zh-CN" : "en-US"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (purchaseType === "addon" && !canPurchaseAddOn({ usedQuota, quotaLimit })) {
      setErrorKey("quotaNotExhausted");
      return;
    }

    setSubmitting(true);
    setErrorKey(null);

    const returnUrl = `${window.location.origin}${localizedPath("/account?checkout=success", locale)}`;

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
      {showCnyPrepaidNote && (
        <p className="text-xs text-amber-800 leading-relaxed text-center font-sans">
          {t("cnyPrepaidDisclaimer")}
        </p>
      )}
      {currency === "CNY" && !showCnyPrepaidNote && (
        <p className="text-xs text-ink-muted leading-relaxed text-center font-sans">
          {tPricing("cnyWalletNote")}
        </p>
      )}
      {errorMessage && (
        <p className="text-sm text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
      <p className="text-xs text-ink-muted leading-relaxed text-center">
        {t("disclaimer")}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-md mx-auto w-full">
        <Button type="submit" disabled={!stripe || submitting} className="flex-1">
          {submitting ? t("processing") : t("payNowAmount", { amount: amountLabel })}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="sm:flex-none">
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}

export default function PaymentGateway(props: PaymentGatewayProps) {
  const t = useTranslations("pricing.payment");
  const { purchaseType, currency, billingCycle, plan, packs, onRequireAuth, onCancel } =
    props;

  const displayAmount = useMemo(
    () => computeDisplayAmount(purchaseType, currency, billingCycle, plan, packs),
    [purchaseType, currency, billingCycle, plan, packs]
  );
  const displayPrepaid =
    purchaseType === "addon" ||
    (purchaseType === "subscription" && currency === "CNY");

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(displayAmount);
  const [prepaid, setPrepaid] = useState(displayPrepaid);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Warm Stripe.js as soon as the gateway mounts (parallel with intent fetch).
  const stripePromise = useMemo(() => getStripe(), []);

  useEffect(() => {
    setAmount(displayAmount);
    setPrepaid(displayPrepaid);
  }, [displayAmount, displayPrepaid]);

  useEffect(() => {
    let cancelled = false;

    async function createIntent() {
      setLoading(true);
      setFetchError(null);
      setClientSecret(null);
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

        const endpoint =
          purchaseType === "subscription"
            ? "/api/create-subscription"
            : "/api/stripe/create-intent";

        const res = await fetch(endpoint, {
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
        if (!cancelled) {
          setClientSecret(data.clientSecret);
          if (typeof data.amount === "number" && Number.isFinite(data.amount)) {
            setAmount(data.amount);
          }
          if (typeof data.prepaid === "boolean") {
            setPrepaid(data.prepaid);
          }
        }
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
  }, [purchaseType, currency, billingCycle, plan, packs, onRequireAuth]);

  return (
    <div className="space-y-4">
      <CheckoutSummary
        purchaseType={purchaseType}
        currency={currency}
        billingCycle={billingCycle}
        locale={props.locale}
        plan={plan}
        packs={packs}
        amount={amount}
        prepaid={prepaid}
      />

      {fetchError && !clientSecret && (
        <p className="text-sm text-red-700 font-sans" role="alert">
          {fetchError}
        </p>
      )}

      {loading && !clientSecret && <PaymentFormSkeleton />}

      {clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            locale: props.locale === "zh" ? "zh" : "en",
            appearance: { theme: "stripe", variables: { colorPrimary: "#1A365D" } },
          }}
        >
          <PaymentForm
            {...props}
            amount={amount}
            prepaid={prepaid}
          />
        </Elements>
      )}

      {!loading && !clientSecret && !fetchError && onCancel && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
